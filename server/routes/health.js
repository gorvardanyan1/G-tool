import express from 'express';

const router = express.Router();

router.get('/', (req, res) => {
  res.json({ success: true, data: { now: Date.now() }, error: null });
});

router.get('/download', (req, res) => {
  const size = Math.min(parseInt(req.query.size || '1000000', 10), 5000000);
  const buffer = Buffer.alloc(size, 'a');

  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Length', buffer.length);
  res.status(200).send(buffer);
});

export default router;
