# G-tool (ToolBox)

A multi-tool web app: React frontend + Express API, deployed to **Vercel Free (Hobby)**.
The work plan lives in [TASKS.md](TASKS.md). Read it before starting any task, and tick tasks off there when they are done.

## Stack

- **Client** (`client/`): React 18, Vite 5, Tailwind CSS 3 (`darkMode: 'class'`), React Router 6, lucide-react, axios.
- **Server** (`server/`): Express 4, ESM (`"type": "module"`), sharp, tesseract.js, multer, helmet, express-rate-limit.
- **AI**: Google Gemini via `server/services/aiService.js` (`GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_FALLBACK_MODEL`).
- **Vercel entry**: `api/index.js` re-exports `server/app.js` as one serverless function. `vercel.json` rewrites `/api/*` to it and everything else to the SPA.

## Commands

```bash
npm run install:all      # install root + server + client deps
npm run dev              # server :5000 + client :5173 (Vite proxies /api to :5000)
npm --prefix client run build   # production build -> client/dist (same as vercel-build)
```

No test or lint setup exists yet (TASKS.md, Task 10 adds it). Until then, verify every change with `npm --prefix client run build` and by running the affected tool in the browser.

## Layout

```
api/index.js                 Vercel function entry (imports server/app.js)
server/app.js                Express app: cors, helmet, rate limit, /api router, error handler
server/index.js              Local dev only: dotenv + app.listen
server/routes/index.js       Mounts every route module under /api/<prefix>
server/routes/*.js           One file per tool
server/services/             aiService (Gemini), translationService
server/config/               prompts.js (all AI prompts), languages.js
server/middleware/upload.js  multer: memoryStorage on Vercel, disk storage locally
client/src/App.jsx           Routes
client/src/components/layout Sidebar, SidebarItem, TopBar
client/src/components/ui     Button, Card, FileDropzone
client/src/pages/*.jsx       One page per tool
client/src/utils/api.js      axios instance (baseURL /api) + per-tool API helpers
```

## Adding or changing a tool

1. Server route in `server/routes/<tool>.js`, mounted in `server/routes/index.js`.
2. API helper in `client/src/utils/api.js` (pages call helpers, not raw URLs).
3. Page in `client/src/pages/<Tool>.jsx`, route in `App.jsx`, entry in `Sidebar.jsx` and a card in `Home.jsx`.
4. If the tool can run fully in the browser, do it client-side and skip the server route (see the Vercel rules).

## Rules that always apply

- **Vercel first.** Every feature must work on a Vercel Hobby serverless function. See [.claude/rules/vercel.md](.claude/rules/vercel.md).
- **API response shape** is always `{ success, data, error }`, with a correct HTTP status code.
- **Secrets** come only from environment variables. Never commit `.env`, never print keys in logs or responses, never put real keys in examples or docs.
- **AI prompts** live in `server/config/prompts.js`, not inline in routes.
- **Do not commit** logs (`*.log`), `uploads/*`, `client/dist`, or new binary blobs in `server/`.
- Keep changes scoped to the task you are working on. Do not reformat unrelated files.
- Commit only when asked. Use a feature branch, not `main`.

Area-specific rules are in `.claude/rules/` (server, client UI, Vercel).
