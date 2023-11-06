// imports 
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { getCookie, setCookie } from "hono/cookie";
import { OAuthRequestError } from '@lucia-auth/oauth';

import * as schema from "./schema";
import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";

import { pool, auth, github_auth } from './lucia';
import { LogTable, ProjectCreator, Puncher, SiteLayout } from './components';
import "dotenv/config";

// init
const app = new Hono();

// exported for lucia to use
const db = drizzle(pool, { schema });

// ------------------------------------------ 


// page routes

app.get("/", async (c) => {
  const auth_request = auth.handleRequest(c);
  const session = await auth_request.validate();

  const user = session?.user;
  let projects;
  projects = user && await db.query.projects.findMany({
    where: eq(schema.projects.userId, user.userId),
    with: {
      logs: {
        orderBy: desc(schema.logs.start),
        limit: 1
      }
    }
  }); 

  let logs;
  logs = user && await db.query.logs.findMany({
    orderBy: desc(schema.logs.start)
  });

  return c.html(
    <SiteLayout>
      <nav class="flex w-full p-4 justify-between">
        <h3 class="font-bold text-xl">Robin</h3>
        {
          user ?
          <div class="flex gap-4">
            <p>{user.name}</p>
            <a href="/logout">Logout</a>
          </div>
          : <a href="/auth">Login with Github</a>
        }
      </nav>
      <main class="flex flex-col w-full h-full gap-8 items-center justify-center">
        { (user && projects) && (
          <>
          <ProjectCreator />
          <h2>Punchers</h2>
          <div id="punchers" class="grid grid-cols-1 lg:grid-cols-3 gap-4">
          { 
            projects.map((p) => {
              if (p.logs.length === 0 || p.logs[0].end) {
                return <Puncher project={p} action='start' />
              }
              else {
                return <Puncher project={p} action='end' />
              }
            })
          }
          </div>

          <h3>Your Log Table</h3>
          { logs && (
            <table class="text-start table-auto p-2">
              <thead>
                <tr>
                  <th>Duration</th>
                  <th>Project</th>
                  <th>Start Time</th>
                  <th>End Time</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody
                id="logs-table"
                hx-get="/updateLogs"
                hx-trigger="leslie from:body"
                hx-target="this" 
                hx-swap="outerHTML"
              >
                { 
                  logs.map((l) => {
                    return (
                      <tr>
                        <td>n/a</td>
                        <td>{l.projectId}</td>
                        <td>{l.start?.toLocaleString()}</td>
                        <td>{l.end?.toLocaleString()}</td>
                        <td>n/a</td>
                      </tr>
                    )
                  })
                }
              </tbody>
            </table>
          )}
          </>
        )}
      </main>
    </SiteLayout>
  );
});


// ------------------------------------------ 


// CRUD

app.post("/createProject", async (c) => {
  // make sure we're authed
  const auth_request = auth.handleRequest(c);
  const session = await auth_request.validate();
  if (!session) { return c.body("Not authed", { status: 401 }); }

  const user = session.user;
  const data = await c.req.parseBody(); 
  const project_name = data.new_project as string;

  console.log("created", {project_name});

  const created_project = await db.insert(schema.projects)
    .values({ name: project_name, userId: user.userId })
    .returning();

  return c.html(
    <Puncher project={created_project[0]} action='start' />
  );
});

app.patch("/punch/:id", async (c) => {
  const project_id = c.req.param("id") as string;

  const project = await db.query.projects.findFirst({
    where: eq(schema.projects.id, Number.parseInt(project_id)),
    with: {
      logs: {
        limit: 1,
        orderBy: desc(schema.logs.start)
      }
    }
  });

  if (!project) {
    return c.body(null, { status: 500 });
  }


  if (project?.logs.length === 0 || project?.logs[0].end) {
    // create a new log
    await db
      .insert(schema.logs)
      .values({ projectId: Number.parseInt(project_id) });

    c.header("HX-Trigger", "leslie");
    return c.html(
      <Puncher project={project} action='end' />
    );
  }
  else {
    await db
      .update(schema.logs)
      .set({ end: new Date })
      .where(eq(schema.logs.id, project.logs[0].id));

    return c.html(
      <Puncher project={project} action='start' />
    )
  }
});

app.delete("/deleteProject/:id", async (c) => {
  const project_id = c.req.param("id") as string;

  await db
    .delete(schema.projects)
    .where(
      eq(schema.projects.id, Number.parseInt(project_id))
    );
  
  return c.html(<div />);
});

app.patch("/updateLogs", async (c) => {
  console.log("/updateLogs");
  const logs = await db.query.logs.findMany({
    orderBy: desc(schema.logs.start)
  });

  return c.html(
    <tbody
      id="logs-table"
      hx-get="/updateLogs"
      hx-trigger="click updateLogs from:body"
      hx-target="this"
      hx-swap="outerHTML"
    >
    {
      logs.map((l) => {
        <tr>
          <td>n/a</td>
          <td>{l.projectId}</td>
          <td>{l.start?.toLocaleString()}</td>
          <td>{l.end?.toLocaleString()}</td>
          <td>n/a</td>
        </tr>
      })
    }
    </tbody>
  );
});


// ------------------------------------------ 


// authentication

app.get("/auth", async (c) => {
  const [url, state] = await github_auth.getAuthorizationUrl();
  setCookie(c, "github_oauth_state", state, {
    path: "/",
    httpOnly: true,
    maxAge: 60 * 60 * 1000,
    secure: process.env.NODE_ENV === "production"
  });

  c.status(302);
  c.header("Location", url.toString());
  return c.body(null);
});

app.get("/auth/callback", async (c) => {
	const storedState = getCookie(c, "github_oauth_state");
	const state = c.req.query("state");
	const code = c.req.query("code");

	// validate state
	if (
		!storedState ||
		!state ||
		storedState !== state ||
		typeof code !== "string"
	) {
		return c.status(400);
	}
	try {
		const { getExistingUser, githubUser, createUser } =
			await github_auth.validateCallback(code);

		const getUser = async () => {
			const existingUser = await getExistingUser();
			if (existingUser) return existingUser;
			const user = await createUser({
				attributes: {
					name: githubUser.login
				}
			});
			return user;
		};

		const user = await getUser();
		const session = await auth.createSession({
			userId: user.userId,
			attributes: {}
		});
		const authRequest = auth.handleRequest(c);
		authRequest.setSession(session);

    c.status(302);
    c.header("Location", "/");
    return c.body(null);
	} catch (e) {
		if (e instanceof OAuthRequestError) {
			// invalid code
      return c.body(null, { status: 400 });
		}
    return c.body(null, { status: 500 });
	}
});

app.get("/logout", async (c) => {
  const auth_request = auth.handleRequest(c);
  const session = await auth_request.validate();
  if (!session) {
    return c.body(null, { status: 401 });
  }

  await auth.invalidateSession(session.sessionId);
  auth_request.setSession(null);
  return c.body(null, {
    status: 302,
    headers: { "Location": "/" }
  });
});


// ------------------------------------------ 


const PORT = Number(process.env.PORT) || 3000;

export default app;

serve({
  fetch: app.fetch,
  port: PORT
});
