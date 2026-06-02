# ExpenseAI

ExpenseAI is a React + TypeScript expense tracker with a local backend and PostgreSQL database.

## Run the Full App

```bash
npm run dev:full
```

This starts:

- Backend API: `http://127.0.0.1:8787`
- Vite frontend: usually `http://localhost:5173`

The Vite dev server proxies `/api` requests to the backend.

## Backend and Database

The backend is implemented with Python standard-library tools in `backend/server.py`.
It uses SQLite and creates the database at:

```text
backend/data/expenseai.sqlite3
```

The backend stores:

- users
- password hashes and salts
- login sessions
- expenses per user

## Password Reset Email

Password reset uses a 6-digit code. If SMTP is configured, the code is sent to the user's email address and is not returned by the API. If SMTP is not configured, the local development app shows the code on screen.

Set these environment variables before starting the backend:

```bash
export EMAIL_ADDRESS="you@example.com"
export EMAIL_PASSWORD="your-smtp-or-app-password"
export SMTP_SERVER="smtp.gmail.com"
export SMTP_PORT="587"
export EMAIL_USE_TLS="true"
```

For Gmail, use an app password instead of your normal account password.

## Useful Commands

```bash
npm run backend
npm run dev
npm run dev:full
npm run build
npm run serve:full
```

`npm run serve:full` serves the built frontend from `dist` through the backend.
