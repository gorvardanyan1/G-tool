import { useState, useCallback } from 'react';
import { Upload, File } from 'lucide-react';

export default function FileDropzone({
  onFileSelect,
  accept = 'image/*',
  maxSize = 10 * 1024 * 1024, // 10MB
  className = ''
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState(null);

  const validateFile = (file) => {
    if (file.size > maxSize) {
      return `File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`;
    }
    return null;
  };

  const handleFile = (file) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setSelectedFile(null);
      return;
    }

    setError(null);
    setSelectedFile(file);
    onFileSelect?.(file);
  };

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  }, [onFileSelect]);

  const handleInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  return (
    <div className={`w-full ${className}`}>
      <label
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center w-full min-h-[160px] sm:h-40 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-200 px-4 ${
          isDragging
            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
            : selectedFile
            ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
            : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 bg-gray-50 dark:bg-gray-800/50'
        }`}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          {selectedFile ? (
            <>
              <File className="w-10 h-10 mb-3 text-green-500" />
              <p className="mb-2 text-sm text-gray-900 dark:text-gray-100 font-medium">
                {selectedFile.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {Math.round(selectedFile.size / 1024)} KB
              </p>
            </>
          ) : (
            <>
              <Upload className="w-10 h-10 mb-3 text-gray-400 dark:text-gray-500" />
              <p className="mb-2 text-sm text-gray-900 dark:text-gray-100">
                <span className="font-medium">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Image files up to {Math.round(maxSize / 1024 / 1024)}MB
              </p>
            </>
          )}
        </div>
        <input
          type="file"
          className="hidden"
          accept={accept}
          onChange={handleInputChange}
        />
      </label>

      {error && (
        <p className="mt-2 text-sm text-red-500 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
