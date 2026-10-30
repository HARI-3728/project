# MediCare+ Frontend

The frontend is a React 19 application built with Vite. It uses the backend API under `/api/v1`.

## Local development

Prerequisites:

- Node.js and npm
- A running MongoDB instance for the backend

Create `backend/.env` from `backend/.env.example` if it does not already exist, then configure `MONGODB_URI` and a strong `JWT_SECRET`. Create `frontend/.env` from `frontend/.env.example`. Configure `LLM_API_KEY` to enable live AI chat. Do not put backend secrets in frontend environment files.

From the repository root, run these commands in separate terminals:

```powershell
Set-Location .\backend
npm install
npm run dev
```

```powershell
Set-Location .\frontend
npm install
npm run dev
```

The default API health check is `http://localhost:5000/api/v1/health`, and the Vite development server runs at `http://localhost:5173`. Set `BACKEND_URL`, `PORT`, and `FRONTEND_URL` in `backend/.env`. `BACKEND_URL` is the public origin and may use a different port from the backend's internal `PORT`, as on Render. Set `FRONTEND_URL` and `VITE_API_URL` in `frontend/.env`; `VITE_API_URL` defaults to the local backend during development.

## Frontend API configuration

The API client reads the backend origin from `VITE_API_URL` and appends `/api/v1` once. Set the Vercel production environment variable `VITE_API_URL` to `https://project-tvkl.onrender.com`; production builds reject loopback API origins. Set the Render `FRONTEND_URL` variable to `https://project-hari-3728.vercel.app` so the backend CORS policy allows the deployed frontend. Do not put backend-only settings or secrets in frontend environment files.

## Checks

Run from `frontend/`:

```powershell
npm run build
npm run lint
```

Run backend tests from `backend/`:

```powershell
npm test
```

## Isolated demo data

The demo seeder only writes to a database named `medicare_demo`; it never reads
`MONGODB_URI` as a fallback and does not update existing profiles. Use a local
MongoDB instance (or a dedicated non-production MongoDB database), then seed it
from `backend/`:

```powershell
$env:DEMO_MODE = 'true'
$env:DEMO_MONGODB_URI = 'mongodb://127.0.0.1:27017/medicare_demo'
npm run seed:demo
```

Point the backend's `MONGODB_URI` at that same isolated database before starting
the API. Do not point either variable at production. The seed includes 10
fictional patients, 7 fictional doctors, 3 fictional hospitals, linked
appointments and prescriptions, health-record summaries (no uploaded files),
reminders, notifications, orders, diagnostic bookings, diet plans, and the
existing exact 10-product medicine catalogue. Re-running the command is
idempotent. Data is explicitly labeled demo/example data where the existing
schema and UI support it.

Demo account password: `DemoPass123!`. Patient emails are
`patient01@medicare-demo.example.test` through
`patient10@medicare-demo.example.test`; doctor emails are
`doctor.arun@medicare-demo.example.test`,
`doctor.priya@medicare-demo.example.test`,
`doctor.rajesh@medicare-demo.example.test`,
`doctor.ananya@medicare-demo.example.test`,
`doctor.vikram@medicare-demo.example.test`,
`doctor.meera@medicare-demo.example.test`, and
`doctor.kavya@medicare-demo.example.test`. Hospital emails are
`hospital.central@medicare-demo.example.test`,
`hospital.north@medicare-demo.example.test`, and
`hospital.south@medicare-demo.example.test`.
