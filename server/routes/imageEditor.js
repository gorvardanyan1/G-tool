import express from 'express';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import upload from '../middleware/upload.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsDir = path.join(__dirname, '..', '..', 'uploads');

const activeImages = new Map();

async function bufferToPngDataUrl(buffer) {
  const base64 = buffer.toString('base64');
  return `data:image/png;base64,${base64}`;
}

async function makePreviewDataUrl(inputPath) {
  const previewBuffer = await sharp(inputPath)
    .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
    .png({ compressionLevel: 9 })
    .toBuffer();
  return bufferToPngDataUrl(previewBuffer);
}

async function getCurrentImageDataUrl(imageData) {
  const buffer = await fs.promises.readFile(imageData.path);
  const pngBuffer = await sharp(buffer).png({ compressionLevel: 9 }).toBuffer();
  return bufferToPngDataUrl(pngBuffer);
}

// POST /api/image-editor/upload - Upload multiple images
router.post('/upload', upload.array('images', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'No images uploaded'
      });

    }

    const uploadedImages = await Promise.all(
      req.files.map(async (file, index) => {
        const id = `img_${Date.now()}_${index}`;
        const metadata = await sharp(file.path).metadata();
        const dataUrl = await makePreviewDataUrl(file.path);
        
        activeImages.set(id, {
          path: file.path,
          originalPath: file.path,
          filename: file.originalname,
          width: metadata.width,
          height: metadata.height,
          format: metadata.format,
          versions: [{ path: file.path, width: metadata.width, height: metadata.height }],
          versionIndex: 0
        });

        return {
          id,
          filename: file.originalname,
          width: metadata.width,
          height: metadata.height,
          format: metadata.format,
          dataUrl
        };
      })
    );

    res.json({
      success: true,
      data: { images: uploadedImages },
      error: null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      data: null,
      error: error.message
    });
  }
});

// POST /api/image-editor/undo
router.post('/undo', async (req, res) => {
  try {
    const { imageId } = req.body;
    if (!activeImages.has(imageId)) {
      return res.status(404).json({ success: false, data: null, error: 'Image not found' });
    }

    const imageData = activeImages.get(imageId);
    const idx = imageData.versionIndex ?? 0;
    if (!imageData.versions || idx <= 0) {
      return res.json({
        success: true,
        data: {
          imageId,
          dataUrl: await getCurrentImageDataUrl(imageData),
          width: imageData.width,
          height: imageData.height,
          versionIndex: idx,
          versionsLength: imageData.versions?.length || 1
        },
        error: null
      });
    }

    imageData.versionIndex = idx - 1;
    const v = imageData.versions[imageData.versionIndex];
    imageData.path = v.path;
    imageData.width = v.width;
    imageData.height = v.height;

    return res.json({
      success: true,
      data: {
        imageId,
        dataUrl: await getCurrentImageDataUrl(imageData),
        width: imageData.width,
        height: imageData.height,
        versionIndex: imageData.versionIndex,
        versionsLength: imageData.versions.length
      },
      error: null
    });
  } catch (error) {
    return res.status(500).json({ success: false, data: null, error: error.message });
  }
});

// POST /api/image-editor/redo
router.post('/redo', async (req, res) => {
  try {
    const { imageId } = req.body;
    if (!activeImages.has(imageId)) {
      return res.status(404).json({ success: false, data: null, error: 'Image not found' });
    }

    const imageData = activeImages.get(imageId);
    const idx = imageData.versionIndex ?? 0;
    const len = imageData.versions?.length || 1;
    if (!imageData.versions || idx >= len - 1) {
      return res.json({
        success: true,
        data: {
          imageId,
          dataUrl: await getCurrentImageDataUrl(imageData),
          width: imageData.width,
          height: imageData.height,
          versionIndex: idx,
          versionsLength: len
        },
        error: null
      });
    }

    imageData.versionIndex = idx + 1;
    const v = imageData.versions[imageData.versionIndex];
    imageData.path = v.path;
    imageData.width = v.width;
    imageData.height = v.height;

    return res.json({
      success: true,
      data: {
        imageId,
        dataUrl: await getCurrentImageDataUrl(imageData),
        width: imageData.width,
        height: imageData.height,
        versionIndex: imageData.versionIndex,
        versionsLength: imageData.versions.length
      },
      error: null
    });
  } catch (error) {
    return res.status(500).json({ success: false, data: null, error: error.message });
  }
});

// POST /api/image-editor/process - Apply edits to single image
router.post('/process', async (req, res) => {
  try {
    const { imageId, operations } = req.body;
    
    if (!activeImages.has(imageId)) {
      return res.status(404).json({
        success: false,
        data: null,
        error: 'Image not found'
      });
    }

    const imageData = activeImages.get(imageId);
    let pipeline = sharp(imageData.path);

    // Apply operations in order
    if (operations) {
      // Resize
      if (operations.resize) {
        const { width, height, fit = 'inside' } = operations.resize;
        pipeline = pipeline.resize({
          width: width ? parseInt(width) : undefined,
          height: height ? parseInt(height) : undefined,
          fit,
          withoutEnlargement: false
        });
      }

      // Crop
      if (operations.crop) {
        const { left, top, width, height } = operations.crop;
        pipeline = pipeline.extract({
          left: parseInt(left),
          top: parseInt(top),
          width: parseInt(width),
          height: parseInt(height)
        });
      }

      // Rotate
      if (operations.rotate) {
        pipeline = pipeline.rotate(parseInt(operations.rotate) || 0);
      }

      // Flip
      if (operations.flip) {
        if (operations.flip.horizontal) pipeline = pipeline.flop();
        if (operations.flip.vertical) pipeline = pipeline.flip();
      }

      // Filters & Adjustments
      const modulateOptions = {};
      if (operations.brightness !== undefined) {
        modulateOptions.brightness = (100 + parseInt(operations.brightness)) / 100;
      }
      if (operations.saturation !== undefined) {
        modulateOptions.saturation = parseInt(operations.saturation) / 100;
      }
      if (Object.keys(modulateOptions).length > 0) {
        pipeline = pipeline.modulate(modulateOptions);
      }

      // Contrast (linear adjustment)
      if (operations.contrast !== undefined) {
        const contrast = parseInt(operations.contrast);
        const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
        pipeline = pipeline.linear(factor, -(factor - 1) * 128);
      }

      // Blur
      if (operations.blur) {
        pipeline = pipeline.blur(parseFloat(operations.blur));
      }

      // Sharpen
      if (operations.sharpen) {
        pipeline = pipeline.sharpen({
          sigma: 1,
          flat: 1,
          jagged: 2
        });
      }

      // Grayscale
      if (operations.grayscale) {
        pipeline = pipeline.grayscale();
      }

      // Sepia
      if (operations.sepia) {
        pipeline = pipeline.sepia();
      }

      // Hue rotate
      if (operations.hue) {
        pipeline = pipeline.modulate({
          hue: parseInt(operations.hue, 10) || 0
        });
      }
    }

    // Generate output
    const outputBuffer = await pipeline.toBuffer();
    const metadata = await sharp(outputBuffer).metadata();

    // Update stored image
    const newPath = path.join(uploadsDir, `edited-${imageId}-${Date.now()}.png`);
    await fs.promises.writeFile(newPath, outputBuffer);
    
    // Clean up old temp file
    if (imageData.path !== imageData.originalPath && fs.existsSync(imageData.path)) {
      fs.unlinkSync(imageData.path);
    }
    
    // push version
    const nextVersions = (imageData.versions || []).slice(0, (imageData.versionIndex ?? 0) + 1);
    nextVersions.push({ path: newPath, width: metadata.width, height: metadata.height });
    imageData.versions = nextVersions;
    imageData.versionIndex = nextVersions.length - 1;

    imageData.path = newPath;
    imageData.width = metadata.width;
    imageData.height = metadata.height;

    const dataUrl = await bufferToPngDataUrl(outputBuffer);

    res.json({
      success: true,
      data: {
        imageId,
        width: metadata.width,
        height: metadata.height,
        dataUrl,
        versionIndex: imageData.versionIndex,
        versionsLength: imageData.versions.length
      },
      error: null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      data: null,
      error: error.message
    });
  }
});

// POST /api/image-editor/merge - Merge 2 images
router.post('/merge', async (req, res) => {
  try {
    const { imageId1, imageId2, mode, options = {} } = req.body;
    
    if (!activeImages.has(imageId1) || !activeImages.has(imageId2)) {
      return res.status(404).json({
        success: false,
        data: null,
        error: 'One or both images not found'
      });
    }

    const img1 = activeImages.get(imageId1);
    const img2 = activeImages.get(imageId2);

    const buffer1 = await fs.promises.readFile(img1.path);
    const buffer2 = await fs.promises.readFile(img2.path);
    
    const sharp1 = sharp(buffer1);
    const sharp2 = sharp(buffer2);
    
    const meta1 = await sharp1.metadata();
    const meta2 = await sharp2.metadata();

    let outputBuffer;

    if (mode === 'horizontal' || mode === 'vertical') {
      // Side-by-side collage
      const isHorizontal = mode === 'horizontal';
      const maxWidth = isHorizontal ? meta1.width + meta2.width : Math.max(meta1.width, meta2.width);
      const maxHeight = isHorizontal ? Math.max(meta1.height, meta2.height) : meta1.height + meta2.height;

      // Create background canvas
      const canvas = sharp({
        create: {
          width: maxWidth,
          height: maxHeight,
          channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        }
      });

      // Composite images
      const composite = [
        { input: buffer1, left: 0, top: 0 },
        { 
          input: buffer2, 
          left: isHorizontal ? meta1.width : 0, 
          top: isHorizontal ? 0 : meta1.height 
        }
      ];

      outputBuffer = await canvas.composite(composite).png().toBuffer();

    } else if (mode === 'overlay') {
      // Overlay with blend
      const { opacity = 1, blend = 'over' } = options;
      
      // Resize second image to match first if different sizes
      const resized2 = await sharp2.resize(meta1.width, meta1.height, { fit: 'fill' }).toBuffer();
      
      // Apply opacity to overlay
      const overlayWithOpacity = await sharp(resized2)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      
      // Composite with blend mode
      const blendModes = {
        'over': 'over',
        'multiply': 'multiply',
        'screen': 'screen',
        'overlay': 'overlay'
      };

      outputBuffer = await sharp1
        .composite([{
          input: resized2,
          blend: blendModes[blend] || 'over',
          opacity: parseFloat(opacity)
        }])
        .toBuffer();
    }

    const outputId = `merged_${Date.now()}`;
    const outputPath = path.join(uploadsDir, `${outputId}.png`);
    await fs.promises.writeFile(outputPath, outputBuffer);

    const metadata = await sharp(outputBuffer).metadata();
    
    activeImages.set(outputId, {
      path: outputPath,
      originalPath: outputPath,
      filename: 'merged.png',
      width: metadata.width,
      height: metadata.height,
      format: 'png',
      versions: [{ path: outputPath, width: metadata.width, height: metadata.height }],
      versionIndex: 0
    });

    const dataUrl = await bufferToPngDataUrl(outputBuffer);

    res.json({
      success: true,
      data: {
        imageId: outputId,
        width: metadata.width,
        height: metadata.height,
        dataUrl,
        mode
      },
      error: null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      data: null,
      error: error.message
    });
  }
});

// POST /api/image-editor/annotate - Add text/shapes
router.post('/annotate', async (req, res) => {
  try {
    const { imageId, annotations } = req.body;
    
    if (!activeImages.has(imageId)) {
      return res.status(404).json({
        success: false,
        data: null,
        error: 'Image not found'
      });
    }

    const imageData = activeImages.get(imageId);
    const buffer = await fs.promises.readFile(imageData.path);
    
    // For text/shape annotations, we use SVG overlay approach
    const svgElements = annotations.map(ann => {
      if (ann.type === 'text') {
        const { x, y, text, fontSize = 24, color = '#000000', fontFamily = 'Arial' } = ann;
        const encodedText = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return `<text x="${x}" y="${y}" font-family="${fontFamily}" font-size="${fontSize}" fill="${color}">${encodedText}</text>`;
      } else if (ann.type === 'rect') {
        const { x, y, width, height, stroke = '#000000', strokeWidth = 2, fill = 'none' } = ann;
        return `<rect x="${x}" y="${y}" width="${width}" height="${height}" stroke="${stroke}" stroke-width="${strokeWidth}" fill="${fill}"/>`;
      } else if (ann.type === 'circle') {
        const { x, y, radius, stroke = '#000000', strokeWidth = 2, fill = 'none' } = ann;
        return `<circle cx="${x}" cy="${y}" r="${radius}" stroke="${stroke}" stroke-width="${strokeWidth}" fill="${fill}"/>`;
      } else if (ann.type === 'arrow') {
        const { x1, y1, x2, y2, stroke = '#000000', strokeWidth = 3 } = ann;
        // Simple line arrow (arrowhead can be added with marker)
        return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${strokeWidth}" marker-end="url(#arrowhead)"/>`;
      }
      return '';
    }).join('');

    const svg = `
      <svg width="${imageData.width}" height="${imageData.height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="currentColor"/>
          </marker>
        </defs>
        ${svgElements}
      </svg>
    `;

    const svgBuffer = Buffer.from(svg);
    
    const outputBuffer = await sharp(buffer)
      .composite([{ input: svgBuffer }])
      .toBuffer();

    // Save updated image
    const newPath = path.join(uploadsDir, `annotated-${imageId}-${Date.now()}.png`);
    await fs.promises.writeFile(newPath, outputBuffer);
    
    if (imageData.path !== imageData.originalPath && fs.existsSync(imageData.path)) {
      fs.unlinkSync(imageData.path);
    }
    
    const metadata = await sharp(outputBuffer).metadata();

    const nextVersions = (imageData.versions || []).slice(0, (imageData.versionIndex ?? 0) + 1);
    nextVersions.push({ path: newPath, width: metadata.width, height: metadata.height });
    imageData.versions = nextVersions;
    imageData.versionIndex = nextVersions.length - 1;

    imageData.path = newPath;
    imageData.width = metadata.width;
    imageData.height = metadata.height;

    const dataUrl = await bufferToPngDataUrl(outputBuffer);

    res.json({
      success: true,
      data: {
        imageId,
        width: metadata.width,
        height: metadata.height,
        dataUrl,
        versionIndex: imageData.versionIndex,
        versionsLength: imageData.versions.length
      },
      error: null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      data: null,
      error: error.message
    });
  }
});

// POST /api/image-editor/download - Final export
router.post('/download', async (req, res) => {
  try {
    const { imageId, format = 'png', quality = 100 } = req.body;
    
    if (!activeImages.has(imageId)) {
      return res.status(404).json({
        success: false,
        data: null,
        error: 'Image not found'
      });
    }

    const imageData = activeImages.get(imageId);
    const buffer = await fs.promises.readFile(imageData.path);
    
    let pipeline = sharp(buffer);
    
    switch (format) {
      case 'jpeg':
      case 'jpg':
        pipeline = pipeline.jpeg({ quality: parseInt(quality) });
        break;
      case 'webp':
        pipeline = pipeline.webp({ quality: parseInt(quality) });
        break;
      default:
        pipeline = pipeline.png();
    }

    const outputBuffer = await pipeline.toBuffer();
    const base64 = outputBuffer.toString('base64');

    res.json({
      success: true,
      data: {
        filename: `edited-${imageData.filename}`,
        format,
        dataUrl: `data:image/${format === 'jpg' ? 'jpeg' : format};base64,${base64}`
      },
      error: null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      data: null,
      error: error.message
    });
  }
});

// Cleanup old images periodically (every hour)
setInterval(() => {
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  for (const [id, data] of activeImages.entries()) {
    if (id.startsWith('img_')) {
      const timestamp = parseInt(id.split('_')[1]);
      if (timestamp < oneHourAgo) {
        if (fs.existsSync(data.path)) {
          fs.unlinkSync(data.path);
        }
        if (fs.existsSync(data.originalPath) && data.originalPath !== data.path) {
          fs.unlinkSync(data.originalPath);
        }
        activeImages.delete(id);
      }
    }
  }
}, 60 * 60 * 1000);

export default router;
