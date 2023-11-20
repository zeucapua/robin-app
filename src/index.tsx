// imports 
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { getCookie, setCookie } from "hono/cookie";
import { OAuthRequestError } from '@lucia-auth/oauth';

import * as schema from "./schema";
import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";

import { pool, auth, github_auth } from './lucia';
import { LogRow, ProjectCreator, Puncher, SiteLayout } from './components';
import "dotenv/config";

// init
const app = new Hono();

const db = drizzle(pool, { schema });

// ------------------------------------------ 


// page routes

app.get("/", async (c) => {
  const auth_request = auth.handleRequest(c);
  const session = await auth_request.validate();

  const user = session?.user;
  let projects = undefined;
  projects = user && await db.query.projects.findMany({
    where: eq(schema.projects.userId, user.userId),
    with: {
      logs: {
        orderBy: desc(schema.logs.start),
        limit: 1
      }
    }
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
          { 
            <table class="overflow-hidden w-full table table-auto border-separate border border-slate-500 rounded-xl p-0">
              <thead class="table-header-group">
                <tr class="table-row text-start border-b-2 border-slate-500">
                  <th class="table-cell p-4">Duration</th>
                  <th class="table-cell p-4">Project</th>
                  <th class="table-cell p-4">Start Time</th>
                  <th class="hidden lg:block table-cell p-4">End Time</th>
                  <th class="table-cell p-4">Actions</th>
                </tr>
              </thead>

              <tbody
                id="logs-table"
                hx-patch="/updateLogs"
                hx-trigger="load"
                hx-target="#logs-table" 
                hx-swap="outerHTML"
                class="table-row-group"
              >
                <svg class="htmx-indicator" viewbox="0 0 32 32" width="32" height="32" stroke="currentColor" fill="currentColor"><path d="M19 3c0 1.7-1.3 3-3 3s-3-1.3-3-3 1.3-3 3-3 3 1.3 3 3z m0 26c0 1.7-1.3 3-3 3s-3-1.3-3-3 1.3-3 3-3 3 1.3 3 3zM0 16c0-1.7 1.3-3 3-3s3 1.3 3 3-1.3 3-3 3-3-1.3-3-3z m32 0c0 1.7-1.3 3-3 3s-3-1.3-3-3 1.3-3 3-3 3 1.3 3 3zM4.7 27.3c-1.2-1.2-1.2-3.1 0-4.2 1.2-1.2 3.1-1.2 4.2 0 1.2 1.2 1.2 3.1 0 4.2-1.2 1.2-3.1 1.2-4.2 0z m4.2-18.4c-1.2 1.2-3.1 1.2-4.2 0-1.2-1.2-1.2-3.1 0-4.2 1.2-1.2 3.1-1.2 4.2 0 1.2 1.2 1.2 3.1 0 4.2z m14.2 14.2c1.2-1.2 3.1-1.2 4.2 0 1.2 1.2 1.2 3.1 0 4.2-1.2 1.2-3.1 1.2-4.2 0-1.2-1.2-1.2-3.1 0-4.2z"  /><title>Spinner</title></svg>
              </tbody>
            </table>
          }
          </>
        )}
      </main>
    </SiteLayout>
  );
});



// ------------------------------------------ 


// HTMX CRUD

app.post("/createProject", async (c) => {
  // make sure we're authed
  const auth_request = auth.handleRequest(c);
  const session = await auth_request.validate();
  if (!session) { return c.body("Not authed", { status: 401 }); }

  const user = session.user;
  const data = await c.req.parseBody(); 
  const project_name = data.new_project as string;

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

    c.header("HX-Trigger", "updateLogs");
    return c.html(
      <Puncher project={project} action='end' />
    );
  }
  else {
    await db
      .update(schema.logs)
      .set({ end: new Date })
      .where(eq(schema.logs.id, project.logs[0].id));

    c.header("HX-Trigger", "updateLogs");
    return c.html(
      <Puncher project={project} action='start' />
    );
  }
});

app.delete("/deleteProject/:id", async (c) => {
  const project_id = c.req.param("id") as string;

  await db
    .delete(schema.projects)
    .where(
      eq(schema.projects.id, Number.parseInt(project_id))
    );
  
  c.header("HX-Trigger", "updateLogs");
  return c.html(<div />);
});

app.patch("/updateLogs", async (c) => {
  const logs = await db.query.logs.findMany({
    orderBy: desc(schema.logs.start)
  });

  return c.html(
    <tbody
      id="logs-table"
      hx-patch="/updateLogs"
      hx-trigger="updateLogs from:body"
      hx-target="#logs-table" 
      hx-swap="outerHTML"
      class="table-row-group"
    >
      {
        logs.map((l) => <LogRow log={l} editing={false} />)
      }
    </tbody>
  );
});

app.patch("/editLog/:id", async (c) => {
  const log_id = c.req.param("id") as string;

  const log = await db.query.logs.findFirst({
    where: eq(schema.logs.id, Number.parseInt(log_id)),
    orderBy: desc(schema.logs.start)
  });

  if (!log) { return c.status(500); }

  console.log("/editLog", { log });

  return c.html(<LogRow log={log} editing={true} />);
});

app.patch("/confirmLogEdit/:id", async (c) => {
  const log_id = c.req.param("id") as string;
  const data = await c.req.parseBody();

  const start = data[`start_${log_id}`];
  const end = data[`end_${log_id}`];

  const log = await db.update(schema.logs).set({
    start: new Date(start.toString()),
    end: new Date(end.toString())
  }).where( eq(schema.logs.id, Number.parseInt(log_id)) ).returning();

  return c.html(<LogRow log={log[0]} editing={false} />);
});

app.delete("/deleteLog/:id", async (c) => {
  const log_id = c.req.param("id") as string;

  await db
    .delete(schema.logs)
    .where( 
      eq(schema.logs.id, Number.parseInt(log_id)) 
    );

  return c.html(<div />);
});

// ------------------------------------------ 

// API endpoints

// TODO: implement OAuth?
// TODO: CRUD endpoints (projects, logs)


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
    headers: { Location: "/" }
  });
});


// ------------------------------------------ 


const PORT = Number(process.env.PORT) || 3000;

export default app;

serve({
  fetch: app.fetch,
  port: PORT
});
