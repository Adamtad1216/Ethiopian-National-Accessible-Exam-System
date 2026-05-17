# Ethiopian National Accessible Exam System (ENAES)

Production-ready full-stack exam platform with:

- React + TypeScript + Tailwind frontend
- Node.js + TypeScript + Express backend
- MongoDB (local) + Mongoose
- JWT access/refresh auth
- Role-based authorization (admin, examiner, student)
- Offline response sync with latest `answeredAt` conflict resolution

## Local Requirements

- Node.js 20+
- npm 10+
- MongoDB local instance running on `mongodb://localhost:27017`

## Project Structure

- `frontend/` React frontend app
- `backend/` backend API service

## Run From Project Root (No cd Required)

From the project root folder, you can run:

- `npm run dev:backend`
- `npm run dev:student`
- `npm run dev:staff`

And for checks/builds:

- `npm run build:backend`
- `npm run build:student`
- `npm run build:staff`
- `npm run test:backend`
- `npm run test:frontend`
- `npm run test:e2e:smoke`
- `npm run check:release`

## Backend Setup

1. Create env file:
   - Copy `backend/.env.example` to `backend/.env`

2. Install dependencies:
   - `cd backend`
   - `npm install`

3. Seed initial data:
   - `npm run seed`

4. Start backend:
   - `npm run dev`

Backend default URL: `http://localhost:4000`

## Frontend Setup

1. Install dependencies:
   - `cd frontend`
   - `npm install`

2. Optional frontend env (`frontend/.env`):
   - `VITE_API_BASE_URL=http://localhost:4000/api`

3. Start frontend:
   - `cd frontend`
   - `npm run dev:student` (Student Portal on `http://localhost:6031`)
   - `npm run dev:staff` (Admin/Examiner Portal on `http://localhost:6032`)

Frontend portal URLs:

- Student Portal: `http://localhost:6031`
- Admin/Examiner Portal: `http://localhost:6032`

## Test Commands

### Backend

- Build: `cd backend && npm run build`
- Tests: `cd backend && npm test`

### Frontend

- Unit tests: `cd frontend && npm test`
- Targeted tests:
  - `cd frontend && npx vitest run src/test/examPlayer.keyboard.test.tsx src/test/examSubmission.api.test.tsx`

### E2E

- Spec file: `frontend/e2e/offline-sync.spec.ts`
- Deterministic smoke run: `cd frontend && npm run e2e:smoke`
- Full Playwright suite: `cd frontend && npm run e2e`
- Data-dependent offline sync test opt-in (PowerShell): `$env:ENABLE_DATA_DEPENDENT_E2E='true'; cd frontend; npm run e2e:data`

## Seed Credentials

- Admin: `admin@enaes.com` / `demo123`

`npm run seed` now creates only the admin account. Examiner and student accounts
are created through API flows.

## Key API Areas

- `POST /api/auth/login`
- `POST /api/auth/register` (student self-registration)
- `POST /api/auth/refresh`
- `POST /api/users` (admin creates `student` or `examiner` accounts)
- `GET /api/exams/assigned`
- `POST /api/responses`
- `POST /api/responses/sync`
- `POST /api/results/grade/:examId`
