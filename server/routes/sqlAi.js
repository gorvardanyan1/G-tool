import express from 'express';
import { generateContent } from '../services/aiService.js';

const router = express.Router();

const DIALECTS = new Set(['mysql', 'postgres', 'sqlite']);

const buildPrompt = ({ prompt, dialect }) => {
  const dialectLabel =
    dialect === 'mysql' ? 'MySQL' : dialect === 'postgres' ? 'PostgreSQL' : 'SQLite';

  return `You are an expert database engineer.

Task: Convert the user's natural-language request into a single SELECT query and a short explanation.

Rules:
- Output MUST be exactly in the following format:
SQL:
<sql here>
EXPLANATION:
<short explanation here>
- Generate SQL for dialect: ${dialectLabel}
- Prefer SELECT-only queries (no INSERT/UPDATE/DELETE/DDL).
- Do NOT add markdown fences.
- Use safe, readable SQL.
- If the request is ambiguous, make the smallest reasonable assumption and mention it in the explanation.

User request:
${prompt}`;
};

const parseAiResponse = (text) => {
  const sqlMarker = 'SQL:';
  const expMarker = 'EXPLANATION:';

  const sqlIndex = text.indexOf(sqlMarker);
  const expIndex = text.indexOf(expMarker);

  if (sqlIndex === -1 || expIndex === -1 || expIndex < sqlIndex) {
    return {
      sql: text.trim(),
      explanation: 'Explanation not provided by the model.'
    };
  }

  const sql = text.slice(sqlIndex + sqlMarker.length, expIndex).trim();
  const explanation = text.slice(expIndex + expMarker.length).trim();

  return {
    sql,
    explanation: explanation || 'Explanation not provided by the model.'
  };
};

// POST /api/sql-ai/generate
router.post('/generate', async (req, res) => {
  try {
    const { prompt, dialect } = req.body;

    if (!prompt?.trim()) {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'Prompt is required'
      });
    }

    if (!dialect || !DIALECTS.has(dialect)) {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'Dialect must be one of: mysql, postgres, sqlite'
      });
    }

    const aiPrompt = buildPrompt({ prompt: prompt.trim(), dialect });

    const result = await generateContent(aiPrompt, {
      temperature: 0.2,
      maxTokens: 1200
    });

    const parsed = parseAiResponse(result);

    res.json({
      success: true,
      data: parsed,
      error: null
    });
  } catch (error) {
    console.error('SQL AI generation error:', error);
    res.status(500).json({
      success: false,
      data: null,
      error: error.message || 'SQL generation failed'
    });
  }
});

export default router;
