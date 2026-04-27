import express from 'express';
import sharp from 'sharp';
import upload from '../middleware/upload.js';
import { generateContent } from '../services/aiService.js';

const router = express.Router();

// POST /api/color/extract
// Returns image data URL for client-side color picking
router.post('/extract', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'No image file provided'
      });
    }

    const input = req.file.buffer || req.file.path;
    if (!input) {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'Invalid image upload'
      });
    }

    // Process image - resize for display but keep quality
    const processed = await sharp(input)
      .resize(800, 600, { fit: 'inside', withoutEnlargement: true })
      .png()
      .toBuffer();

    const dataUrl = `data:image/png;base64,${processed.toString('base64')}`;

    res.json({
      success: true,
      data: {
        imageUrl: dataUrl,
        width: processed.info?.width || 800,
        height: processed.info?.height || 600
      },
      error: null
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      data: null,
      error: error.message || 'Failed to process image'
    });
  }
});

// POST /api/color/generate-ai
// Generate palette from text description using AI
router.post('/generate-ai', async (req, res) => {
  try {
    const { description } = req.body;

    if (!description || !description.trim()) {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'Description is required'
      });
    }

    const prompt = `Generate a color palette based on this description: "${description}". 

Return ONLY a JSON array of 5-6 hex color codes (e.g., ["#FF5733", "#33FF57", "#3357FF", "#FF33F5", "#F5FF33"]). 
Choose colors that work well together and match the description.

Return ONLY the JSON array, no other text.`;

    const aiResponse = await generateContent(prompt);
    
    // Try to extract hex codes from response
    let colors = [];
    
    // Look for JSON array in response
    const jsonMatch = aiResponse.match(/\[[\s\S]*?\]/);
    if (jsonMatch) {
      try {
        colors = JSON.parse(jsonMatch[0]);
      } catch {
        // Fallback: extract hex codes with regex
        const hexMatches = aiResponse.match(/#[A-Fa-f0-9]{6}/g);
        if (hexMatches) {
          colors = hexMatches.slice(0, 6);
        }
      }
    } else {
      // Extract hex codes with regex
      const hexMatches = aiResponse.match(/#[A-Fa-f0-9]{6}/g);
      if (hexMatches) {
        colors = hexMatches.slice(0, 6);
      }
    }

    if (colors.length === 0) {
      return res.status(500).json({
        success: false,
        data: null,
        error: 'Failed to generate color palette'
      });
    }

    res.json({
      success: true,
      data: {
        colors: colors.slice(0, 6),
        description: description.trim()
      },
      error: null
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      data: null,
      error: error.message || 'Failed to generate palette'
    });
  }
});

export default router;
