# G-tool: Work Plan

Goal: every tool works correctly, the UI looks polished and consistent, and the whole app runs on **Vercel Free (Hobby)**.

Rules for doing these tasks: [CLAUDE.md](CLAUDE.md) and [.claude/rules/](.claude/rules/).
Work in order. Phase 1 makes the app correct and deployable; Phase 2 makes it polished. Each task is one branch / one PR.

---

## Phase 1: Make it work (logic, security, Vercel)

### Task 1. Security cleanup and repo hygiene (do first)
The Gemini API key was committed in git history (commit `e972ca4` shows `.env` with `GEMINI_API_KEY=AIza...`). Deleting the file does not remove it from history.
- [ ] **Rotate the Gemini API key** in Google AI Studio and set the new one only in Vercel env vars.
- [x] Add `.env.example` with variable names only: `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_FALLBACK_MODEL`, `CLIENT_URL`, `CLIENT_URLS`, `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`, `TRUST_PROXY`.
- [x] Remove tracked `client.log` and `server.log`; add `*.log`, `logs/`, `.claude/settings.local.json` to `.gitignore`.
- [x] Send the Gemini key in the `x-goog-api-key` header instead of the URL query string, so it never appears in logged URLs.
- [x] Rewrite `README.md`: real tool list, setup, env vars, Vercel deploy steps.

**Done when:** the new key works, the old key is revoked, and `git ls-files` shows no logs or secrets.

### Task 2. Fix the Vercel deployment config
Right now `vercel.json` only has rewrites, and the SPA rewrite points at `/client/dist/index.html`, which is not how Vercel serves build output.
- [x] Set `buildCommand` (`npm --prefix client run build`), `outputDirectory` (`client/dist`) and `installCommand` in `vercel.json`.
- [x] Rewrites: `/api/(.*)` to the function, and everything else that is not a file to `/index.html` (SPA fallback).
- [x] Add `functions["api/index.js"]` with `maxDuration` 60 s (`memory` is not configurable on Hobby; no `includeFiles` needed since OCR moves to the browser in Task 5).
- [x] Make root `package.json` the single source of server deps (Vercel installs from the root). Remove deps nobody uses (`qrcode` removed). `systeminformation` stays until Task 6 drops the server diagnostics.
- [x] Set `engines.node` (22.x; 20.x is end-of-life) and `"type": "module"` where needed so `api/index.js` imports `server/app.js` cleanly.
- [x] CORS: allow same-origin and `*.vercel.app` preview URLs through `CLIENT_URLS`; do not throw a 500 for a rejected origin.
- [x] Use `TRUST_PROXY=1` on Vercel so rate limiting sees the real client IP.

**Done when:** `vercel deploy` (preview) builds, `/` loads, a deep link like `/regex` loads after refresh, and `/api/health` returns `{ success: true }`.

### Task 3. Shared server foundation (validation, errors, AI service)
- [ ] Add an `asyncHandler` and a small `sendOk / sendError` helper, and use them in every route (removes the repeated try/catch blocks).
- [ ] Error middleware: map multer errors (`LIMIT_FILE_SIZE` to 413, bad type to 400), and hide internal messages in production.
- [ ] Lower upload `fileSize` to about 4 MB (Vercel body limit is 4.5 MB) and show that limit in the UI.
- [ ] `aiService`: add a request timeout (`AbortController`), map Gemini 429/503 to a clean 429/502 for the client, delete the unused `streamContent`, and move every inline prompt (SQL AI etc.) into `config/prompts.js`.
- [ ] Add a stricter rate limit for the AI routes (`/translate`, `/sql-ai`, `/color/generate-ai`, `/regex/generate`) to protect the free Gemini quota.
- [ ] Validate input length on every text endpoint (for example 5,000 characters max for AI prompts).

**Done when:** every route uses the helpers, and bad input, oversize files and Gemini errors each produce a clear message in the UI.

### Task 4. Rebuild the Image Editor to be stateless (it is broken now)
Two bugs: `routes/imageEditor.js` is **never mounted** in `routes/index.js`, so every `/api/image-editor/*` call returns 404. It also keeps images in an in-memory `Map` and reads `file.path` from disk, which cannot work on Vercel (stateless instances, memory uploads, no `path`).
- [ ] Move editing to the browser: crop, rotate, flip, resize, brightness/contrast, filters, annotations and merge with `<canvas>`. Undo/redo becomes a client-side history stack.
- [ ] Keep at most one optional stateless server endpoint (`POST /api/image-editor/export`: image + operations in, final file out) only for what canvas cannot do (for example AVIF/TIFF output with sharp).
- [ ] Remove the `activeImages` Map and all disk reads and writes.
- [ ] Split the 1,260-line `ImageEditor.jsx` into components (toolbar, canvas, layers/history panel).

**Done when:** you can upload, edit, undo/redo and download on a Vercel preview, with no 404s and no server state.

### Task 5. Make OCR, Image Converter and Color Palette work on Vercel
- [ ] **OCR:** run tesseract.js in the browser (Web Worker). Remove the server route and the ~19 MB `server/*.traineddata` files from the repo. Show recognition progress. The language list must match what can actually load (it currently lists 14 languages, but only 7 data files exist).
- [ ] **Image Converter:** handle buffers only (no `fs` on Vercel). Fix SVG input (read from `req.file.buffer`, sanitize properly, not a substring check). Return the file as a binary download, not base64 JSON. Do resizing and compression in the browser before upload when the file is large. Remove `svg` and `gif` from output formats unless they truly work.
- [ ] **Color Palette:** do color extraction fully in the browser (canvas pixel sampling + k-means or median-cut). Keep only `generate-ai` on the server, and validate the AI's JSON (hex format, count).

**Done when:** all three tools work on a Vercel preview with a 3 to 4 MB image, and the server bundle has no traineddata files.

### Task 6. Fix the remaining tools' logic
- [ ] **API Tester proxy:** block SSRF (private, loopback, link-local and `169.254.169.254` addresses, checked after DNS resolution and on every redirect), allow http/https only, add a 10 s timeout and about 2 MB response cap, and limit the methods.
- [ ] **Regex Tester:** run matching in the browser (in a Web Worker with a timeout, to stop catastrophic patterns from freezing the page). Remove the server `/regex/test` endpoint, which can be hung by a ReDoS pattern. Keep `/regex/generate` (AI). Show groups, named groups and match highlighting.
- [ ] **Device Diagnostics:** the server `/device-diagnostics` uses `systeminformation`, which reports the Vercel machine, not the user's. Delete that route and use browser APIs only (`navigator`, screen, WebGL renderer, battery, network info, storage estimate). Keep `/health` and `/health/download` for the speed test.
- [ ] **Device Tester logs:** stored in a module-level array and a JSON file, which are lost on Vercel. Keep results in `localStorage` (or drop logging), and remove `/device-test/log` and `/device-test/stats`.
- [ ] **Code tools:** move pure functions (base64, URL, hashing via Web Crypto, JSON format, YAML/XML conversion) to the browser where possible. Fix the Caesar cipher for negative shifts. Make the JWT page warn that secrets are sent to the server, or do JWT in the browser.
- [ ] **Translate / SQL AI:** handle the "auto" source language, add a copy button and error states, and make SQL AI reject non-SELECT output.

**Done when:** each tool has been run by hand with normal, empty and bad input, and behaves correctly on Vercel.

---

## Phase 2: Make it beautiful and solid

### Task 7. Design system and shared UI components
- [ ] Define tokens in `tailwind.config.js`: a brand color scale (indigo), surface/border/muted colors for light and dark, radius, shadows, and font sizes. Self-host Inter (or use `font-display: swap`) instead of blocking on Google Fonts.
- [ ] Build or extend primitives in `components/ui/`: `Button` (variants and sizes, loading state), `Card`, `Input`, `Textarea`, `Select`, `Tabs`, `Badge`, `Toast`, `CopyButton`, `PageHeader`, `EmptyState`, `Spinner`.
- [ ] Add a global toast system for success and error messages (copy done, upload failed, and so on).
- [ ] Add focus-visible rings, `prefers-reduced-motion` support and AA contrast in both themes.

**Done when:** primitives exist, are documented in a short comment block each, and at least two pages use them.

### Task 8. Restyle every page and the layout
- [ ] Sidebar: group tools (AI, Image, Text & Code, Device, Dev tools), show tooltips, mark the active item clearly, add a smooth mobile drawer, and put the theme toggle in a fixed spot.
- [ ] Home: a hero with a search/filter over tools, tool cards grouped by category with icon, description and an "AI" badge where relevant.
- [ ] Apply `PageHeader` and the shared primitives to all 15 pages, so every page has the same spacing, card style, inputs and buttons.
- [ ] Two-column input/output layout on desktop that stacks on mobile; check 360 px width on every page.
- [ ] Split oversized pages (`DeviceDiagnostics.jsx` 1,896 lines, `ImageEditor.jsx`, `ColorPalette.jsx`) into components while restyling.
- [ ] Make the 404 page and the loading states match the new design.

**Done when:** every page looks consistent in light and dark mode on desktop and phone, with no horizontal scroll.

### Task 9. Performance and UX polish
- [ ] Lazy-load every page with `React.lazy` + `Suspense`, and load heavy libraries (tesseract.js, diff, qrcode) only on their pages. Target: first-load JS under about 200 KB gzip.
- [ ] Remember the last inputs and settings per tool in `localStorage` (for example the translate languages and the SQL dialect).
- [ ] Add keyboard shortcuts: `Ctrl/Cmd+Enter` to run, `Ctrl/Cmd+K` for tool search.
- [ ] Set `<title>` and meta description per page, add an Open Graph image, and update the favicon and app name to "G-tool" everywhere.
- [ ] Add Vercel cache headers for hashed static assets (`/assets/*`, immutable).

**Done when:** a Lighthouse run on the Vercel preview scores 90+ for Performance, Accessibility and Best Practices.

### Task 10. Tests, linting and CI
- [ ] Add ESLint + Prettier for client and server, with `npm run lint` scripts.
- [ ] Add Vitest + Supertest server tests: response shape, validation errors, upload size limit, SSRF block list, and an aiService with a mocked `fetch`.
- [ ] Add client unit tests for pure logic moved to the browser (regex worker, color extraction, code tools).
- [ ] Add a GitHub Action: install, lint, test, build on every PR. Vercel creates preview deployments automatically.
- [ ] Do a final production deploy, then run a smoke test checklist (every tool once) and record the result in this file.

**Done when:** CI is green on `main`, and the production URL passes the smoke checklist.

---

## Progress

| # | Task | Phase | Status |
|---|------|-------|--------|
| 1 | Security cleanup and repo hygiene | 1 | ◐ (key rotation pending) |
| 2 | Vercel deployment config | 1 | ◐ (needs a real preview deploy check) |
| 3 | Shared server foundation | 1 | ☐ |
| 4 | Stateless Image Editor | 1 | ☐ |
| 5 | OCR, Converter, Color on Vercel | 1 | ☐ |
| 6 | Fix remaining tools' logic | 1 | ☐ |
| 7 | Design system and UI components | 2 | ☐ |
| 8 | Restyle every page and layout | 2 | ☐ |
| 9 | Performance and UX polish | 2 | ☐ |
| 10 | Tests, linting and CI | 2 | ☐ |
