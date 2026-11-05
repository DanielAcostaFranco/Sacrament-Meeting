import fs from "fs";
import path from "path";

function createMemoryDatabase() {
  const rows = [];
  let nextId = 1;

  return {
    prepare(sql) {
      if (sql.includes("SELECT id, meeting_date")) {
        return { all: () => [...rows].sort((a, b) => String(b.meeting_date).localeCompare(String(a.meeting_date))) };
      }

      if (sql.includes("SELECT * FROM programs")) {
        return { get: (id) => rows.find((row) => row.id === Number(id)) };
      }

      if (sql.includes("INSERT INTO programs")) {
        return {
          run(data) {
            const row = {
              id: nextId++,
              ...data,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            rows.push(row);
            return { lastInsertRowid: row.id };
          }
        };
      }

      if (sql.includes("UPDATE programs SET")) {
        return {
          run(data) {
            const row = rows.find((item) => item.id === Number(data.id ?? data));
            if (row) Object.assign(row, typeof data === "object" ? data : {}, { updated_at: new Date().toISOString() });
            return { changes: row ? 1 : 0 };
          }
        };
      }

      if (sql.includes("DELETE FROM programs")) {
        return {
          run(id) {
            const index = rows.findIndex((row) => row.id === Number(id));
            if (index >= 0) rows.splice(index, 1);
            return { changes: index >= 0 ? 1 : 0 };
          }
        };
      }

      throw new Error(`Unsupported query: ${sql}`);
    }
  };
}

let db;

if (process.env.VERCEL) {
  // Vercel functions cannot load the repository's macOS SQLite binary.
  // This adapter keeps the public demo functional; data is ephemeral per function instance.
  db = createMemoryDatabase();
} else {
  const { default: Database } = await import("better-sqlite3");

  const dbDir = path.join(process.cwd(), "db");
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

  const dbPath = path.join(dbDir, "sacrament.sqlite");
  db = new Database(dbPath);
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
}

export function touchProgram(id) {
  if (process.env.VERCEL) {
    db.prepare(`UPDATE programs SET updated_at = datetime('now') WHERE id = ?`).run({ id });
  } else {
    db.prepare(`UPDATE programs SET updated_at = datetime('now') WHERE id = ?`).run(id);
  }
}

export default db;
