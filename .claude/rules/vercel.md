# Vercel Free (Hobby) deployment rules

The production target is one Vercel serverless function (`api/index.js`) plus the static SPA from `client/dist`. Design every feature around these limits:

| Limit | What it means for this code |
|---|---|
| Request/response body **4.5 MB** max | Uploads must be capped below ~4 MB (multer `limits.fileSize`). Large results go back as a compressed image or as a download produced in the browser, not a giant base64 JSON. Compress or resize images in the browser before upload. |
| Function execution time is limited (set `maxDuration` in `vercel.json`, and keep requests well under it) | No long jobs on the server. Heavy work (OCR, big image edits) runs in the browser. |
| **Stateless, multi-instance** | No in-memory `Map`s or module-level arrays holding user state between requests. Two requests can hit different instances. If a tool needs state, keep it in the client and send it with each request. |
| **Read-only filesystem** except `/tmp` | Never write to `uploads/` or `logs/` on Vercel. Use buffers (`multer.memoryStorage()`); use `/tmp` only for a temp file deleted in the same request. |
| Function bundle size limit | Do not bundle large data files (e.g. `*.traineddata`) or packages the server does not use. Keep server deps in one place. |
| Cold starts | Do not do expensive work at module load. Import heavy libraries only in the routes that use them. |
| No access to the visitor's machine | Server-side `systeminformation` reports the Vercel host, not the user. Device diagnostics must come from browser APIs. |

Checklist before a change is done:

- [ ] Works when `process.env.VERCEL` is set (memory storage, no disk writes outside `/tmp`).
- [ ] No request or response body near 4.5 MB.
- [ ] No state kept between requests on the server.
- [ ] `npm --prefix client run build` passes.
- [ ] New env vars are documented in `README.md` and `.env.example` (names only, no values).
