import { useState, useRef, useEffect } from 'react';
import { QrCode, Download, Copy, Check } from 'lucide-react';
import QRCode from 'qrcode';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

export default function QrGenerator() {
  const [text, setText] = useState('');
  const [size, setSize] = useState(256);
  const [fgColor, setFgColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef(null);

  const generateQR = async () => {
    if (!text.trim()) {
      setQrDataUrl('');
      return;
    }

    setIsGenerating(true);
    try {
      const canvas = canvasRef.current;
      if (!canvas) return;

      await QRCode.toCanvas(canvas, text, {
        width: size,
        margin: 2,
        color: {
          dark: fgColor,
          light: bgColor
        },
        errorCorrectionLevel: 'M'
      });

      const dataUrl = canvas.toDataURL('image/png');
      setQrDataUrl(dataUrl);
    } catch (error) {
      console.error('QR generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      generateQR();
    }, 300);

    return () => clearTimeout(timeout);
  }, [text, size, fgColor, bgColor]);

  const handleDownload = () => {
    if (!qrDataUrl) return;

    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `qr-code-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopy = async () => {
    if (!qrDataUrl) return;

    try {
      const response = await fetch(qrDataUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob
        })
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4 sm:mb-6">
          QR Code Generator
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input and Options */}
          <Card padding="lg">
            <div className="flex items-center gap-3 mb-4">
              <QrCode className="w-5 h-5 text-indigo-500" />
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                QR Code Options
              </h3>
            </div>

            <div className="space-y-4">
              {/* Text Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Text or URL
                </label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Enter text or URL to generate QR code..."
                  className="w-full h-24 px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Size Slider */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Size: {size}px
                </label>
                <input
                  type="range"
                  min="128"
                  max="512"
                  step="16"
                  value={size}
                  onChange={(e) => setSize(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span>128px</span>
                  <span>512px</span>
                </div>
              </div>

              {/* Colors */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Foreground
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={fgColor}
                      onChange={(e) => setFgColor(e.target.value)}
                      className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0"
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                      {fgColor}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Background
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0"
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                      {bgColor}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Preview and Actions */}
          <Card padding="lg">
            <div className="flex items-center gap-3 mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                Preview
              </h3>
            </div>

            {/* Hidden canvas for generation */}
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {/* Preview Display */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 flex items-center justify-center min-h-[280px]">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="Generated QR Code"
                  className="max-w-full h-auto rounded-lg shadow-sm"
                  style={{ maxWidth: size, maxHeight: size }}
                />
              ) : (
                <div className="text-center text-gray-400 dark:text-gray-500">
                  <QrCode className="w-16 h-16 mx-auto mb-2" />
                  <p>Enter text to generate QR code</p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Button
                onClick={handleDownload}
                disabled={!qrDataUrl || isGenerating}
                variant="primary"
                className="w-full"
              >
                <Download className="w-4 h-4 mr-2" />
                Download PNG
              </Button>
              <Button
                onClick={handleCopy}
                disabled={!qrDataUrl || isGenerating}
                variant="secondary"
                className="w-full"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Image
                  </>
                )}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
