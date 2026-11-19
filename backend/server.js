require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const db = require("./db");
const { authenticate, allow } = require("./middleware");

if (!process.env.JWT_SECRET) {
  console.error("Missing JWT_SECRET. Copy backend/.env.example to backend/.env and set a secret.");
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 4000;
app.use(cors({ origin: ["http://localhost:5173", "http://127.0.0.1:5173"], credentials: false }));
app.use(express.json({ limit: "1mb" }));

const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, crypto.randomUUID() + path.extname(file.originalname).toLowerCase())
});
const resumeUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== ".pdf" || file.mimetype !== "application/pdf") {
      return cb(new Error("Please upload a PDF resume only."));
    }
    cb(null, true);
  }
});

function refreshExpiredJobs() {
  db.prepare("UPDATE jobs SET status='closed' WHERE status='open' AND date(deadline) < date('now')").run();
}
// Close expired listings automatically while the API process is running.
refreshExpiredJobs();
setInterval(refreshExpiredJobs, 60 * 1000);

function publicUser(user) {
  return {
    id: user.id, name: user.name, email: user.email, role: user.role,
    registrationNumber: user.registration_number || null,
    companyName: user.company_name || null
  };
}
function makeToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "12h" }
  );
}

app.get("/api/health", (_req, res) => res.json({ status: "ok", app: "CampusConnect API" }));

app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password, role, registrationNumber, companyName } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "Please complete all required fields." });
    }
    const normalizedEmail = String(email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ message: "Enter a valid email address." });
    }
    if (String(password).length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters." });
    }
    if (!["student", "recruiter"].includes(role)) {
      return res.status(400).json({ message: "Choose Student or Recruiter account type." });
    }
    if (role === "student" && !String(registrationNumber || "").trim()) {
      return res.status(400).json({ message: "College registration number is required for students." });
    }
    if (role === "recruiter" && !String(companyName || "").trim()) {
      return res.status(400).json({ message: "Company name is required for recruiters." });
    }

    const hash = await bcrypt.hash(password, 12);
    const info = db.prepare(`INSERT INTO users
      (name,email,password_hash,role,registration_number,company_name)
      VALUES(?,?,?,?,?,?)`).run(
        String(name).trim(), normalizedEmail, hash, role,
        role === "student" ? String(registrationNumber).trim() : null,
        role === "recruiter" ? String(companyName).trim() : null
      );
    const user = db.prepare("SELECT * FROM users WHERE id=?").get(info.lastInsertRowid);
    res.status(201).json({ token: makeToken(user), user: publicUser(user) });
  } catch (err) {
    if (String(err.code).startsWith("SQLITE_CONSTRAINT")) {
      return res.status(409).json({ message: "That email or registration number is already registered." });
    }
    console.error(err);
    res.status(500).json({ message: "Could not create your account." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password, role } = req.body;
  if (!email || !password || !role) return res.status(400).json({ message: "Email, password and account type are required." });
  const user = db.prepare("SELECT * FROM users WHERE email=?").get(String(email).trim().toLowerCase());
  if (!user || user.role !== role || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ message: "Incorrect login details or account type." });
  }
  res.json({ token: makeToken(user), user: publicUser(user) });
});

app.get("/api/auth/me", authenticate, (req, res) => {
  const user = db.prepare("SELECT * FROM users WHERE id=?").get(req.user.id);
  if (!user) return res.status(404).json({ message: "Account not found." });
  res.json({ user: publicUser(user) });
});

app.get("/api/jobs", authenticate, (req, res) => {
  refreshExpiredJobs();
  const jobs = db.prepare(`SELECT j.*, u.name AS recruiter_name,
    (SELECT COUNT(*) FROM applications a WHERE a.job_id=j.id) AS applicant_count,
    EXISTS(SELECT 1 FROM applications a WHERE a.job_id=j.id AND a.student_id=?) AS has_applied
    FROM jobs j JOIN users u ON u.id=j.recruiter_id WHERE j.status='open' AND date(j.deadline) >= date('now') ORDER BY j.created_at DESC`).all(req.user.id);
  res.json({ jobs });
});

app.post("/api/jobs", authenticate, allow("recruiter"), (req, res) => {
  const { title, description, location, package: salary, eligibility, deadline } = req.body;
  if (![title, description, location, salary, deadline].every(v => String(v || "").trim())) {
    return res.status(400).json({ message: "Title, description, location, package and application deadline are required." });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(deadline) || deadline < new Date().toISOString().slice(0,10)) {
    return res.status(400).json({ message: "Choose a valid deadline that is today or later." });
  }
  const user = db.prepare("SELECT * FROM users WHERE id=?").get(req.user.id);
  const info = db.prepare(`INSERT INTO jobs
    (recruiter_id,company_name,title,description,location,package,eligibility,deadline,status)
    VALUES(?,?,?,?,?,?,?,?,'open')`).run(user.id, user.company_name, title.trim(), description.trim(), location.trim(), salary.trim(), (eligibility || "").trim(), deadline);
  res.status(201).json({ job: db.prepare("SELECT * FROM jobs WHERE id=?").get(info.lastInsertRowid) });
});

app.post("/api/jobs/:id/apply", authenticate, allow("student"), (req, res) => {
  resumeUpload.single("resume")(req, res, err => {
    if (err) return res.status(400).json({ message: err.message || "Resume upload failed." });
    if (!req.file) return res.status(400).json({ message: "Please attach your PDF resume." });
    try {
      refreshExpiredJobs();
      const job = db.prepare("SELECT id,status,deadline FROM jobs WHERE id=?").get(req.params.id);
      if (!job) {
        fs.unlinkSync(req.file.path);
        return res.status(404).json({ message: "Job not found." });
      }
      if (job.status !== "open" || job.deadline < new Date().toISOString().slice(0,10)) {
        fs.unlinkSync(req.file.path);
        return res.status(409).json({ message: "This job application deadline has passed. The job is closed." });
      }
      const info = db.prepare(`INSERT INTO applications
        (job_id,student_id,resume_filename,resume_original_name)
        VALUES(?,?,?,?)`).run(job.id, req.user.id, req.file.filename, path.basename(req.file.originalname));
      res.status(201).json({ message: "Application submitted successfully.", applicationId: info.lastInsertRowid });
    } catch (e) {
      fs.unlinkSync(req.file.path);
      if (String(e.code).startsWith("SQLITE_CONSTRAINT")) {
        return res.status(409).json({ message: "You have already applied for this job." });
      }
      console.error(e);
      res.status(500).json({ message: "Could not submit application." });
    }
  });
});

app.get("/api/applications/mine", authenticate, allow("student"), (req, res) => {
  const applications = db.prepare(`SELECT a.id,a.status,a.created_at,a.resume_original_name,
    j.title,j.company_name,j.location,j.package
    FROM applications a JOIN jobs j ON j.id=a.job_id
    WHERE a.student_id=? ORDER BY a.created_at DESC`).all(req.user.id);
  res.json({ applications });
});

app.get("/api/recruiter/jobs", authenticate, allow("recruiter"), (req, res) => {
  refreshExpiredJobs();
  const jobs = db.prepare(`SELECT j.*,
    (SELECT COUNT(*) FROM applications a WHERE a.job_id=j.id) AS applicant_count
    FROM jobs j WHERE j.recruiter_id=? ORDER BY j.created_at DESC`).all(req.user.id);
  res.json({ jobs });
});

app.get("/api/recruiter/applications", authenticate, allow("recruiter"), (req, res) => {
  const applications = db.prepare(`SELECT a.id,a.status,a.created_at,a.resume_original_name,
    u.name AS student_name,u.email AS student_email,u.registration_number,
    j.title AS job_title,j.company_name,j.id AS job_id
    FROM applications a JOIN jobs j ON j.id=a.job_id JOIN users u ON u.id=a.student_id
    WHERE j.recruiter_id=? ORDER BY a.created_at DESC`).all(req.user.id);
  res.json({ applications });
});

app.patch("/api/recruiter/applications/:id/status", authenticate, allow("recruiter"), (req, res) => {
  const { status } = req.body;
  if (!["Under Review", "Shortlisted", "Rejected"].includes(status)) {
    return res.status(400).json({ message: "Invalid application status." });
  }
  const application = db.prepare(`SELECT a.id FROM applications a JOIN jobs j ON j.id=a.job_id
    WHERE a.id=? AND j.recruiter_id=?`).get(req.params.id, req.user.id);
  if (!application) return res.status(404).json({ message: "Application not found." });
  db.prepare("UPDATE applications SET status=? WHERE id=?").run(status, application.id);
  res.json({ message: "Application status updated." });
});

app.get("/api/recruiter/applications/:id/resume", authenticate, allow("recruiter"), (req, res) => {
  const application = db.prepare(`SELECT a.resume_filename,a.resume_original_name
    FROM applications a JOIN jobs j ON j.id=a.job_id
    WHERE a.id=? AND j.recruiter_id=?`).get(req.params.id, req.user.id);
  if (!application) return res.status(404).json({ message: "Resume not found or access denied." });
  const fullPath = path.join(uploadDir, application.resume_filename);
  if (!fs.existsSync(fullPath)) return res.status(404).json({ message: "Resume file is unavailable." });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${application.resume_original_name.replace(/["\\]/g, "_")}"`);
  res.sendFile(fullPath);
});


app.put("/api/recruiter/jobs/:id", authenticate, allow("recruiter"), (req, res) => {
  const { title, description, location, package: salary, eligibility, deadline } = req.body;
  if (![title, description, location, salary, deadline].every(v => String(v || "").trim())) {
    return res.status(400).json({ message: "Title, description, location, package and application deadline are required." });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(deadline)) {
    return res.status(400).json({ message: "Choose a valid application deadline." });
  }
  const job = db.prepare("SELECT id FROM jobs WHERE id=? AND recruiter_id=?").get(req.params.id, req.user.id);
  if (!job) return res.status(404).json({ message: "Job not found or you do not own this job." });
  const status = deadline < new Date().toISOString().slice(0,10) ? "closed" : "open";
  db.prepare(`UPDATE jobs SET title=?,description=?,location=?,package=?,eligibility=?,deadline=?,status=?
    WHERE id=? AND recruiter_id=?`).run(title.trim(), description.trim(), location.trim(), salary.trim(),
    String(eligibility || "").trim(), deadline, status, job.id, req.user.id);
  res.json({ message: "Job updated successfully.", job: db.prepare("SELECT * FROM jobs WHERE id=?").get(job.id) });
});

app.delete("/api/recruiter/jobs/:id", authenticate, allow("recruiter"), (req, res) => {
  const job = db.prepare("SELECT id FROM jobs WHERE id=? AND recruiter_id=?").get(req.params.id, req.user.id);
  if (!job) return res.status(404).json({ message: "Job not found or you do not own this job." });
  const remove = db.transaction(() => {
    const apps = db.prepare("SELECT resume_filename FROM applications WHERE job_id=?").all(job.id);
    for (const app of apps) {
      const file = path.join(uploadDir, app.resume_filename);
      if (fs.existsSync(file)) fs.unlinkSync(file);
    }
    db.prepare("DELETE FROM applications WHERE job_id=?").run(job.id);
    db.prepare("DELETE FROM jobs WHERE id=? AND recruiter_id=?").run(job.id, req.user.id);
  });
  remove();
  res.json({ message: "Job and its applications were removed." });
});

app.delete("/api/applications/:id", authenticate, allow("student"), (req, res) => {
  const application = db.prepare("SELECT id,resume_filename FROM applications WHERE id=? AND student_id=?").get(req.params.id, req.user.id);
  if (!application) return res.status(404).json({ message: "Application not found." });
  db.prepare("DELETE FROM applications WHERE id=? AND student_id=?").run(application.id, req.user.id);
  const file = path.join(uploadDir, application.resume_filename);
  if (fs.existsSync(file)) fs.unlinkSync(file);
  res.json({ message: "Application cancelled successfully." });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: "Unexpected server error." });
});

app.listen(PORT, () => console.log(`CampusConnect API running at http://localhost:${PORT}`));