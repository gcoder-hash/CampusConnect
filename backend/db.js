const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, "campusconnect.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('student','recruiter')),
  registration_number TEXT UNIQUE,
  company_name TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recruiter_id INTEGER NOT NULL,
  company_name TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT NOT NULL,
  package TEXT NOT NULL,
  eligibility TEXT DEFAULT '',
  deadline TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','closed')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(recruiter_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL,
  student_id INTEGER NOT NULL,
  resume_filename TEXT NOT NULL,
  resume_original_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Submitted',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(job_id, student_id),
  FOREIGN KEY(job_id) REFERENCES jobs(id),
  FOREIGN KEY(student_id) REFERENCES users(id)
);
`);

const jobColumns = db.prepare("PRAGMA table_info(jobs)").all().map(c => c.name);
if (!jobColumns.includes("deadline")) db.exec("ALTER TABLE jobs ADD COLUMN deadline TEXT");
if (!jobColumns.includes("status")) db.exec("ALTER TABLE jobs ADD COLUMN status TEXT NOT NULL DEFAULT 'open'");
db.prepare("UPDATE jobs SET deadline = date('now', '+30 days') WHERE deadline IS NULL OR deadline = ''").run();
db.prepare("UPDATE jobs SET status = 'closed' WHERE date(deadline) < date('now')").run();

const count = db.prepare("SELECT COUNT(*) AS n FROM jobs").get().n;
if (!count) {
  // Seed recruiter is intentionally not created; demo jobs are inserted with a valid demo recruiter below.
  const hash = require("bcryptjs").hashSync("Demo@123", 10);
  const existing = db.prepare("SELECT id FROM users WHERE email=?").get("recruiter@campusconnect.demo");
  let recruiterId = existing?.id;
  if (!recruiterId) {
    const info = db.prepare(`INSERT INTO users(name,email,password_hash,role,company_name)
      VALUES(?,?,?,?,?)`).run("Demo Recruiter", "recruiter@campusconnect.demo", hash, "recruiter", "CampusConnect Demo");
    recruiterId = info.lastInsertRowid;
  }
  const insert = db.prepare(`INSERT INTO jobs
    (recruiter_id, company_name, title, description, location, package, eligibility, deadline, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, date('now', '+30 days'), 'open')`);
  insert.run(recruiterId, "Tata Consultancy Services", "Graduate Trainee",
    "Work with engineering teams on enterprise software projects. Strong fundamentals in programming and problem solving are preferred.",
    "Bengaluru", "₹4.5 LPA", "B.Tech / B.E. · 6.5 CGPA and above");
  insert.run(recruiterId, "Infosys", "Systems Engineer",
    "Join a technology delivery team and contribute to application development, testing and support.",
    "Pune", "₹5 LPA", "B.Tech / B.E. · 6.0 CGPA and above");
  insert.run(recruiterId, "Wipro", "Project Engineer",
    "Build and maintain software solutions with cross-functional teams.",
    "Hyderabad", "₹4 LPA", "B.Tech / B.E. · 6.0 CGPA and above");
}

module.exports = db;