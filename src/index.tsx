// imports 
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { getCookie, setCookie } from "hono/cookie";
import { OAuthRequestError } from '@lucia-auth/oauth';

import * as schema from "./schema";
import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";

import { pool, auth, github_auth } from './lucia';
import { ProjectCreator, Puncher, SiteLayout } from './components';
import "dotenv/config";
import { getDuration } from './utils';

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

  let logs = undefined;
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
            <table class="overflow-hidden w-full table table-auto border-separate border border-slate-500 rounded-xl p-0">
              <thead class="table-header-group">
                <tr class="table-row text-start border-b-2 border-slate-500">
                  <th class="table-cell p-4">Duration</th>
                  <th class="table-cell p-4">Project</th>
                  <th class="table-cell p-4">Start Time</th>
                  <th class="table-cell p-4">End Time</th>
                  <th class="table-cell p-4">Actions</th>
                </tr>
              </thead>

              <tbody
                id="logs-table"
                hx-patch="/updateLogs"
                hx-trigger="leslie from:body"
                hx-target="#logs-table" 
                hx-swap="outerHTML"
                class="table-row-group"
              >
                { 
                  logs.map((l) => {
                    return (
                      <tr id={`log_${l.id}`} class="text-center table-row">
                        <td class="table-cell">{getDuration(l)}</td>
                        <td class="table-cell">{l.projectId}</td>
                        <td class="table-cell">{l.start?.toLocaleString()}</td>
                        <td class="table-cell">{l.end?.toLocaleString()}</td>
                        <td class="table-cell flex items-center gap-2">
                          <button
                            type="button"
                            hx-trigger="click"
                            hx-confirm="Are you sure?"
                            hx-delete={`/deleteLog/${l.id}`}
                            hx-target={`#log_${l.id}`}
                            hx-swap="delete"
                            class="flex gap-2 text-red-500"
                          >
                            <div class="w-8 h-8">
                              <svg viewbox="0 0 32 32" width="16" height="16" stroke="currentColor" fill="currentColor"><path d="M4 8L6.7 8 28 8" _id="63ce595bda5b7d1fa85644ef" _parent="63ce595bda5b7d1fa85644ee" fill="none" stroke-width="2.65625" stroke-linejoin="round" stroke-linecap="round" /><path d="M25.3 8v18.7a2.7 2.7 0 0 1-2.6 2.6H9.3a2.7 2.7 0 0 1-2.6-2.6V8m4 0V5.3a2.7 2.7 0 0 1 2.6-2.6h5.4a2.7 2.7 0 0 1 2.6 2.6v2.7" _id="63ce595bda5b7d1fa85644f0" _parent="63ce595bda5b7d1fa85644ee" fill="none" stroke-width="2.65625" stroke-linejoin="round" stroke-linecap="round" /><path d="M13.3 14.7L13.3 22.7" _id="63ce595bda5b7d1fa85644f1" _parent="63ce595bda5b7d1fa85644ee" fill="none" stroke-width="2.65625" stroke-linejoin="round" stroke-linecap="round" /><path d="M18.7 14.7L18.7 22.7" _id="63ce595bda5b7d1fa85644f2" _parent="63ce595bda5b7d1fa85644ee" fill="none" stroke-width="2.65625" stroke-linejoin="round" stroke-linecap="round" /><title>Trash</title></svg>
                            </div>
                            <div class="htmx-indicator w-8 h-8 animate-spin">
                              <svg viewbox="0 0 32 32" width="32" height="32" stroke="currentColor" fill="currentColor"><path d="M11.1 9.6a1 1 0 0 1 0 1.4 1 1 0 0 1-1.5 0L6.8 8.2a1 1 0 0 1 1.4-1.4Zm-1.5 11.3l-2.8 2.9a1 1 0 0 0 0 1.4 1 1 0 0 0 0.7 0.3 1 1 0 0 0 0.7-0.3l2.9-2.8a1 1 0 0 0-1.5-1.5ZM9 16a1 1 0 0 0-1-1H4a1 1 0 0 0 0 2h4a1 1 0 0 0 1-1Zm7-13a1 1 0 0 0-1 1v4a1 1 0 0 0 2 0V4a1 1 0 0 0-1-1Zm12 12h-4a1 1 0 0 0 0 2h4a1 1 0 0 0 0-2Zm-5.6 6a1 1 0 0 0-1.5 1.4l2.9 2.8a1 1 0 0 0 0.7 0.3 1 1 0 0 0 0.7-0.3 1 1 0 0 0 0-1.4ZM16 23a1 1 0 0 0-1 1v4a1 1 0 0 0 2 0v-4a1 1 0 0 0-1-1Z"  /><title>Spinner</title></svg>
                            </div>
                          </button>
                        </td>
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


// HTMX CRUD

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

    c.header("HX-Trigger", "leslie");
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
      hx-trigger="leslie from:body"
      hx-target="#logs-table" 
      hx-swap="outerHTML"
      class="table-row-group"
    >
      {
        logs.map((l) => {
          return (
            <tr id={`log_${l.id}`} class="text-center table-row">
              <td class="table-cell">{getDuration(l)}</td>
              <td class="table-cell">{l.projectId}</td>
              <td class="table-cell">{l.start?.toLocaleString()}</td>
              <td class="table-cell">{l.end?.toLocaleString()}</td>
              <td class="table-cell flex items-center gap-2">
                <button
                  type="button"
                  hx-trigger="click"
                  hx-confirm="Are you sure?"
                  hx-delete={`/deleteLog/${l.id}`}
                  hx-target={`#log_${l.id}`}
                  hx-swap="delete"
                  class="flex gap-2 items-center text-red-500"
                >
                  <div class="w-8 h-8 text-red-500">
                    <svg viewbox="0 0 32 32" width="16" height="16" stroke="currentColor" fill="currentColor"><path d="M4 8L6.7 8 28 8" _id="63ce595bda5b7d1fa85644ef" _parent="63ce595bda5b7d1fa85644ee" fill="none" stroke-width="2.65625" stroke-linejoin="round" stroke-linecap="round" /><path d="M25.3 8v18.7a2.7 2.7 0 0 1-2.6 2.6H9.3a2.7 2.7 0 0 1-2.6-2.6V8m4 0V5.3a2.7 2.7 0 0 1 2.6-2.6h5.4a2.7 2.7 0 0 1 2.6 2.6v2.7" _id="63ce595bda5b7d1fa85644f0" _parent="63ce595bda5b7d1fa85644ee" fill="none" stroke-width="2.65625" stroke-linejoin="round" stroke-linecap="round" /><path d="M13.3 14.7L13.3 22.7" _id="63ce595bda5b7d1fa85644f1" _parent="63ce595bda5b7d1fa85644ee" fill="none" stroke-width="2.65625" stroke-linejoin="round" stroke-linecap="round" /><path d="M18.7 14.7L18.7 22.7" _id="63ce595bda5b7d1fa85644f2" _parent="63ce595bda5b7d1fa85644ee" fill="none" stroke-width="2.65625" stroke-linejoin="round" stroke-linecap="round" /><title>Trash</title></svg>
                  </div>
                  <div class="htmx-indicator w-8 h-8 animate-spin">
                    <svg viewbox="0 0 32 32" width="32" height="32" stroke="currentColor" fill="currentColor"><path d="M11.1 9.6a1 1 0 0 1 0 1.4 1 1 0 0 1-1.5 0L6.8 8.2a1 1 0 0 1 1.4-1.4Zm-1.5 11.3l-2.8 2.9a1 1 0 0 0 0 1.4 1 1 0 0 0 0.7 0.3 1 1 0 0 0 0.7-0.3l2.9-2.8a1 1 0 0 0-1.5-1.5ZM9 16a1 1 0 0 0-1-1H4a1 1 0 0 0 0 2h4a1 1 0 0 0 1-1Zm7-13a1 1 0 0 0-1 1v4a1 1 0 0 0 2 0V4a1 1 0 0 0-1-1Zm12 12h-4a1 1 0 0 0 0 2h4a1 1 0 0 0 0-2Zm-5.6 6a1 1 0 0 0-1.5 1.4l2.9 2.8a1 1 0 0 0 0.7 0.3 1 1 0 0 0 0.7-0.3 1 1 0 0 0 0-1.4ZM16 23a1 1 0 0 0-1 1v4a1 1 0 0 0 2 0v-4a1 1 0 0 0-1-1Z"  /><title>Spinner</title></svg>
                  </div>
                </button>
              </td>
            </tr>
          )
        })
      }
    </tbody>
  );
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
