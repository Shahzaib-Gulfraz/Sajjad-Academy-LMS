# FullLMS — Sajjad Academy LMS

A professional Learning Management System (LMS) repository containing the frontend and backend applications used by Sajjad Academy. This document summarises the project, how to run it locally, developer notes, and useful commands.

Table of contents a gy hjy
- Project overview
- Features
- Architecture & folders
- Quick start (Linux)
- Environment variables
- Builds & testing
- Developer notes
- Contributing
- Contact

Project overview
----------------
FullLMS provides role-based LMS functionality for Admins, Teachers and Students. It includes a timetable planner, attendance and gradebook modules, assignment and quiz workflows, notifications, and media uploads.

Features
--------
- Role-based access control (Admin / Teacher / Student)
- Timetable Planner (Admin): create allocations with `startDate`/`endDate` ranges, start/end times, class, subject, teacher
- Student Timetable: weekly schedule view with server-resolved class/subject names, smart filtering, and active/inactive period indicators
- Assignments & Quizzes: create, submit, grade, and review
- Attendance & Gradebook: attendance recording and reporting tools
- Announcements & Notifications: in-app notifications and announcements
- File uploads: Cloudinary integration (configurable)
- API-first design with typed DTOs, validation and error handling

Architecture & repository layout
-------------------------------
- `lms/` — Frontend (Vite + React + TypeScript)
	- `src/` — React app source
	- `public/` — static assets
- `lms-backend/` — Backend (NestJS + TypeScript)
	- `src/` — modules, controllers, services, DTOs
- `TEACHER_CLASSES_INSPECTION_REPORT.md` — migration/inspection notes

Quick start (Linux)
-------------------
Prerequisites
- Node 18+ (or as required by `package.json`)
- npm (or pnpm)
- MongoDB (local or remote)

Install dependencies
```bash
# Frontend
cd FullLMS/LMS/lms
npm install

# Backend
cd ../lms-backend
npm install
```

Environment variables
---------------------
Create `.env` files (do not commit). Example backend `.env` (place in `lms-backend/`):
```env
MONGODB_URI=mongodb://localhost:27017/full_lms
JWT_SECRET=your_jwt_secret
CLOUDINARY_URL=cloudinary://<key>:<secret>@<cloud_name>
PORT=3000
```

Frontend example (place in `lms/`):
```env
VITE_API_BASE_URL=http://localhost:3000
```

Run locally
```bash
# Start backend (development)
cd FullLMS/LMS/lms-backend
npm run start:dev

# Start frontend (development)
cd ../lms
npm run dev
```

Build & testing
---------------
```bash
# Frontend build
cd FullLMS/LMS/lms
npm run build

# Backend build
cd ../lms-backend
npm run build

# Run backend tests (if present)
npm run test
```

Developer notes
---------------
- Timetable model:
	- Supports legacy single-date slots (`date`) and ranged slots (`startDate`/`endDate`).
	- Backend resolves `className` (ObjectId) and `subject` (UUID) into readable names before returning API responses.
	- List endpoints use date-range overlap logic to return slots intersecting a given week range.
- Student UI:
	- Displays compact course chips and only shows days that have scheduled classes.
	- Marks inactive courses (outside range) visually with reduced opacity or strike-through.
- Admin UI:
	- Admins can create allocations spanning date ranges; server-side conflict detection prevents overlaps.

Contributing
------------
- Please open pull requests against `main` and include tests and documentation for significant changes.
- Consider adding `CONTRIBUTING.md` and `CODE_OF_CONDUCT.md` for public collaboration.

Contact & maintainers
---------------------
- Check repository commit history for authors and maintainers.
- For environment/deployment questions, review `lms-backend/src/config` and contact the backend owner.

License
-------
Add a `LICENSE` file or specify the license (e.g., MIT) here.

Next steps (optional)
---------------------
- Add `.env.example` with safe placeholders.
- Add `CONTRIBUTING.md` and `CODE_OF_CONDUCT.md`.
- Add Dockerfile and docker-compose for local development.

Sajjad Academy — FullLMS
