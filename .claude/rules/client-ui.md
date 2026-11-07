---
paths:
  - "client/**"
---

# Client and UI rules

## Code

- Pages call helpers from `src/utils/api.js`; no hard-coded URLs and no raw `axios`/`fetch` to our API inside pages.
- Each page handles three states explicitly: loading (button disabled + spinner), error (readable message from `response.data.error`), and empty/initial.
- If a tool can run in the browser (regex, QR, diff, text tools, hashing, base64, OCR via tesseract.js, color picking), run it in the browser. Only call the server for AI (Gemini), the API-tester proxy, and image work the browser cannot do well.
- Large pages (more than ~400 lines) should be split into components under `src/components/<tool>/`.
- Lazy-load pages in `App.jsx` with `React.lazy` + `Suspense` so the first load stays small.
- Never put secrets or API keys in client code or `VITE_*` variables.

## Design system

- Use the shared primitives in `src/components/ui/` (Button, Card, Input/Textarea, Select, Tabs, Badge, Toast, PageHeader, FileDropzone). Add a primitive instead of repeating long Tailwind class strings across pages.
- Colors come from the Tailwind theme tokens in `tailwind.config.js` (brand = indigo scale, neutral = gray/slate). No random hex colors in pages.
- Every element must look right in both light and dark mode (`dark:` variants), and pass WCAG AA contrast.
- Spacing scale: page padding `p-4 md:p-8`, card padding `p-5 md:p-6`, gaps of 4/6/8. Radius: `rounded-xl` for cards, `rounded-lg` for inputs and buttons.
- Every page starts with the same `PageHeader` (icon, title, one-line description).
- Must work at 360px phone width with no horizontal scroll. Test the mobile sidebar.
- Interactive elements need visible focus rings, `aria-label` on icon-only buttons, and keyboard access.
- Motion is subtle (150 to 200 ms transitions) and respects `prefers-reduced-motion`.
