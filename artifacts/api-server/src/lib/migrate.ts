import Database from "better-sqlite3";
import { join } from "path";
import { mkdirSync } from "fs";

const DATA_DIR = process.env.DATA_DIR ?? join(process.cwd(), "data");
mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = process.env.DB_PATH ?? join(DATA_DIR, "apk-builder.db");

const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

const TABLES = [
  `CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    source_type TEXT NOT NULL DEFAULT 'github',
    source_url TEXT,
    package_id TEXT NOT NULL DEFAULT 'com.example.app',
    app_name TEXT NOT NULL DEFAULT 'My App',
    version_name TEXT NOT NULL DEFAULT '1.0.0',
    version_code INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'pending',
    framework TEXT,
    build_tool TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS builds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    build_type TEXT NOT NULL DEFAULT 'debug',
    output_format TEXT NOT NULL DEFAULT 'apk',
    status TEXT NOT NULL DEFAULT 'queued',
    progress INTEGER NOT NULL DEFAULT 0,
    logs TEXT NOT NULL DEFAULT '[]',
    output_path TEXT,
    output_size_bytes INTEGER,
    min_sdk_version INTEGER,
    target_sdk_version INTEGER,
    keystore_id INTEGER,
    started_at TEXT,
    completed_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS keystores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alias TEXT NOT NULL,
    common_name TEXT NOT NULL,
    organization TEXT,
    validity INTEGER DEFAULT 10000,
    file_path TEXT,
    password_hash TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL DEFAULT 'New Conversation',
    project_id INTEGER,
    model TEXT DEFAULT 'gemini-2.5-flash',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    request_type TEXT,
    tool_events TEXT DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS gemini_keys (
    slot INTEGER PRIMARY KEY,
    label TEXT NOT NULL DEFAULT 'Key',
    key_value TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    exhausted_until TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
];

export function runMigrations() {
  const run = sqlite.transaction(() => {
    for (const stmt of TABLES) {
      sqlite.prepare(stmt).run();
    }
    const count = (sqlite.prepare("SELECT COUNT(*) as count FROM gemini_keys").get() as { count: number }).count;
    if (count === 0) {
      for (let slot = 1; slot <= 4; slot++) {
        sqlite.prepare("INSERT OR IGNORE INTO gemini_keys (slot, label, is_active) VALUES (?, ?, 1)").run(slot, `Key ${slot}`);
      }
    }
  });
  run();
}

export { sqlite as rawSqlite };
