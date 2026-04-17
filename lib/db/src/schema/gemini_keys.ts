import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const geminiKeysTable = sqliteTable("gemini_keys", {
  slot: integer("slot").primaryKey(),
  label: text("label").notNull().default("Key"),
  keyValue: text("key_value"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  exhaustedUntil: text("exhausted_until"),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

export type GeminiKey = typeof geminiKeysTable.$inferSelect;
export type InsertGeminiKey = typeof geminiKeysTable.$inferInsert;
