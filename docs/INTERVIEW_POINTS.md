# CampusConnect — Interview Talking Points

1. **Authentication:** JWT-based sessions and bcrypt password hashing.
2. **Role-based access control:** Student and recruiter routes are protected separately on the backend.
3. **Relational data:** Users, jobs and applications are linked using foreign keys.
4. **Duplicate prevention:** A unique database constraint prevents one student applying to the same job twice.
5. **Resume security:** Resume files are stored privately and delivered only after recruiter authentication and job-ownership verification.
6. **Frontend/backend integration:** React uses fetch and FormData to call Express APIs, including multipart PDF upload.
7. **Application lifecycle:** Recruiters can move an application through Submitted, Under Review, Shortlisted and Rejected.
8. **Validation:** Server-side validation checks role, required fields, password length, file type, file size and duplicate applications.
