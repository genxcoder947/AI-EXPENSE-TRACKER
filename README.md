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

## Useful Commands

```bash
npm run backend
npm run dev
npm run dev:full
npm run build
npm run serve:full
```

`npm run serve:full` serves the built frontend from `dist` through the backend.
