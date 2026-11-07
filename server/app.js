import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import routes from './routes/index.js';

const app = express();

app.disable('x-powered-by');

const isVercel = Boolean(process.env.VERCEL);

// Trust the first proxy hop on Vercel so req.ip (and rate limiting) sees the real client IP.
const TRUST_PROXY = process.env.TRUST_PROXY || (isVercel ? '1' : '');
if (TRUST_PROXY) {
  app.set('trust proxy', /^\d+$/.test(TRUST_PROXY) ? Number(TRUST_PROXY) : TRUST_PROXY);
}

// Allowed origins: CLIENT_URL, CLIENT_URLS (comma-separated, "*" wildcards allowed,
// e.g. https://g-tool-*.vercel.app) and this deployment's own Vercel URLs.
const escapeRegex = (s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
const toOriginMatcher = (pattern) =>
  new RegExp(`^${pattern.split('*').map(escapeRegex).join('[a-z0-9-]+')}$`, 'i');

const vercelOrigins = [
  process.env.VERCEL_URL,
  process.env.VERCEL_BRANCH_URL,
  process.env.VERCEL_PROJECT_PRODUCTION_URL
]
  .filter(Boolean)
  .map((host) => `https://${host}`);

const originPatterns = [
  process.env.CLIENT_URL || 'http://localhost:5173',
  ...(process.env.CLIENT_URLS || '').split(','),
  ...vercelOrigins
]
  .map((s) => s.trim().replace(/\/+$/, ''))
  .filter(Boolean);
const originMatchers = Array.from(new Set(originPatterns)).map(toOriginMatcher);

const isSameOrigin = (req, origin) => {
  try {
    return new URL(origin).host === req.get('host');
  } catch {
    return false;
  }
};

app.use(
  cors((req, callback) => {
    const origin = req.get('origin');
    const allowed =
      !origin || isSameOrigin(req, origin) || originMatchers.some((re) => re.test(origin));
    // A rejected origin gets no CORS headers (the browser blocks it), not a 500.
    callback(null, {
      origin: allowed,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    });
  })
);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10);
const max = parseInt(process.env.RATE_LIMIT_MAX || '120', 10);
app.use(
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false
  })
);

app.use(express.json({ limit: '200kb' }));
app.use(express.urlencoded({ extended: true, limit: '200kb' }));

app.use('/api', routes);

app.get('/health', (req, res) => {
  res.json({ success: true, message: 'Server is running' });
});

app.use((req, res) => {
  res.status(404).json({ success: false, data: null, error: 'Endpoint not found' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  const isProd = process.env.NODE_ENV === 'production';
  res.status(500).json({
    success: false,
    data: null,
    error: isProd ? 'Internal server error' : err.message || 'Internal server error'
  });
});

export default app;
