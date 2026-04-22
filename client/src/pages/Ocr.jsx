import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileImage, Copy, Check, ScanText, Languages } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import FileDropzone from '../components/ui/FileDropzone';
import { ocrApi } from '../utils/api';

export default function Ocr() {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState(null);
  const [language, setLanguage] = useState('eng');
  const [languages, setLanguages] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadLanguages();
  }, []);

  const loadLanguages = async () => {
    try {
      const { data } = await ocrApi.getLanguages();
      if (data.success) {
        setLanguages(data.data.languages);
      }
    } catch (err) {
      console.error('Failed to load languages:', err);
    }
  };

  const handleFileSelect = (file) => {
    setSelectedFile(file);
    setResult(null);
    setError(null);
  };

  const handleExtract = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('image', selectedFile);
      formData.append('lang', language);

      const { data } = await ocrApi.extractText(formData);
      if (data.success) {
        setResult(data.data);
      } else {
        setError(data.error || 'OCR failed');
      }
    } catch (err) {
      setError(err.message || 'An error occurred during OCR');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopy = () => {
    if (result?.text) {
      navigator.clipboard.writeText(result.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 80) return 'text-green-600 dark:text-green-400';
    if (confidence >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4 sm:mb-6">
          Image to Text (OCR)
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upload section */}
          <Card padding="lg">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Upload Image
            </h3>
            <FileDropzone
              onFileSelect={handleFileSelect}
              accept="image/*"
            />

            {selectedFile && (
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <div className="flex items-center gap-3">
                  <FileImage className="w-8 h-8 text-indigo-500" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                      {selectedFile.name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {Math.round(selectedFile.size / 1024)} KB
                    </p>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Options section */}
          <Card padding="lg">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
              OCR Options
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Language
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {languages.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>

              <Button
                onClick={handleExtract}
                disabled={!selectedFile || isProcessing}
                className="w-full min-h-[44px]"
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <ScanText className="w-4 h-4 mr-2 animate-pulse" />
                    Extracting...
                  </>
                ) : (
                  <>
                    <ScanText className="w-4 h-4 mr-2" />
                    Extract Text
                  </>
                )}
              </Button>

              {error && (
                <p className="text-sm text-red-500 dark:text-red-400">
                  {error}
                </p>
              )}
            </div>
          </Card>
        </div>

        {/* Result section */}
        {result && (
          <Card padding="lg" className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                    Text Extracted
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Confidence: <span className={getConfidenceColor(result.confidence)}>{result.confidence}%</span>
                    {' · '}{result.processingTime}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => navigate(`/translate?text=${encodeURIComponent(result.text)}`)}
                  variant="secondary"
                >
                  <Languages className="w-4 h-4 mr-2" />
                  Translate
                </Button>
                <Button
                  onClick={handleCopy}
                  variant="secondary"
                  className={copied ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : ''}
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
              {result.text ? (
                <pre className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap font-mono leading-relaxed">
                  {result.text}
                </pre>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                  No text detected in the image.
                </p>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
