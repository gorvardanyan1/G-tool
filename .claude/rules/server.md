---
paths:
  - "server/**"
  - "api/**"
---

# Server rules (Express API)

- ESM only (`import`/`export`). Node 18+ built-in `fetch` is available.
- Every route returns `{ success: boolean, data: any | null, error: string | null }`. Use 400 for bad input, 404 for missing resources, 413 for too-large payloads, 429 for rate limits, 502 for upstream (Gemini or proxy) failures, and 500 only for real bugs.
- Validate every input from `req.body` / `req.query`: type, length and allowed values (allowlists, not blocklists). Reject before doing work.
- Do not return raw `error.message` from libraries or upstream APIs to the client in production; log it and send a short safe message.
- Wrap async handlers so rejected promises reach the error middleware (a small `asyncHandler` helper), instead of copy-pasting try/catch.
- All Gemini calls go through `services/aiService.js`. All prompt text lives in `config/prompts.js`. Treat user text inside prompts as data: delimit it and never let it change the output format instructions. Parse AI output defensively (`generateJSON`), and set a timeout on the fetch.
- Uploads go through `middleware/upload.js`. Use `req.file.buffer` on Vercel, and never assume `req.file.path` exists.
- Outbound requests to user-supplied URLs (API tester) must block private, loopback, link-local and metadata addresses (SSRF), enforce a timeout and a response-size cap, and allow only http/https.
- Never run user-supplied regex on the server without a time limit. Prefer to run it in the browser.
- New route module: add it in `routes/index.js`. A route file that exists but is not mounted is a bug.
- Keep server dependencies in sync between `server/package.json` and the root `package.json` (Vercel installs from the root).
