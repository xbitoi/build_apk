import { sqliteTable, integer, text, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { projectsTable } from "./projects";

export const buildsTable = sqliteTable("builds", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  buildType: text("build_type", { enum: ["debug", "release"] }).notNull().default("debug"),
  outputFormat: text("output_format", { enum: ["apk", "aab"] }).notNull().default("apk"),
  status: text("status", { enum: ["queued", "running", "success", "failed", "cancelled"] }).notNull().default("queued"),
  progress: integer("progress").notNull().default(0),
  logs: text("logs").notNull().default("[]"),
  outputPath: text("output_path"),
  outputSizeBytes: integer("output_size_bytes"),
  minSdkVersion: integer("min_sdk_version"),
  targetSdkVersion: integer("target_sdk_version"),
  keystoreId: integer("keystore_id"),
  startedAt: text("started_at"),
  completedAt: text("completed_at"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export type Build = typeof buildsTable.$inferSelect;
export type InsertBuild = typeof buildsTable.$inferInsert;
