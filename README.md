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

## Deploy to Firebase (Functions + Hosting)

This repo is configured to deploy your existing Express app to **Firebase Cloud Functions** and route all Hosting traffic to it (so your endpoints stay the same: `/api/v1/...`, `/health`, etc).

### One-time setup (on your machine)

1) Install Firebase CLI + login:

```bash
npm i -g firebase-tools
firebase login
```

2) Connect this folder to your Firebase project:

```bash
firebase use --add
```

3) Set required secrets/env:

- **Gemini key** (recommended as a Firebase Secret; it becomes `process.env.GEMINI_KEY` at runtime):

```bash
firebase functions:secrets:set GEMINI_KEY
```

### Deploy

```bash
firebase deploy --only functions,hosting
```

### Call your endpoints

After deploy, your API is available at:

- `https://<your-project>.web.app/health`
- `https://<your-project>.web.app/api/v1/home`
- `https://<your-project>.web.app/api/v1/ask`

> Note: all `/api/v1/*` endpoints require `Authorization: Bearer <FIREBASE_ID_TOKEN>` (same as local).

## Notes

- Data is persisted locally in `./data/db.json` (configurable via `DB_PATH`).
- `/ask` also exists as a backwards-compatible alias and still requires auth.

