# ToolBox

A full-stack multi-tool web application with a Canva-style sidebar layout.

## Tech Stack

- **Backend**: Express.js (port 5000)
- **Frontend**: React 18 + Vite + Tailwind CSS v3 + React Router v6
- **Icons**: lucide-react
- **HTTP Client**: axios

## Quick Start

```bash
# Install dependencies for all packages
npm run install:all

# Start both server and client
npm run dev
```

The app will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

## Project Structure

```
toolbox/
├── server/          # Express backend
│   ├── routes/      # API routes
│   └── middleware/  # File upload, etc.
├── client/          # React frontend
│   ├── src/components/
│   ├── src/pages/
│   └── src/context/
└── uploads/         # File uploads (gitignored)
```

## Available Tools

1. **Translate** - Text translation service
2. **Image Converter** - Convert images between formats
3. **Text Tools** - Text manipulation utilities

## Adding New Tools

1. Add sidebar item in `client/src/components/layout/Sidebar.jsx`
2. Create route handler in `server/routes/[tool].js`
3. Create page component in `client/src/pages/[ToolName].jsx`
4. Add route in `client/src/App.jsx`
5. Update `client/src/pages/Home.jsx` with tool card

## Environment Variables

Create a `.env` file in the root:

```
PORT=5000
CLIENT_URL=http://localhost:5173
```
