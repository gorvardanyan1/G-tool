import { useState } from 'react';
import { Download, FileImage, Check } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import FileDropzone from '../components/ui/FileDropzone';
import { imageApi } from '../utils/api';

const FORMATS = [
  { value: 'png', label: 'PNG' },
  { value: 'jpeg', label: 'JPEG' },
  { value: 'webp', label: 'WebP' },
  { value: 'gif', label: 'GIF' }
];

export default function ImageConverter() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [format, setFormat] = useState('png');
  const [quality, setQuality] = useState(100);
  const [isConverting, setIsConverting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileSelect = (file) => {
    setSelectedFile(file);
    setResult(null);
    setError(null);
  };

  const handleConvert = async () => {
    if (!selectedFile) return;

    setIsConverting(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('image', selectedFile);
      formData.append('format', format);
      formData.append('quality', quality);

      const { data } = await imageApi.convert(formData);
      if (data.success) {
        setResult(data.data);
      } else {
        setError(data.error || 'Conversion failed');
      }
    } catch (err) {
      setError(err.message || 'An error occurred during conversion');
    } finally {
      setIsConverting(false);
    }
  };

  const handleDownload = () => {
    if (result?.dataUrl) {
      const link = document.createElement('a');
      link.href = result.dataUrl;
      link.download = result.convertedName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4 sm:mb-6">
          Image Converter
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
              Conversion Options
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Output Format
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {FORMATS.map((fmt) => (
                    <button
                      key={fmt.value}
                      onClick={() => setFormat(fmt.value)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all min-h-[44px] ${
                        format === fmt.value
                          ? 'bg-indigo-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      {fmt.label}
                    </button>
                  ))}
                </div>
              </div>

              {format !== 'png' && format !== 'gif' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Quality: {quality}%
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={quality}
                    onChange={(e) => setQuality(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <span>Low</span>
                    <span>High</span>
                  </div>
                </div>
              )}

              <Button
                onClick={handleConvert}
                disabled={!selectedFile || isConverting}
                className="w-full min-h-[44px]"
                size="lg"
              >
                {isConverting ? 'Converting...' : 'Convert Image'}
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
                    Conversion Complete
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {result.width} x {result.height} px · {Math.round(result.size / 1024)} KB
                  </p>
                </div>
              </div>
              <Button onClick={handleDownload} variant="secondary">
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 flex items-center justify-center">
              <img
                src={result.dataUrl}
                alt="Converted"
                className="max-h-64 rounded-lg shadow-sm"
              />
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
