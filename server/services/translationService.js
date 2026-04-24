/**
 * Translation Service
 * AI-powered translation with multiple modes using the generic AI service.
 */

import { generateContent } from './aiService.js';
import { prompts } from '../config/prompts.js';
import { languages } from '../config/languages.js';

/**
 * Translation modes
 */
export const TranslationMode = {
  WORD: 'word',
  NATURAL: 'natural'
};

/**
 * Translate text using AI
 * @param {string} text - Text to translate
 * @param {string} sourceLang - Source language name or code
 * @param {string} targetLang - Target language name or code
 * @param {string} mode - Translation mode ('word' | 'natural')
 * @returns {Promise<Object>} - Translation result
 */
export async function translateText(text, sourceLang, targetLang, mode = TranslationMode.NATURAL) {
  if (!text?.trim()) {
    throw new Error('Text is required for translation');
  }

  if (!targetLang) {
    throw new Error('Target language is required');
  }

  const resolveLanguageName = (lang) => {
    if (!lang) return lang;
    const found = languages.find((l) => l.code === lang);
    return found?.name || lang;
  };

  const targetLangName = resolveLanguageName(targetLang);
  const sourceLangName = sourceLang === 'auto' ? 'the detected source language' : resolveLanguageName(sourceLang);

  // Select prompt based on mode
  const promptConfig = { text, sourceLang: sourceLangName, targetLang: targetLangName };
  const prompt = mode === TranslationMode.WORD
    ? prompts.translation.wordMode(promptConfig)
    : prompts.translation.naturalMode(promptConfig);

  try {
    const translatedText = await generateContent(prompt, {
      temperature: mode === TranslationMode.NATURAL ? 0.7 : 0.3,
      // Lower temperature for word mode to get more consistent literal translations
    });

    return {
      originalText: text,
      translatedText,
      sourceLang,
      targetLang,
      mode
    };
  } catch (error) {
    console.error('Translation service error:', error);
    throw new Error(`Translation failed: ${error.message}`);
  }
}

/**
 * Batch translate multiple texts
 * @param {Array<{text: string, targetLang: string}>} items - Items to translate
 * @param {string} sourceLang - Source language
 * @param {string} mode - Translation mode
 * @returns {Promise<Array>} - Array of translation results
 */
export async function batchTranslate(items, sourceLang, mode = TranslationMode.NATURAL) {
  const results = await Promise.all(
    items.map(async (item) => {
      try {
        const result = await translateText(item.text, sourceLang, item.targetLang, mode);
        return { success: true, ...result };
      } catch (error) {
        return {
          success: false,
          originalText: item.text,
          error: error.message
        };
      }
    })
  );

  return results;
}

/**
 * Detect language of text (using AI)
 * @param {string} text - Text to analyze
 * @returns {Promise<string>} - Detected language name
 */
export async function detectLanguage(text) {
  const prompt = `Detect the language of the following text and respond with ONLY the language name (e.g., "English", "Spanish", "Japanese"):

"""${text}"""

Language:`;

  try {
    const result = await generateContent(prompt, { temperature: 0.1 });
    return result.trim();
  } catch (error) {
    console.error('Language detection error:', error);
    return 'unknown';
  }
}

export default {
  translateText,
  batchTranslate,
  detectLanguage,
  TranslationMode
};
