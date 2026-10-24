# MediCare+ Frontend

The frontend is a React 19 application built with Vite. It uses the backend API under `/api/v1`.

## Local development

Prerequisites:

- Node.js and npm
- A running MongoDB instance for the backend

Create `backend/.env` from `backend/.env.example` if it does not already exist, then configure `MONGO_URI` and a strong `JWT_SECRET`. Configure `LLM_API_KEY` to enable live AI chat. Do not put backend secrets in frontend environment files.

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

The API health check is available at `http://localhost:5000/api/v1/health`. The Vite development server runs at `http://localhost:5173`.

## Frontend API configuration

The frontend reads `VITE_API_BASE_URL` from its environment. The example file uses `http://localhost:5000/api/v1`; set a different API base URL when the backend runs elsewhere. Only public API URLs belong in `VITE_*` variables.

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
