# CampusConnect Architecture

## Main components

- React + Vite frontend: registration, login, student/recruiter workspaces and application UI.
- Express API: authentication, role-protected endpoints, job management and resume access.
- SQLite: users, jobs and applications.
- Private upload directory: PDF resumes stored with generated filenames.

## Main workflow

```text
Register
  ├── Student: name + email + password + college registration number
  └── Recruiter: name + work email + password + company name
        |
        v
      Login
        |
        +-- Student dashboard
        |     ├── Browse jobs
        |     ├── Apply Now
        |     ├── Upload PDF resume
        |     └── Track applications
        |
        +-- Recruiter dashboard
              ├── Post job
              ├── Review applicants
              ├── View / download resume
              └── Update application status
```

## Data model

- `users`: account identity, password hash, role, student registration number or recruiter company.
- `jobs`: recruiter owner, company, role details, location, package and eligibility.
- `applications`: job, student, stored resume filename, original filename and status.

## Authorization

JWT middleware authenticates protected API calls. Role middleware restricts student and recruiter endpoints. Resume access performs an ownership check against the recruiter who created the job.
