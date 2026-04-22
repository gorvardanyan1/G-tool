/**
 * Centralized AI Prompts
 * All AI prompts for the application are defined here for easy management.
 */

export const prompts = {
  /**
   * Translation prompts for different modes
   */
  translation: {
    /**
     * Word-by-word translation mode
     * Preserves the original structure and provides literal translations
     */
    wordMode: ({ text, sourceLang, targetLang }) =>
      `Translate the following text from ${sourceLang} to ${targetLang} in WORD-BY-WORD mode.

Instructions:
- Provide a LITERAL, word-for-word translation
- Keep the same sentence structure as the original
- Do not add or remove any meaning
- Translate each word as directly as possible
- Maintain the original tone (formal/casual) but don't adapt it for the target culture

Text to translate:
"""${text}"""

Output ONLY the translated text, nothing else.`,

    /**
     * Natural translation mode
     * Context-aware, native-sounding translation
     */
    naturalMode: ({ text, sourceLang, targetLang }) =>
      `Translate the following text from ${sourceLang} to ${targetLang} in NATURAL mode.

Instructions:
- Translate the text to sound NATURAL and NATIVE in ${targetLang}
- Adapt the expression for cultural appropriateness
- Maintain the original meaning but make it flow naturally
- Use idioms and expressions common in the target language where appropriate
- Ensure the tone (formal, casual, professional, etc.) is preserved but adapted naturally
- Consider context and intent, not just literal words

Text to translate:
"""${text}"""

Output ONLY the translated text, nothing else.`
  },

  /**
   * Text analysis prompts
   */
  textAnalysis: {
    /**
     * Analyze text sentiment and tone
     */
    sentiment: ({ text }) =>
      `Analyze the sentiment and tone of the following text:

"""${text}"""

Provide a JSON response with:
- sentiment: (positive, negative, neutral, or mixed)
- tone: array of detected tones (e.g., professional, casual, enthusiastic, sarcastic)
- confidence: number 0-1
- explanation: brief explanation of the analysis`,

    /**
     * Summarize text
     */
    summarize: ({ text, maxLength = 100 }) =>
      `Summarize the following text in ${maxLength} words or less:

"""${text}"""

Provide a concise summary that captures the key points.`
  },

  /**
   * Image analysis prompts (for future AI image tools)
   */
  imageAnalysis: {
    /**
     * Describe image content
     */
    describe: () =>
      `Describe this image in detail. Include:
- Main subjects and objects
- Colors and visual style
- Any text visible in the image
- Overall mood or atmosphere
- Notable details`,

    /**
     * Extract text from image (OCR)
     */
    extractText: () =>
      `Extract all visible text from this image. Preserve the original formatting as much as possible. If no text is visible, respond with "No text detected."`
  },

  /**
   * Code assistance prompts (for future AI code tools)
   */
  codeAssistance: {
    /**
     * Explain code
     */
    explain: ({ code, language }) =>
      `Explain the following ${language} code in simple terms:

\`\`\`${language}
${code}
\`\`\`

Break down what each part does and the overall purpose.`,

    /**
     * Generate code from description
     */
    generate: ({ description, language }) =>
      `Generate ${language} code for the following task:

"""${description}"""

Provide clean, well-commented code. Include a brief explanation of how it works.`
  }
};

export default prompts;
