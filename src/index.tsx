// imports 
import { Hono } from 'hono';
import { serve } from '@hono/node-server';

import { Pool } from "pg";
import * as schema from "./schema";
import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";

import * as dotenv from "dotenv";
import { Project, Session, SiteLayout } from './components';
dotenv.config();

// init
const app = new Hono();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});
const db = drizzle(pool, { schema });

// page routes
app.get("/", async (c, next) => {
  const projects = await db.query.projects.findMany({
    with: { sessions: true }
  });

  await next();

  return c.html(
    <SiteLayout>
    { projects.map((p) => {
      return (
        <>
          <Project id={p.id} name={p.name} sessions={p.sessions} />
        </>
      )
    })}
    </SiteLayout>
  );
});

// project routes
// get all Projects with connected Sessions
app.get("/api/projects", async (c) => {
  const projects = await db.query.projects.findMany({
    with: { sessions: true }
  });

  return c.json({
    message: "success",
    projects
  });
});

// get specific Project with connected Sessions via 'name'
app.get("/api/project/:name", async (c) => {
  const name = c.req.param("name") as string;
  const result = await db.query.projects.findFirst({
    where: eq(schema.projects.name, name),
    with: {
      sessions: true
    }
  });

  return c.json({ result });
});

// create a new Project with 'name'
app.post("/api/project/:name", async (c) => {
  // get param from path
  const name = c.req.param("name") as string;

  // create a new project in database
  await db.insert(schema.projects).values({ name });

  return c.text(`Robin: Created new project ${name}`);
});


// session routes
app.get("/api/session/:name", async (c) => {
  const name = c.req.param("name") as string;

  const result = await db.query.sessions.findMany({
    where: eq(schema.sessions.projectName, name)
  });

  console.info("/api/session/:name", { result });

  return c.json({ result });
});


app.post("/api/session/:name", async (c) => {
  const name = c.req.param("name") as string;

  // get latest session
  const result = await db.query.sessions.findMany({
    where: eq(schema.sessions.projectName, name),
    orderBy: [desc(schema.sessions.start)],
    limit: 1
  });
  const latest = result[0];


  // if no session OR latest has an end time, then create a new session
  if (!latest || latest.end !== null) {
    await db.insert(schema.sessions).values({
      projectName: name
    });
    
    return c.json({
      message: `Started new session for ${name} [${Date.now()}]`,
    });
  }
  else {
    // add an end time if session already exists
    const updated = await db.update(schema.sessions)
      .set({ end: new Date() })
      .where( eq(schema.sessions.id, latest.id) )
      .returning({ updatedId: schema.sessions.id });

    return c.json({
      message: `Ended session for ${name} [${Date.now()}]`,
      updated
    });
  }

});


app.post("/htmx/session/:name", async (c) => {
  const name = c.req.param("name") as string;

  // get latest session
  const result = await db.query.sessions.findMany({
    where: eq(schema.sessions.projectName, name),
    orderBy: [desc(schema.sessions.start)],
    limit: 1
  });
  const latest = result[0];


  // if no session OR latest has an end time, then create a new session
  if (!latest || latest.end !== null) {
    await db.insert(schema.sessions).values({
      projectName: name
    });
    
    return c.html(
      <p>Started</p>
    );
  }
  else {
    // add an end time if session already exists
    const updated = await db.update(schema.sessions)
      .set({ end: new Date() })
      .where( eq(schema.sessions.id, latest.id) )
      .returning({ updatedId: schema.sessions.id });

    console.log({ updated });
    return c.html(
      <p>Ended</p>
    );
  }
});

const PORT = Number(process.env.PORT) || 3000;

export default app;

serve({
  fetch: app.fetch,
  port: PORT
});
