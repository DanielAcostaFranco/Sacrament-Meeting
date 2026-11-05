import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

// Vercel's deployment filesystem is read-only; /tmp is writable but ephemeral.
const dbDir = process.env.VERCEL
  ? path.join("/tmp", "sacrament-data")
  : path.join(process.cwd(), "db");

if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const dbPath = path.join(dbDir, "sacrament.sqlite");
const db = new Database(dbPath);

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS programs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    meeting_date TEXT NOT NULL,
    unit_name TEXT,
    presiding TEXT,
    conducting TEXT,
    opening_hymn TEXT,
    opening_prayer TEXT,
    sacrament_hymn TEXT,
    speakers_json TEXT NOT NULL,
    intermediate_hymn TEXT,
    closing_hymn TEXT,
    closing_prayer TEXT,
    announcements TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_programs_meeting_date
  ON programs(meeting_date);
`);

try { db.exec(`ALTER TABLE programs ADD COLUMN sustainings TEXT;`); } catch (e) {}
try { db.exec(`ALTER TABLE programs ADD COLUMN releases TEXT;`); } catch (e) {}

export function touchProgram(id) {
  db.prepare(`UPDATE programs SET updated_at = datetime('now') WHERE id = ?`).run(id);
}

export default db;
