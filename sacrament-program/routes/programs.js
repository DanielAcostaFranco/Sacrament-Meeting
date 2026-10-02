import express from "express";
import db, { touchProgram } from "../db/database.js";

const router = express.Router();

// Helpers
function nextSundayISO() {
  const d = new Date();
  const day = d.getDay(); // 0 Sun ... 6 Sat
  const diff = (7 - day) % 7; // days until next Sunday (0 if Sunday)
  d.setDate(d.getDate() + (diff === 0 ? 7 : diff)); // next Sunday (not today)
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseSpeakersFromForm(body) {
  // speakers_name[], speakers_topic[]
  const names = Array.isArray(body.speakers_name) ? body.speakers_name : [];
  const topics = Array.isArray(body.speakers_topic) ? body.speakers_topic : [];

  const speakers = [];
  for (let i = 0; i < Math.max(names.length, topics.length); i++) {
    const name = (names[i] || "").trim();
    const topic = (topics[i] || "").trim();
    if (name || topic) speakers.push({ name, topic });
  }
  return speakers;
}

// SQL
const listStmt = db.prepare(`
  SELECT id, meeting_date, conducting, presiding, unit_name, updated_at
  FROM programs
  ORDER BY meeting_date DESC
`);

const getStmt = db.prepare(`SELECT * FROM programs WHERE id = ?`);

const insertStmt = db.prepare(`
  INSERT INTO programs (
    meeting_date, unit_name, presiding, conducting,
    opening_hymn, opening_prayer,
    sacrament_hymn,
    speakers_json,
    intermediate_hymn,
    closing_hymn, closing_prayer,
    announcements, sustainings, releases, notes
  ) VALUES (
    @meeting_date, @unit_name, @presiding, @conducting,
    @opening_hymn, @opening_prayer,
    @sacrament_hymn,
    @speakers_json,
    @intermediate_hymn,
    @closing_hymn, @closing_prayer,
    @announcements, @sustainings, @releases, @notes
  )
`);

const updateStmt = db.prepare(`
  UPDATE programs SET
    meeting_date=@meeting_date,
    unit_name=@unit_name,
    presiding=@presiding,
    conducting=@conducting,
    opening_hymn=@opening_hymn,
    opening_prayer=@opening_prayer,
    sacrament_hymn=@sacrament_hymn,
    speakers_json=@speakers_json,
    intermediate_hymn=@intermediate_hymn,
    closing_hymn=@closing_hymn,
    closing_prayer=@closing_prayer,
    announcements=@announcements,
    sustainings=@sustainings,
    releases=@releases,
    notes=@notes,
    updated_at=datetime('now')
  WHERE id=@id
`);

const deleteStmt = db.prepare(`DELETE FROM programs WHERE id = ?`);

// Routes

// History list
router.get("/", (req, res) => {
  const programs = listStmt.all();
  res.render("programs_list", { programs });
});

// New form
router.get("/new", (req, res) => {
  res.render("programs_new", {
    defaultDate: nextSundayISO()
  });
});

// Create
router.post("/", (req, res) => {
  const speakers = parseSpeakersFromForm(req.body);

  if (!req.body.meeting_date || req.body.meeting_date.trim() === "") {
    return res.status(400).send("Meeting date is required.");
  }

  const data = {
    meeting_date: req.body.meeting_date.trim(),
    unit_name: (req.body.unit_name || "").trim(),
    presiding: (req.body.presiding || "").trim(),
    conducting: (req.body.conducting || "").trim(),
    opening_hymn: (req.body.opening_hymn || "").trim(),
    opening_prayer: (req.body.opening_prayer || "").trim(),
    sacrament_hymn: (req.body.sacrament_hymn || "").trim(),
    speakers_json: JSON.stringify(speakers),
    intermediate_hymn: (req.body.intermediate_hymn || "").trim(),
    closing_hymn: (req.body.closing_hymn || "").trim(),
    closing_prayer: (req.body.closing_prayer || "").trim(),
    announcements: (req.body.announcements || "").trim(),
    sustainings: (req.body.sustainings || "").trim(),
    releases: (req.body.releases || "").trim(),
    notes: (req.body.notes || "").trim()
  };

  const result = insertStmt.run(data);
  res.redirect(`/programs/${result.lastInsertRowid}`);
});

// View
router.get("/:id", (req, res) => {
  const program = getStmt.get(req.params.id);
  if (!program) return res.status(404).send("Not found");

  const speakers = JSON.parse(program.speakers_json || "[]");
  res.render("program_view", { program, speakers, printMode: false });
});

// Print-friendly view
router.get("/:id/print", (req, res) => {
  const program = getStmt.get(req.params.id);
  if (!program) return res.status(404).send("Not found");

  const speakers = JSON.parse(program.speakers_json || "[]");
  res.render("program_view", { program, speakers, printMode: true });
});

// Edit form
router.get("/:id/edit", (req, res) => {
  const program = getStmt.get(req.params.id);
  if (!program) return res.status(404).send("Not found");

  const speakers = JSON.parse(program.speakers_json || "[]");
  res.render("programs_edit", { program, speakers });
});

// Update
router.post("/:id", (req, res) => {
  const existing = getStmt.get(req.params.id);
  if (!existing) return res.status(404).send("Not found");

  const speakers = parseSpeakersFromForm(req.body);

  const data = {
    id: Number(req.params.id),
    meeting_date: (req.body.meeting_date || "").trim(),
    unit_name: (req.body.unit_name || "").trim(),
    presiding: (req.body.presiding || "").trim(),
    conducting: (req.body.conducting || "").trim(),
    opening_hymn: (req.body.opening_hymn || "").trim(),
    opening_prayer: (req.body.opening_prayer || "").trim(),
    sacrament_hymn: (req.body.sacrament_hymn || "").trim(),
    speakers_json: JSON.stringify(speakers),
    intermediate_hymn: (req.body.intermediate_hymn || "").trim(),
    closing_hymn: (req.body.closing_hymn || "").trim(),
    closing_prayer: (req.body.closing_prayer || "").trim(),
    announcements: (req.body.announcements || "").trim(),
    sustainings: (req.body.sustainings || "").trim(),
    releases: (req.body.releases || "").trim(),
    notes: (req.body.notes || "").trim()
  };

  if (!data.meeting_date) return res.status(400).send("Meeting date is required.");

  updateStmt.run(data);
  touchProgram(data.id);
  res.redirect(`/programs/${data.id}`);
});

// Duplicate
router.post("/:id/duplicate", (req, res) => {
  const program = getStmt.get(req.params.id);
  if (!program) return res.status(404).send("Not found");

  const data = {
    meeting_date: nextSundayISO(),
    unit_name: program.unit_name || "",
    presiding: program.presiding || "",
    conducting: program.conducting || "",
    opening_hymn: program.opening_hymn || "",
    opening_prayer: program.opening_prayer || "",
    sacrament_hymn: program.sacrament_hymn || "",
    speakers_json: program.speakers_json || "[]",
    intermediate_hymn: program.intermediate_hymn || "",
    closing_hymn: program.closing_hymn || "",
    closing_prayer: program.closing_prayer || "",
    announcements: program.announcements || "",
    sustainings: program.sustainings || "",
    releases: program.releases || "",
    notes: program.notes || ""
  };

  const result = insertStmt.run(data);
  res.redirect(`/programs/${result.lastInsertRowid}/edit`);
});

// Delete
router.post("/:id/delete", (req, res) => {
  deleteStmt.run(req.params.id);
  res.redirect("/programs");
});

export default router;
