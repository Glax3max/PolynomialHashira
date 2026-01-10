# Backend (MVC) — Firebase Auth + Gemini

## Base URLs

- `/api/v1` (matches the examples)
- `/api/v1/name` (matches the “Base URL” line)

## Authentication

All API endpoints require:

- `Authorization: Bearer <FIREBASE_ID_TOKEN>`

Firebase token verification uses **firebase-admin** (ADC via `GOOGLE_APPLICATION_CREDENTIALS`).

## Endpoints

- `GET /api/v1/home?filter=all|search|direct`
- `POST /api/v1/ask`
- `GET /api/v1/chats/:chat_id` (also supports `GET /api/v1/chats?id=<chat_id>`)
- `GET /api/v1/profile`
- `PUT /api/v1/profile`

## Setup

1) Install deps

```bash
npm install
```

2) Create `.env` from `.env.example`

3) Run

```bash
npm run dev
```

## TypeScript

- **Dev**: `npm run dev` (runs `src/index.ts` directly)
- **Build**: `npm run build` (emits compiled JS to `dist/`)
- **Prod**: `npm run prod` (runs `dist/src/index.js`)

## Notes

- Data is persisted locally in `./data/db.json` (configurable via `DB_PATH`).
- `/ask` also exists as a backwards-compatible alias and still requires auth.

