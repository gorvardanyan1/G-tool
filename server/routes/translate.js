import express from 'express';
import { translateText, TranslationMode, detectLanguage } from '../services/translationService.js';
import { languages } from '../config/languages.js';

const router = express.Router();

// POST /api/translate
router.post('/', async (req, res) => {
  try {
    const { text, sourceLang = 'auto', targetLang = 'en', mode = 'natural' } = req.body;

    if (!text?.trim()) {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'Text is required'
      });
    }

    if (!targetLang) {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'Target language is required'
      });
    }

    // Validate mode
    const translationMode = mode === 'word' ? TranslationMode.WORD : TranslationMode.NATURAL;

    // Perform AI translation
    const result = await translateText(text, sourceLang, targetLang, translationMode);

    res.json({
      success: true,
      data: result,
      error: null
    });
  } catch (error) {
    console.error('Translation error:', error);
    res.status(500).json({
      success: false,
      data: null,
      error: error.message || 'Translation failed'
    });
  }
});

// POST /api/translate/detect
router.post('/detect', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text?.trim()) {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'Text is required'
      });
    }

    const detectedLang = await detectLanguage(text);

    res.json({
      success: true,
      data: { detectedLanguage: detectedLang },
      error: null
    });
  } catch (error) {
    console.error('Language detection error:', error);
    res.status(500).json({
      success: false,
      data: null,
      error: error.message || 'Language detection failed'
    });
  }
});

// GET /api/translate/languages
router.get('/languages', (req, res) => {
  res.json({
    success: true,
    data: languages,
    error: null
  });
});

export default router;
