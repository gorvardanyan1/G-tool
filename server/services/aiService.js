/**
 * Generic AI Service
 * Reusable service for making Gemini API calls across all AI-powered tools.
 */

/**
 * Generate content using Gemini API
 * @param {string} prompt - The prompt to send to the AI
 * @param {Object} options - Additional options
 * @param {string} options.model - Override default model
 * @returns {Promise<string>} - The AI-generated response
 */
export async function generateContent(prompt, options = {}) {
  const apiKey = process.env.GEMINI_API_KEY;
  const baseUrl = process.env.GEMINI_API_URL || 'https://generativelanguage.googleapis.com/v1beta/models';
  const model = options.model || process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const fallbackModel = process.env.GEMINI_FALLBACK_MODEL;
  const maxRetries = Number.isFinite(options.maxRetries) ? options.maxRetries : 2;
  const initialBackoffMs = Number.isFinite(options.initialBackoffMs) ? options.initialBackoffMs : 500;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in environment variables');
  }

  const buildUrl = (m) => `${baseUrl}/${m}:generateContent?key=${apiKey}`;

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const isTransientGeminiError = (status, message = '') => {
    if (status === 429 || status === 503) return true;
    const msg = String(message).toLowerCase();
    return msg.includes('high demand') || msg.includes('spikes in demand') || msg.includes('try again later');
  };

  try {
    const modelsToTry = fallbackModel && fallbackModel !== model ? [model, fallbackModel] : [model];
    let lastError;

    for (const currentModel of modelsToTry) {
      const url = buildUrl(currentModel);

      for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: options.temperature ?? 0.7,
              maxOutputTokens: options.maxTokens ?? 2048,
              topP: options.topP ?? 0.95,
              topK: options.topK ?? 40
            }
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const message = errorData.error?.message || `Gemini API error: ${response.status} ${response.statusText}`;
          const transient = isTransientGeminiError(response.status, message);

          if (transient && attempt < maxRetries) {
            const backoffMs = initialBackoffMs * Math.pow(2, attempt);
            const jitterMs = Math.floor(Math.random() * 200);
            await sleep(backoffMs + jitterMs);
            continue;
          }

          lastError = new Error(message);
          break;
        }

        const data = await response.json();

        // Check for API-level errors
        if (data.error) {
          const message = data.error.message || 'Unknown Gemini API error';
          const transient = isTransientGeminiError(response.status, message);

          if (transient && attempt < maxRetries) {
            const backoffMs = initialBackoffMs * Math.pow(2, attempt);
            const jitterMs = Math.floor(Math.random() * 200);
            await sleep(backoffMs + jitterMs);
            continue;
          }

          lastError = new Error(message);
          break;
        }

        // Check for blocked content
        if (data.promptFeedback?.blockReason) {
          throw new Error(`Content blocked: ${data.promptFeedback.blockReason}`);
        }

        // Extract the generated text
        const candidate = data.candidates?.[0];
        if (!candidate) {
          throw new Error('No response generated from AI');
        }

        if (candidate.finishReason === 'SAFETY') {
          throw new Error('Content blocked by safety filters');
        }

        const text = candidate.content?.parts?.[0]?.text;
        if (!text) {
          throw new Error('Empty response from AI');
        }

        return text.trim();
      }
    }

    throw lastError || new Error('Gemini API error');
  } catch (error) {
    console.error('AI Service Error:', error);
    throw error;
  }
}

/**
 * Generate structured JSON content
 * @param {string} prompt - The prompt to send
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - Parsed JSON response
 */
export async function generateJSON(prompt, options = {}) {
  const response = await generateContent(prompt, {
    ...options,
    temperature: options.temperature ?? 0.2 // Lower temp for structured output
  });

  try {
    // Try to extract JSON from the response (handles cases where AI wraps in markdown)
    const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) ||
                      response.match(/```\n?([\s\S]*?)\n?```/) ||
                      [null, response];

    const jsonStr = jsonMatch[1]?.trim() || response;
    return JSON.parse(jsonStr);
  } catch (error) {
    throw new Error(`Failed to parse AI response as JSON: ${error.message}`);
  }
}

/**
 * Stream content generation (for future use with streaming UI)
 * @param {string} prompt - The prompt to send
 * @param {Object} options - Additional options
 * @returns {Promise<ReadableStream>} - Stream of generated content
 */
export async function streamContent(prompt, options = {}) {
  const apiKey = process.env.GEMINI_API_KEY;
  const baseUrl = process.env.GEMINI_API_URL || 'https://generativelanguage.googleapis.com/v1beta/models';
  const model = options.model || process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const url = `${baseUrl}/${model}:streamGenerateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxTokens ?? 2048
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
  }

  return response.body;
}

export default { generateContent, generateJSON, streamContent };
