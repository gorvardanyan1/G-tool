import express from 'express';
import path from 'path';
import fs from 'fs';
import { createWorker } from 'tesseract.js';
import upload from '../middleware/upload.js';

const router = express.Router();

// POST /api/ocr - Extract text from image
router.post('/', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      data: null,
      error: 'No image file uploaded'
    });
  }

  const lang = req.body.lang || 'eng';
  const start = Date.now();

  let tempPath = null;
  if (!req.file.path && req.file.buffer) {
    tempPath = path.join(process.env.TMPDIR || '/tmp', `ocr-${Date.now()}-${Math.random().toString(16).slice(2)}.png`);
    await fs.promises.writeFile(tempPath, req.file.buffer);
  }

  const imagePath = req.file.path || tempPath;

  let worker;
  try {
    // Create a fresh Tesseract worker for this request
    worker = await createWorker(lang, 1, {
      logger: () => {},
      errorHandler: () => {},
    });

    const { data } = await worker.recognize(imagePath);

    // Cleanup uploaded file after OCR
    if (req.file.path) fs.unlink(req.file.path, () => {});
    if (tempPath) fs.unlink(tempPath, () => {});

    return res.json({
      success: true,
      data: {
        text: data.text.trim(),
        confidence: Math.round(data.confidence),
        lang,
        processingTime: `${((Date.now() - start) / 1000).toFixed(2)}s`
      },
      error: null
    });

  } catch (err) {
    // Cleanup on error too
    if (req.file?.path) fs.unlink(req.file.path, () => {});
    if (tempPath) fs.unlink(tempPath, () => {});
    return res.status(500).json({
      success: false,
      data: null,
      error: err.message
    });

  } finally {
    if (worker) await worker.terminate();
  }
});

// GET /api/ocr/languages - Supported languages list
router.get('/languages', (req, res) => {
  res.json({
    success: true,
    data: {
      languages: [
        { code: 'eng', name: 'English' },
        { code: 'ara', name: 'Arabic' },
        { code: 'fra', name: 'French' },
        { code: 'deu', name: 'German' },
        { code: 'spa', name: 'Spanish' },
        { code: 'ita', name: 'Italian' },
        { code: 'por', name: 'Portuguese' },
        { code: 'rus', name: 'Russian' },
        { code: 'chi_sim', name: 'Chinese (Simplified)' },
        { code: 'chi_tra', name: 'Chinese (Traditional)' },
        { code: 'jpn', name: 'Japanese' },
        { code: 'kor', name: 'Korean' },
        { code: 'tur', name: 'Turkish' },
        { code: 'hye', name: 'Armenian' },
      ]
    },
    error: null
  });
});

export default router;
