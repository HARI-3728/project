# MediCare+ Frontend

The frontend is a React 19 application built with Vite. It uses the backend API under `/api/v1`.

## Local development

Prerequisites:

- Node.js and npm
- A running MongoDB instance for the backend

Create `backend/.env` from `backend/.env.example` if it does not already exist, then configure `MONGO_URI` and a strong `JWT_SECRET`. Create `frontend/.env` from `frontend/.env.example`. Configure `LLM_API_KEY` to enable live AI chat. Do not put backend secrets in frontend environment files.

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

The default API health check is `http://localhost:5000/api/v1/health`, and the Vite development server runs at `http://localhost:5173`. Set `BACKEND_URL`, `PORT`, and `FRONTEND_URL` in `backend/.env`; the backend validates that `BACKEND_URL` uses the configured `PORT`. Set `FRONTEND_URL` and `VITE_BACKEND_URL` in `frontend/.env`; Vite binds to the frontend URL's host and port.

## Frontend API configuration

The API client builds its `/api/v1` base path from `VITE_BACKEND_URL`. Vite requires both frontend URL settings at startup and does not expose backend-only settings or secrets to browser code. Update both folders' `.env` files when changing development URLs.

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
