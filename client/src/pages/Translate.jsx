import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowRightLeft, Copy, Check, Type, Sparkles } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { translateApi } from '../utils/api';

export default function Translate() {
  const [searchParams] = useSearchParams();
  const [text, setText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [sourceLang, setSourceLang] = useState('auto');
  const [targetLang, setTargetLang] = useState('en');
  const [mode, setMode] = useState('natural');
  const [languages, setLanguages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Check for text in URL query param
    const urlText = searchParams.get('text');
    if (urlText) {
      setText(urlText);
    }
  }, [searchParams]);

  useEffect(() => {
    translateApi.getLanguages().then(({ data }) => {
      if (data.success) {
        setLanguages(data.data);
      }
    });
  }, []);

  const handleTranslate = async () => {
    if (!text.trim()) return;

    setIsLoading(true);
    try {
      const { data } = await translateApi.translate(text, sourceLang, targetLang, mode);
      if (data.success) {
        setTranslatedText(data.data.translatedText);
      }
    } catch (error) {
      console.error('Translation failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwap = () => {
    if (sourceLang !== 'auto') {
      const temp = sourceLang;
      setSourceLang(targetLang);
      setTargetLang(temp);
      setText(translatedText);
      setTranslatedText(text);
    }
  };

  const handleCopy = () => {
    if (translatedText) {
      navigator.clipboard.writeText(translatedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4 sm:mb-6">
          Translate
        </h2>

        <Card padding="lg">
          {/* Language selectors */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 mb-4">
            <select
              value={sourceLang}
              onChange={(e) => setSourceLang(e.target.value)}
              className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
            >
              <option value="auto">Auto-detect</option>
              {languages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>

            <button
              onClick={handleSwap}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Swap languages"
            >
              <ArrowRightLeft className="w-5 h-5" />
            </button>

            <select
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
            >
              {languages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>

          {/* Translation Mode Selector */}
          <div className="flex items-center gap-2 mb-6 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
            <button
              onClick={() => setMode('natural')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === 'natural'
                  ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              Natural
            </button>
            <button
              onClick={() => setMode('word')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === 'word'
                  ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              <Type className="w-4 h-4" />
              Word-by-word
            </button>
          </div>

          {/* Text areas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Enter text
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type or paste text to translate..."
                className="w-full h-48 px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {text.length} characters
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Translation
              </label>
              <div className="relative">
                <textarea
                  value={translatedText}
                  readOnly
                  placeholder="Translation will appear here..."
                  className="w-full h-48 px-4 py-3 bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 resize-none focus:outline-none"
                />
                {translatedText && (
                  <button
                    onClick={handleCopy}
                    className="absolute top-3 right-3 p-2 text-gray-500 dark:text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-all"
                    aria-label="Copy translation"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Action button */}
          <div className="mt-6 flex justify-center">
            <Button
              onClick={handleTranslate}
              disabled={!text.trim() || isLoading}
              size="lg"
            >
              {isLoading ? 'Translating...' : 'Translate'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
