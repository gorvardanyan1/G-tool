import express from 'express';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import upload from '../middleware/upload.js';

const router = express.Router();

function validateQuality(value) {
  const q = parseInt(value, 10);
  if (Number.isNaN(q)) return 100;
  return Math.max(1, Math.min(100, q));
}

function validateSvgContent(svgText) {
  const s = svgText.toLowerCase();
  const riskyPatterns = [
    '<script',
    'javascript:',
    'onload=',
    'onerror=',
    '<foreignobject'
  ];
  return !riskyPatterns.some((p) => s.includes(p));
}

// POST /api/image/convert
router.post('/convert', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'No image file provided'
      });
    }

    const { format = 'png', quality = 100 } = req.body;
    const inputPath = req.file.path;
    const outputFilename = `converted-${Date.now()}.${format}`;

    const inputExt = path.extname(req.file.originalname || '').toLowerCase();
    if (req.file.mimetype === 'image/svg+xml' || inputExt === '.svg') {
      const svgText = fs.readFileSync(inputPath, 'utf8');
      if (!validateSvgContent(svgText)) {
        fs.unlinkSync(inputPath);
        return res.status(400).json({
          success: false,
          data: null,
          error: 'Unsafe SVG content detected'
        });
      }
    }

    // Convert image using sharp
    let pipeline = sharp(inputPath);

    const qualityValue = validateQuality(quality);

    const allowedFormats = new Set(['jpeg', 'jpg', 'png', 'webp', 'gif', 'svg']);
    const normalizedFormat = String(format).toLowerCase();
    if (!allowedFormats.has(normalizedFormat)) {
      fs.unlinkSync(inputPath);
      return res.status(400).json({
        success: false,
        data: null,
        error: 'Unsupported output format'
      });
    }

    switch (normalizedFormat) {
      case 'jpeg':
      case 'jpg':
        pipeline = pipeline.jpeg({
          quality: qualityValue,
          chromaSubsampling: qualityValue >= 90 ? '4:4:4' : '4:2:0',
          mozjpeg: true
        });
        break;
      case 'png':
        pipeline = pipeline.png({
          compressionLevel: 9,
          adaptiveFiltering: true,
          palette: qualityValue < 100
        });
        break;
      case 'webp':
        pipeline = pipeline.webp({
          quality: qualityValue,
          effort: 6,
          lossless: qualityValue === 100
        });
        break;
      case 'gif':
        pipeline = pipeline.gif({
          effort: qualityValue === 100 ? 10 : 1
        });
        break;
      default:
        pipeline = pipeline.png({
          compressionLevel: 9,
          adaptiveFiltering: true
        });
    }

    // Convert to buffer instead of file (no storage needed)
    const outputBuffer = await pipeline.toBuffer();

    // Get image info from buffer
    const metadata = await sharp(outputBuffer).metadata();

    // Clean up original uploaded file
    fs.unlinkSync(inputPath);

    // Convert to base64 for direct transfer
    const base64Data = outputBuffer.toString('base64');
    const mimeForDataUrl = normalizedFormat === 'jpg' ? 'jpeg' : normalizedFormat;
    const dataUrl = `data:image/${mimeForDataUrl};base64,${base64Data}`;

    res.json({
      success: true,
      data: {
        originalName: req.file.originalname,
        convertedName: outputFilename,
        format: normalizedFormat,
        width: metadata.width,
        height: metadata.height,
        size: outputBuffer.length,
        dataUrl: dataUrl
      },
      error: null
    });
  } catch (error) {
    // Clean up files on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      data: null,
      error: error.message
    });
  }
});

// POST /api/image/resize
router.post('/resize', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'No image file provided'
      });
    }

    const { width, height, maintainAspect = 'true' } = req.body;
    const inputPath = req.file.path;
    const ext = path.extname(req.file.originalname) || '.png';
    const outputFilename = `resized-${Date.now()}${ext}`;

    const inputExt = path.extname(req.file.originalname || '').toLowerCase();
    if (req.file.mimetype === 'image/svg+xml' || inputExt === '.svg') {
      const svgText = fs.readFileSync(inputPath, 'utf8');
      if (!validateSvgContent(svgText)) {
        fs.unlinkSync(inputPath);
        return res.status(400).json({
          success: false,
          data: null,
          error: 'Unsafe SVG content detected'
        });
      }
    }

    let pipeline = sharp(inputPath);

    const resizeOptions = {};
    if (width) resizeOptions.width = parseInt(width);
    if (height) resizeOptions.height = parseInt(height);
    if (maintainAspect === 'true') {
      resizeOptions.fit = 'inside';
    }

    if (Object.keys(resizeOptions).length > 0) {
      pipeline = pipeline.resize(resizeOptions);
    }

    // Convert to buffer instead of file
    const outputBuffer = await pipeline.toBuffer();

    const metadata = await sharp(outputBuffer).metadata();
    fs.unlinkSync(inputPath);

    // Convert to base64 for direct transfer
    const format = metadata.format || 'png';
    const base64Data = outputBuffer.toString('base64');
    const dataUrl = `data:image/${format};base64,${base64Data}`;

    res.json({
      success: true,
      data: {
        originalName: req.file.originalname,
        resizedName: outputFilename,
        width: metadata.width,
        height: metadata.height,
        size: outputBuffer.length,
        dataUrl: dataUrl
      },
      error: null
    });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      data: null,
      error: error.message
    });
  }
});

export default router;
