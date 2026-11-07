# G-tool

A collection of everyday developer and media tools in one web app: React frontend, Express API, deployed on Vercel.

## Tools

| Tool | Route | Runs on |
|---|---|---|
| Translate (AI, word or natural mode) | `/translate` | Server (Gemini) |
| Image Converter (format, quality, resize) | `/image` | Server (sharp) |
| Image Editor | `/image-editor` | Being rebuilt, see TASKS.md Task 4 |
| Text Tools (count, transform, base64) | `/text` | Server |
| Code Diff | `/code-diff` | Browser |
| Code Tools (encrypt, hash, JWT, JSON, serialize, encode) | `/code` | Server |
| Device Tester (camera, microphone) | `/device-tester` | Browser |
| Device Diagnostics (system info, network speed) | `/device-diagnostics` | Browser + `/api/health` |
| SQL AI (natural language to SQL) | `/sql-ai` | Server (Gemini) |
| OCR (text from images) | `/ocr` | Server (tesseract.js) |
| QR Code Generator | `/qr` | Browser |
| API Tester | `/api-tester` | Server proxy |
| Color Palette (pick from image, AI palette) | `/color` | Server (sharp, Gemini) |
| Regex Tester (test, AI generate) | `/regex` | Server (Gemini) |

## Tech stack

- **Client:** React 18, Vite 5, Tailwind CSS 3, React Router 6, lucide-react, axios
- **Server:** Express 4 (ESM), sharp, tesseract.js, multer, helmet, express-rate-limit
- **AI:** Google Gemini API
- **Hosting:** Vercel (static SPA + one serverless function at `api/index.js`)

## Local setup

Requires Node.js 22.

```bash
npm run install:all     # installs root (server) and client dependencies
cp .env.example .env    # then fill in GEMINI_API_KEY
npm run dev             # API on http://localhost:5000, app on http://localhost:5173
```

Vite proxies `/api` to the local server, so the client always calls relative `/api/...` URLs.

## Environment variables

See [.env.example](.env.example) for the full list.

| Name | Required | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | Yes, for AI tools | Google Gemini API key |
| `GEMINI_MODEL` | No | Default `gemini-2.5-flash` |
| `GEMINI_FALLBACK_MODEL` | No | Model to try when the main one is overloaded |
| `CLIENT_URL`, `CLIENT_URLS` | No | Extra allowed CORS origins (`*` wildcard allowed, e.g. `https://g-tool-*.vercel.app`). Same-origin is always allowed. |
| `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX` | No | API rate limit (default 120 requests per minute) |
| `TRUST_PROXY` | No | Proxy hops to trust for the client IP. Defaults to `1` on Vercel |

Never commit `.env`. Keys belong only in your local `.env` and in Vercel's environment variables.

## Deploy to Vercel

1. Import the GitHub repo into Vercel. Leave the framework preset, build and output settings on their defaults: `vercel.json` sets them.
2. In **Project Settings → General**, set Node.js version to **22.x** (also pinned in `package.json` `engines`).
3. Add `GEMINI_API_KEY` (and any other variables above) in **Project Settings → Environment Variables**.
4. Deploy, then check: `/` loads, a deep link such as `/regex` loads after a refresh, and `/api/health` returns `{"success":true,...}`.

How it is wired (`vercel.json`): `installCommand` installs root and client deps, `buildCommand` builds `client/` into `client/dist` (served as static files), `/api/*` is rewritten to the `api/index.js` function (the Express app, `maxDuration` 60 s), and every other path falls back to `index.html` for client-side routing.

Vercel Free (Hobby) limits apply: request bodies up to 4.5 MB, no persistent disk, and no server state between requests. See [.claude/rules/vercel.md](.claude/rules/vercel.md). 

## Project structure

```
api/index.js           Vercel function entry (re-exports server/app.js)
package.json           Server dependencies and all scripts (single source for Vercel)
server/app.js          Express app (CORS, helmet, rate limit, routes, errors)
server/routes/         One file per tool, mounted in routes/index.js
server/services/       Gemini AI service, translation service
server/config/         AI prompts, language list
client/src/pages/      One page per tool
client/src/components/ Layout (sidebar) and shared UI
client/src/utils/api.js  API client helpers
```

## Adding a tool

1. Add the server route in `server/routes/<tool>.js` and mount it in `server/routes/index.js` (skip this if the tool runs in the browser).
2. Add an API helper in `client/src/utils/api.js`.
3. Add the page in `client/src/pages/`, the route in `App.jsx`, the sidebar entry and a Home card.

## Roadmap

See [TASKS.md](TASKS.md) for the phased work plan.
