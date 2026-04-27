import express from 'express';
import { generateContent } from '../services/aiService.js';

const router = express.Router();

// POST /api/regex/test
// Test regex pattern against text
router.post('/test', (req, res) => {
  try {
    const { pattern, flags = '', text, flavor = 'javascript' } = req.body;

    if (!pattern) {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'Pattern is required'
      });
    }

    if (!text && text !== '') {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'Test text is required'
      });
    }

    let matches = [];
    let error = null;
    let isValid = true;

    // Validate pattern based on flavor
    if (flavor === 'javascript') {
      try {
        // Test the regex is valid
        new RegExp(pattern);
      } catch (e) {
        isValid = false;
        error = e.message;
      }

      if (isValid) {
        try {
          const regex = new RegExp(pattern, flags);
          const globalFlag = flags.includes('g');

          if (globalFlag) {
            let match;
            while ((match = regex.exec(text)) !== null) {
              // Prevent infinite loop on zero-width matches
              if (match.index === regex.lastIndex) {
                regex.lastIndex++;
              }
              matches.push({
                match: match[0],
                groups: match.slice(1),
                index: match.index,
                length: match[0].length
              });
            }
          } else {
            const match = regex.exec(text);
            if (match) {
              matches.push({
                match: match[0],
                groups: match.slice(1),
                index: match.index,
                length: match[0].length
              });
            }
          }
        } catch (e) {
          error = e.message;
        }
      }
    } else if (flavor === 'php' || flavor === 'python') {
      // For PHP and Python, we validate syntax but can't execute
      // We'll do basic validation and return the pattern info
      try {
        // Basic PCRE validation
        if (pattern.includes('(?<') && !pattern.includes('>)')) {
          throw new Error('Invalid named group syntax');
        }
        // Check for unclosed groups
        const openParens = (pattern.match(/\(/g) || []).length;
        const closeParens = (pattern.match(/\)/g) || []).length;
        if (openParens !== closeParens) {
          throw new Error('Unclosed group');
        }
        
        // For non-JS flavors, we just validate and return empty matches
        // (actual execution would need the target runtime)
        matches = [];
      } catch (e) {
        isValid = false;
        error = e.message;
      }
    }

    res.json({
      success: true,
      data: {
        pattern,
        flags,
        flavor,
        isValid,
        error,
        matchCount: matches.length,
        matches
      },
      error: null
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      data: null,
      error: err.message || 'Internal server error'
    });
  }
});

// POST /api/regex/generate
// Generate regex from description using AI
router.post('/generate', async (req, res) => {
  try {
    const { description, flavor = 'javascript' } = req.body;

    if (!description || !description.trim()) {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'Description is required'
      });
    }

    const flavorName = flavor === 'php' ? 'PHP (PCRE)' : flavor === 'python' ? 'Python' : 'JavaScript';

    const prompt = `Generate a ${flavorName} regular expression pattern for the following requirement:

"${description}"

Please provide:
1. The regex pattern (as a raw string, properly escaped)
2. Recommended flags (g, i, m, s, u, x - explain which and why)
3. A clear explanation of how the pattern works, breaking down each part

Format your response as:
PATTERN: <the pattern>
FLAGS: <flags>
EXPLANATION: <detailed explanation>

Make sure the pattern is valid ${flavorName} regex syntax.`;

    const aiResponse = await generateContent(prompt);

    // Parse the response
    let pattern = '';
    let flags = '';
    let explanation = '';

    const patternMatch = aiResponse.match(/PATTERN:\s*(.+?)(?=FLAGS:|EXPLANATION:|$)/is);
    const flagsMatch = aiResponse.match(/FLAGS:\s*(.+?)(?=EXPLANATION:|$)/is);
    const explanationMatch = aiResponse.match(/EXPLANATION:\s*(.+)/is);

    if (patternMatch) {
      pattern = patternMatch[1].trim().replace(/^["']|["']$/g, '');
    }
    if (flagsMatch) {
      flags = flagsMatch[1].trim();
    }
    if (explanationMatch) {
      explanation = explanationMatch[1].trim();
    }

    // If parsing failed, use the raw response as explanation
    if (!pattern) {
      pattern = '';
      explanation = aiResponse;
    }

    res.json({
      success: true,
      data: {
        pattern,
        flags,
        explanation,
        flavor,
        description: description.trim()
      },
      error: null
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      data: null,
      error: err.message || 'Failed to generate regex'
    });
  }
});

export default router;
