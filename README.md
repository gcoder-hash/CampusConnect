# CampusConnect — Complete Placement Portal

A full-stack, non-AI campus placement portal built with React, Vite, Node.js, Express, SQLite, JWT authentication, bcrypt password hashing, and private PDF resume uploads.

## Included features

### Student accounts
- Student registration with name, email, college registration number, and password.
- Login and protected student workspace.
- Browse and search open jobs; open full job details inside CampusConnect.
- Apply to a job by uploading a PDF resume (maximum 5 MB).
- Prevent duplicate applications; track status and withdraw an application.

### Recruiter accounts
- Recruiter registration with name, email, company name, and password.
- Post, edit, and remove only the recruiter's own jobs.
- Required application deadline; expired jobs automatically close and are hidden from student listings. The API also rejects applications after the deadline.
- View applicants for the recruiter's own jobs, view/download their resumes, and update application status.

### Security and storage
- Passwords are stored as bcrypt hashes; authentication uses signed 12-hour JWTs.
- API routes enforce authentication, role permissions, and ownership checks.
- Resume files are stored privately and served only through an authenticated recruiter endpoint with job-ownership validation.
- SQLite database is created automatically in `backend/data/`; uploaded resumes are stored in `backend/uploads/`.

## Requirements
- Node.js 22 LTS (recommended) and npm.
- macOS, Windows, or Linux.

## Setup (Mac)
1. Extract this ZIP. The extracted folder is `CampusConnect_Complete`.
2. Open Terminal and enter the project folder (adjust if you extracted elsewhere):
   ```bash
   cd ~/Downloads/CampusConnect_Complete
   ```
3. Create the private environment file: `cp backend/.env.example backend/.env`
4. Open `backend/.env` and replace `JWT_SECRET` with a long random value. Do not share this value.
5. Install all dependencies: `npm run install:all`
6. Start both servers: `npm run dev`
7. Open **http://localhost:5173** in your browser. Keep Terminal open while using the app.

## Setup (Windows)
1. Extract the ZIP and open PowerShell in `CampusConnect_Complete`.
2. Run `Copy-Item backend/.env.example backend/.env`.
3. Edit `backend/.env` and set a private long `JWT_SECRET`.
4. Run `npm run install:all`, then `npm run dev`.
5. Open **http://localhost:5173**.

## Demo recruiter account
- Email: `recruiter@campusconnect.demo`
- Password: `Demo@123`
- Select **I'm hiring** at login.

You can register a new student account using a unique email and college registration number. The demo recruiter is seeded locally for testing. Change/remove the demo credentials before any public deployment.

## Ports
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:4000`
- Health check: `http://localhost:4000/api/health`

If a port is already occupied, stop the old development server with Control+C in its Terminal window. If that window is unavailable, inspect the process with `lsof -nP -iTCP:4000 -sTCP:LISTEN` or port 5173 and stop only the listed process.

## Project layout
```text
CampusConnect_Complete/
├── backend/
│   ├── data/                 # SQLite database created on first run
│   ├── uploads/              # Private PDF resumes
│   ├── db.js
│   ├── middleware.js
│   ├── server.js
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/main.jsx
│   ├── src/style.css
│   ├── index.html
│   └── vite.config.js
├── docs/
├── package.json
└── README.md
```

## Important deployment note
This is a local development/portfolio project. Before public deployment, use HTTPS, production secrets, rate limiting, stricter PDF content validation and malware scanning, backups, audit logging, and a production database strategy.
