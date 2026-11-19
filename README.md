# CampusConnect — Campus Placement & Recruitment Portal

A full-stack campus placement platform that connects students with recruiters through a centralized job application system.

CampusConnect is built using **React, Vite, Node.js, Express, and SQLite**, with JWT-based authentication and secure resume management. It is a non-AI project designed to demonstrate practical full-stack development, authentication, database management, and role-based access control.

## Features

### Student Portal
- Student registration with name, email, college registration number, and password.
- Secure login and protected student dashboard.
- Browse and search available placement opportunities.
- View complete job descriptions and application deadlines.
- Apply for jobs by uploading a PDF resume (maximum 5 MB).
- Prevent duplicate applications.
- Track application status.
- Withdraw submitted applications.

### Recruiter Portal
- Recruiter registration with name, email, company name, and password.
- Secure recruiter login.
- Create, edit, and delete job postings.
- Manage only jobs owned by the logged-in recruiter.
- Set application deadlines.
- View applicants for posted jobs.
- Access applicant resumes through authenticated endpoints.
- Update application statuses.

### Security & Backend
- bcrypt password hashing.
- JWT authentication with 12-hour token expiry.
- Role-based authorization for students and recruiters.
- Ownership validation for job and application operations.
- Private PDF resume storage.
- Server-side application deadline validation.
- SQLite database initialization.

## Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React, Vite, JavaScript, CSS |
| Backend | Node.js, Express.js |
| Database | SQLite |
| Authentication | JWT |
| Password Security | bcrypt |
| File Uploads | PDF resume upload handling |
| Version Control | Git, GitHub |

## Project Architecture

```text
CampusConnect/
│
├── backend/
│   ├── data/
│   ├── uploads/
│   ├── db.js
│   ├── middleware.js
│   ├── server.js
│   ├── package.json
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── main.jsx
│   │   └── style.css
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── docs/
│   ├── INTERVIEW_POINTS.md
│   └── PROJECT_ARCHITECTURE.md
│
├── package.json
└── README.md
```

## Installation & Setup

### Prerequisites

- Node.js 22 LTS recommended.
- npm.
- Git.
- macOS, Windows, or Linux.

### 1. Clone the repository

```bash
git clone https://github.com/gcoder-hash/CampusConnect.git
cd CampusConnect
```

### 2. Configure environment variables

For macOS/Linux:

```bash
cp backend/.env.example backend/.env
```

For Windows PowerShell:

```powershell
Copy-Item backend/.env.example backend/.env
```

Open `backend/.env` and configure a strong, private `JWT_SECRET` using the variable name expected by the example file.

Never commit your actual `.env` file or production secrets.

### 3. Install dependencies

```bash
npm run install:all
```

### 4. Start the application

```bash
npm run dev
```

### 5. Open the application

Frontend: http://localhost:5173

Backend API: http://localhost:4000

Health check: http://localhost:4000/api/health

Keep the terminal running while using the application.

## Application Workflow

**Student workflow**

1. Register as a student.
2. Log in to the student dashboard.
3. Browse available placement opportunities.
4. Open a job and review its details.
5. Upload a PDF resume and submit an application.
6. Track or withdraw an application.

**Recruiter workflow**

1. Register as a recruiter.
2. Log in to the recruiter dashboard.
3. Create a job posting with an application deadline.
4. Review applicants.
5. View applicant resumes.
6. Update application statuses.

## Screenshots

Add screenshots of the actual running application here.

Suggested screenshots:

- [ ] Landing page
- [ ] Student registration and login
- [ ] Student dashboard
- [ ] Job listing and job details
- [ ] Resume application form
- [ ] Recruiter dashboard
- [ ] Job creation form
- [ ] Applicant management

## Security Considerations

CampusConnect includes authentication and authorization mechanisms intended to protect student and recruiter operations.

Before deploying publicly, additional production safeguards are recommended:

- HTTPS enforcement.
- Production-grade secret management.
- API rate limiting.
- Stronger file-content validation.
- Malware scanning for uploaded documents.
- Database backups.
- Audit logging.
- Production database configuration.

## Future Improvements

- Email notifications for application status changes.
- Advanced job search filters.
- Recruiter analytics dashboard.
- Student profile management.
- Cloud-based resume storage.
- Production deployment.

## Project Information

**Project:** CampusConnect  
**Category:** Full-Stack Web Development  
**Architecture:** Client–Server  
**Repository:** https://github.com/gcoder-hash/CampusConnect

---

*CampusConnect is a portfolio and educational project demonstrating full-stack web development and campus recruitment workflows.*