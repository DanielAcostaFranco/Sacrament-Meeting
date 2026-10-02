import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

// Ensure db folder exists
const dbDir = path.join(process.cwd(), "db");
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

// Database file path
const dbPath = path.join(dbDir, "sacrament.sqlite");

// Open (or create) database
const db = new Database(dbPath);

// Good defaults
db.pragma("journal_mode = WAL");

// Create table if it doesn't exist (base schema)
db.exec(`
  CREATE TABLE IF NOT EXISTS programs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    meeting_date TEXT NOT NULL,              -- YYYY-MM-DD
    unit_name TEXT,                          -- optional (ward/branch)
    presiding TEXT,
    conducting TEXT,
    opening_hymn TEXT,
    opening_prayer TEXT,
    sacrament_hymn TEXT,
    speakers_json TEXT NOT NULL,             -- JSON string of speakers
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

// --- Simple migrations (safe to run every startup) ---
// Add new columns (Sustainings & Releases) if missing.
try { db.exec(`ALTER TABLE programs ADD COLUMN sustainings TEXT;`); } catch (e) {}
try { db.exec(`ALTER TABLE programs ADD COLUMN releases TEXT;`); } catch (e) {}

// Helper to update timestamps (optional)
export function touchProgram(id) {
  db.prepare(`UPDATE programs SET updated_at = datetime('now') WHERE id = ?`).run(id);
}

export default db;
