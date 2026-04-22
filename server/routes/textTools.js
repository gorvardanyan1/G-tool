import express from 'express';

const router = express.Router();

// POST /api/text/count
router.post('/count', (req, res) => {
  try {
    const { text } = req.body;

    if (!text && text !== '') {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'Text is required'
      });
    }

    const stats = {
      characters: text.length,
      charactersNoSpaces: text.replace(/\s/g, '').length,
      words: text.trim() ? text.trim().split(/\s+/).length : 0,
      lines: text ? text.split('\n').length : 0,
      paragraphs: text.trim() ? text.trim().split(/\n\s*\n/).filter(p => p.trim()).length : 0
    };

    res.json({
      success: true,
      data: stats,
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

// POST /api/text/transform
router.post('/transform', (req, res) => {
  try {
    const { text, operation } = req.body;

    if (!text && text !== '') {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'Text is required'
      });
    }

    if (!operation) {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'Operation is required'
      });
    }

    let result = text;

    switch (operation) {
      case 'uppercase':
        result = text.toUpperCase();
        break;
      case 'lowercase':
        result = text.toLowerCase();
        break;
      case 'capitalize':
        result = text.replace(/\b\w/g, char => char.toUpperCase());
        break;
      case 'reverse':
        result = text.split('').reverse().join('');
        break;
      case 'removeExtraSpaces':
        result = text.replace(/\s+/g, ' ').trim();
        break;
      case 'removeLines':
        result = text.replace(/\n/g, ' ').trim();
        break;
      default:
        return res.status(400).json({
          success: false,
          data: null,
          error: 'Unknown operation'
        });
    }

    res.json({
      success: true,
      data: { original: text, transformed: result, operation },
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

// POST /api/text/base64
router.post('/base64', (req, res) => {
  try {
    const { text, operation } = req.body;

    if (!text && text !== '') {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'Text is required'
      });
    }

    if (!operation || !['encode', 'decode'].includes(operation)) {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'Operation must be "encode" or "decode"'
      });
    }

    let result;
    if (operation === 'encode') {
      result = Buffer.from(text).toString('base64');
    } else {
      result = Buffer.from(text, 'base64').toString('utf-8');
    }

    res.json({
      success: true,
      data: { original: text, result, operation },
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

export default router;
