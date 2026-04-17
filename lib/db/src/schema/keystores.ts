import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const keystoresTable = sqliteTable("keystores", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  alias: text("alias").notNull(),
  commonName: text("common_name").notNull(),
  organization: text("organization"),
  validity: integer("validity").default(10000),
  filePath: text("file_path"),
  passwordHash: text("password_hash"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export type Keystore = typeof keystoresTable.$inferSelect;
export type InsertKeystore = typeof keystoresTable.$inferInsert;
