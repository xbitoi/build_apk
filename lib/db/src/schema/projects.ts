import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const projectsTable = sqliteTable("projects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  sourceType: text("source_type", { enum: ["github", "zip", "local"] }).notNull().default("github"),
  sourceUrl: text("source_url"),
  packageId: text("package_id").notNull().default("com.example.app"),
  appName: text("app_name").notNull().default("My App"),
  versionName: text("version_name").notNull().default("1.0.0"),
  versionCode: integer("version_code").notNull().default(1),
  status: text("status", { enum: ["pending", "building", "success", "failed", "cancelled"] }).notNull().default("pending"),
  framework: text("framework"),
  buildTool: text("build_tool"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

export type Project = typeof projectsTable.$inferSelect;
export type InsertProject = typeof projectsTable.$inferInsert;
