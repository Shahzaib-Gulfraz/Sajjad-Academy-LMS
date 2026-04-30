# FullLMS — LMS (Frontend + Backend)

This folder contains the Learning Management System (LMS) application used in the FullLMS project. It includes a React + TypeScript frontend and a NestJS + TypeScript backend. The project provides features for admin, teacher and student portals including timetable planning, attendance, quizzes, assignments, gradebook, and more.

---

## Contents

- `lms/` — Frontend application (Vite + React + TypeScript)
  - `src/` — React source
  - `public/` — static assets
  - `package.json`, `vite.config.ts` — build tooling
- `lms-backend/` — Backend (NestJS + TypeScript)
  - `src/` — NestJS modules, controllers, services
  - `package.json`, `tsconfig.json` — build tooling
- `TEACHER_CLASSES_INSPECTION_REPORT.md` — project-specific notes and reports

---

## Project Overview

This LMS implements:
- User roles: Admin, Teacher, Student
- Timetable Planner (Admin): create allocations with `startDate`/`endDate` ranges, start/end times, class, subject, teacher
- Timetable (Student): weekly schedule view with server-resolved class and subject names, smart filtering, and active/inactive indicators for date ranges
- Authentication & authorization (JWT / session in backend)
- Integrations: Cloudinary for media upload (config in backend integrations)

---

## Local Setup

Requirements:
- Node 18+ (or project Node version from package.json)
- pnpm / npm (any package manager supported by scripts)
- MongoDB running (connection string configured via environment variables)

1. Install dependencies (frontend & backend)

```bash
# Frontend
cd FullLMS/LMS/lms
npm install

# Backend
cd FullLMS/LMS/lms-backend
npm install
```

2. Environment variables

Create `.env` or `.env.local` files (not committed). Typical variables (backend):

```
MONGODB_URI=mongodb://localhost:27017/full_lms
JWT_SECRET=your_jwt_secret
CLOUDINARY_URL=...
PORT=3000
```

Frontend (example):

```
VITE_API_BASE_URL=http://localhost:3000
```

3. Run locally

```bash
# Backend (development)
cd FullLMS/LMS/lms-backend
npm run start:dev

# Frontend (development)
cd FullLMS/LMS/lms
npm run dev
```

---

## Build for Production

```bash
# Frontend
cd FullLMS/LMS/lms
npm run build

# Backend
cd FullLMS/LMS/lms-backend
npm run build
```

The frontend build outputs `dist/`. The backend build outputs to `dist/` per NestJS defaults.

---

## Key Developer Notes

- Timetable data:
  - Backend returns resolved `className` and `subject` names (server-side mapping from ObjectId/UUID to names).
  - Timetable slots can be legacy single-date (`date`) or ranged with `startDate`/`endDate` fields.
  - Backend list queries include overlap logic to return slots that intersect the requested week range.

- Student UI changes:
  - The Student timetable component now receives subject names and date-range metadata from the API and displays compact course chips and only days that have scheduled classes.
  - Inactive courses (outside their `startDate`/`endDate`) are shown with reduced opacity/strike-through and an indicator.

- Admin UI (Timetable Planner):
  - Admin can create allocations using `startDate` + `endDate` to define course periods.
  - Conflict detection checks for date-range overlaps and time conflicts.

---

## Testing

- Frontend type-check and build:

```bash
cd FullLMS/LMS/lms
npm run build
```

- Backend build and tests:

```bash
cd FullLMS/LMS/lms-backend
npm run build
# run unit/e2e tests if present
npm run test
```

---

## Deployment & Notes

- Configure environment variables in your deployment environment (Docker, Kubernetes, or managed services).
- Ensure MongoDB indices for timetable queries are present if performance becomes a factor (date range queries).

---

## Useful Commands (recap)

- Frontend dev: `cd lms && npm run dev`
- Frontend build: `cd lms && npm run build`
- Backend dev: `cd lms-backend && npm run start:dev`
- Backend build: `cd lms-backend && npm run build`

---

## Where to look in the code

- Frontend timetable: `lms/src/components/student/timetable` and `lms/src/components/student/timetable/hooks`
- Admin planner: `lms/src/components/admin` (or `AdminTimetablePlanner.tsx`)
- Backend timetable service & DTOs: `lms-backend/src/modules/timetable` (look for `timetable.service.ts` and DTOs)

---

## Maintainers / Contacts

- Primary developer: check repository commit history for author details
- For questions about deployment or env, ask the backend owner listed in `lms-backend/src/config` files

---

If you want, I can:
- Add a short Quick Start section tailored to your OS (Linux)
- Add example `.env` templates (safe defaults)
- Create a `CONTRIBUTING.md` with branch/PR rules

# Sajjad-Academy-LMS
