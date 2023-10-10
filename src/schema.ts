import { relations } from "drizzle-orm";
import { serial, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).unique(),
});

export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  start: timestamp("start").defaultNow(),
  end: timestamp("end"),
  projectName: varchar("project_name").notNull()
});

export const projectsRelations = relations(projects, ({ many }) => ({
  sessions: many(sessions)
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  project: one(projects, { fields: [sessions.projectName], references: [projects.name] })
}));
