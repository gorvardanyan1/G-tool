import { useState, useRef, useCallback } from 'react';
import { Image as ImageIcon, Palette, RefreshCw, Copy, Check, Wand2, Upload, Trash2 } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import FileDropzone from '../components/ui/FileDropzone';
import { colorPaletteApi } from '../utils/api';

const TABS = [
  { id: 'picker', label: 'Image Picker', icon: ImageIcon },
  { id: 'generator', label: 'Generator', icon: Palette },
  { id: 'converter', label: 'Converter', icon: RefreshCw }
];

const ALGORITHMS = [
  { id: 'complementary', label: 'Complementary', description: 'Opposite color' },
  { id: 'triadic', label: 'Triadic', description: 'Three colors 120° apart' },
  { id: 'analogous', label: 'Analogous', description: 'Adjacent hues' },
  { id: 'monochromatic', label: 'Monochromatic', description: 'Lightness variations' }
];

// Color utility functions
const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

const rgbToHex = (r, g, b) => {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(x).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
};

const rgbToHsl = (r, g, b) => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
};

const hslToRgb = (h, s, l) => {
  h /= 360; s /= 100; l /= 100;
  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  };
};

const generatePalette = (baseColor, algorithm) => {
  const rgb = hexToRgb(baseColor);
  if (!rgb) return [];

  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const colors = [baseColor];

  switch (algorithm) {
    case 'complementary':
      colors.push(rgbToHex(...Object.values(hslToRgb((hsl.h + 180) % 360, hsl.s, hsl.l))));
      break;
    case 'triadic':
      colors.push(rgbToHex(...Object.values(hslToRgb((hsl.h + 120) % 360, hsl.s, hsl.l))));
      colors.push(rgbToHex(...Object.values(hslToRgb((hsl.h + 240) % 360, hsl.s, hsl.l))));
      break;
    case 'analogous':
      colors.push(rgbToHex(...Object.values(hslToRgb((hsl.h + 30) % 360, hsl.s, hsl.l))));
      colors.push(rgbToHex(...Object.values(hslToRgb((hsl.h - 30 + 360) % 360, hsl.s, hsl.l))));
      break;
    case 'monochromatic':
      colors.push(rgbToHex(...Object.values(hslToRgb(hsl.h, hsl.s, Math.max(20, hsl.l - 30)))));
      colors.push(rgbToHex(...Object.values(hslToRgb(hsl.h, hsl.s, Math.max(40, hsl.l - 15)))));
      colors.push(rgbToHex(...Object.values(hslToRgb(hsl.h, hsl.s, Math.min(85, hsl.l + 15)))));
      colors.push(rgbToHex(...Object.values(hslToRgb(hsl.h, hsl.s, Math.min(95, hsl.l + 30)))));
      break;
  }

  return colors;
};

export default function ColorPalette() {
  const [activeTab, setActiveTab] = useState('picker');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Image Picker state
  const [imageUrl, setImageUrl] = useState('');
  const [pickedColors, setPickedColors] = useState([]);
  const canvasRef = useRef(null);
  const [copiedColor, setCopiedColor] = useState(null);

  // Generator state
  const [baseColor, setBaseColor] = useState('#3B82F6');
  const [generatedPalette, setGeneratedPalette] = useState([]);
  const [aiDescription, setAiDescription] = useState('');
  const [aiPalette, setAiPalette] = useState([]);

  // Converter state
  const [inputColor, setInputColor] = useState('#3B82F6');
  const [inputFormat, setInputFormat] = useState('hex');

  const handleImageUpload = async (file) => {
    setIsLoading(true);
    setError(null);
    setPickedColors([]);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const { data } = await colorPaletteApi.extract(formData);
      if (data.success) {
        setImageUrl(data.data.imageUrl);
      } else {
        setError(data.error || 'Failed to process image');
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const imageRef = useRef(null);

  const handleImageClick = useCallback((e) => {
    if (!canvasRef.current || !imageRef.current || !imageUrl) return;

    const canvas = canvasRef.current;
    const img = imageRef.current;
    const ctx = canvas.getContext('2d');
    const rect = img.getBoundingClientRect();

    // Prevent division by zero
    if (rect.width === 0 || rect.height === 0) return;

    // Calculate coordinates based on displayed image size
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let x = Math.floor((e.clientX - rect.left) * scaleX);
    let y = Math.floor((e.clientY - rect.top) * scaleY);

    // Clamp to canvas bounds
    x = Math.max(0, Math.min(x, canvas.width - 1));
    y = Math.max(0, Math.min(y, canvas.height - 1));

    // Ensure finite values
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;

    const pixel = ctx.getImageData(x, y, 1, 1).data;
    const hex = rgbToHex(pixel[0], pixel[1], pixel[2]);

    setPickedColors(prev => [...prev.slice(-5), hex]); // Keep last 6
    setCopiedColor(hex);
    setTimeout(() => setCopiedColor(null), 1000);
  }, [imageUrl]);

  const handleGenerate = (algorithm) => {
    const palette = generatePalette(baseColor, algorithm);
    setGeneratedPalette(palette);
  };

  const handleAiGenerate = async () => {
    if (!aiDescription.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data } = await colorPaletteApi.generateAi(aiDescription);
      if (data.success) {
        setAiPalette(data.data.colors);
      } else {
        setError(data.error || 'Failed to generate palette');
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedColor(text);
    setTimeout(() => setCopiedColor(null), 1000);
  };

  const parseInputColor = () => {
    let hex = inputColor;

    if (inputFormat === 'rgb') {
      const match = inputColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/i);
      if (match) {
        hex = rgbToHex(parseInt(match[1]), parseInt(match[2]), parseInt(match[3]));
      }
    } else if (inputFormat === 'hsl') {
      const match = inputColor.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/i);
      if (match) {
        const rgb = hslToRgb(parseInt(match[1]), parseInt(match[2]), parseInt(match[3]));
        hex = rgbToHex(rgb.r, rgb.g, rgb.b);
      }
    }

    return hex.toUpperCase();
  };

  const getConversions = () => {
    const hex = parseInputColor();
    const rgb = hexToRgb(hex);
    if (!rgb) return { hex, rgb: null, hsl: null };
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    return { hex, rgb, hsl };
  };

  const { hex, rgb, hsl } = getConversions();

  return (
    <div className="p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4 sm:mb-6">
          Color Palette
        </h2>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all min-h-[44px] ${
                activeTab === tab.id
                  ? 'bg-indigo-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Image Picker Tab */}
        {activeTab === 'picker' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card padding="lg">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Upload Image
                </h3>
                <FileDropzone
                  onFileSelect={handleImageUpload}
                  accept="image/*"
                />

                {imageUrl && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      Click anywhere on the image to pick a color
                    </p>
                    {/* Hidden canvas for pixel data */}
                    <canvas
                      ref={canvasRef}
                      style={{ display: 'none' }}
                    />
                    {/* Visible image for display and clicking */}
                    <div className="relative inline-block">
                      <img
                        ref={imageRef}
                        src={imageUrl}
                        alt="Upload"
                        className="max-w-full h-auto rounded-lg cursor-crosshair border border-gray-200 dark:border-gray-700"
                        onLoad={(e) => {
                          const canvas = canvasRef.current;
                          const img = e.target;
                          if (canvas) {
                            canvas.width = img.naturalWidth;
                            canvas.height = img.naturalHeight;
                            const ctx = canvas.getContext('2d');
                            ctx.drawImage(img, 0, 0);
                          }
                        }}
                        onClick={handleImageClick}
                      />
                    </div>
                  </div>
                )}
              </Card>
            </div>

            <div>
              <Card padding="lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                    Picked Colors
                  </h3>
                  {pickedColors.length > 0 && (
                    <button
                      onClick={() => setPickedColors([])}
                      className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {pickedColors.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    Click on an image to pick colors
                  </p>
                ) : (
                  <div className="space-y-3">
                    {pickedColors.map((color, index) => (
                      <button
                        key={index}
                        onClick={() => copyToClipboard(color.toUpperCase())}
                        className="w-full flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all group"
                      >
                        <div
                          className="w-10 h-10 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
                          style={{ backgroundColor: color }}
                        />
                        <span className="font-mono text-sm text-gray-900 dark:text-gray-100 flex-1 text-left">
                          {color.toUpperCase()}
                        </span>
                        {copiedColor === color ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}

        {/* Generator Tab */}
        {activeTab === 'generator' && (
          <div className="space-y-6">
            {/* Algorithmic Generation */}
            <Card padding="lg">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Generate from Base Color
              </h3>

              <div className="flex flex-wrap items-center gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={baseColor}
                    onChange={(e) => setBaseColor(e.target.value)}
                    className="w-12 h-12 rounded-lg cursor-pointer border-0 p-0"
                  />
                  <input
                    type="text"
                    value={baseColor.toUpperCase()}
                    onChange={(e) => setBaseColor(e.target.value)}
                    className="w-32 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg font-mono text-sm text-gray-900 dark:text-gray-100 uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {ALGORITHMS.map(algo => (
                  <button
                    key={algo.id}
                    onClick={() => handleGenerate(algo.id)}
                    className="p-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-left transition-all"
                  >
                    <p className="font-medium text-sm text-gray-900 dark:text-gray-100">
                      {algo.label}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {algo.description}
                    </p>
                  </button>
                ))}
              </div>

              {generatedPalette.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Generated Palette
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {generatedPalette.map((color, index) => (
                      <button
                        key={index}
                        onClick={() => copyToClipboard(color.toUpperCase())}
                        className="group relative"
                      >
                        <div
                          className="w-20 h-20 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 transition-transform group-hover:scale-105"
                          style={{ backgroundColor: color }}
                        />
                        <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs font-mono text-gray-600 dark:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          {color.toUpperCase()}
                        </span>
                        {copiedColor === color && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="bg-black/50 rounded-lg p-1">
                              <Check className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            {/* AI Generation */}
            <Card padding="lg">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
                AI Palette Generator
              </h3>

              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={aiDescription}
                  onChange={(e) => setAiDescription(e.target.value)}
                  placeholder="e.g., sunset beach, cyberpunk city, forest morning..."
                  className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                />
                <Button
                  onClick={handleAiGenerate}
                  disabled={!aiDescription.trim() || isLoading}
                  className="min-h-[44px]"
                >
                  <Wand2 className="w-4 h-4 mr-2" />
                  {isLoading ? 'Generating...' : 'Generate'}
                </Button>
              </div>

              {aiPalette.length > 0 && (
                <div className="mt-6">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    AI Generated Palette
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {aiPalette.map((color, index) => (
                      <button
                        key={index}
                        onClick={() => copyToClipboard(color.toUpperCase())}
                        className="group relative"
                      >
                        <div
                          className="w-20 h-20 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 transition-transform group-hover:scale-105"
                          style={{ backgroundColor: color }}
                        />
                        <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs font-mono text-gray-600 dark:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          {color.toUpperCase()}
                        </span>
                        {copiedColor === color && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="bg-black/50 rounded-lg p-1">
                              <Check className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Converter Tab */}
        {activeTab === 'converter' && (
          <Card padding="lg">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Color Converter
            </h3>

            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={hex}
                  onChange={(e) => {
                    setInputColor(e.target.value);
                    setInputFormat('hex');
                  }}
                  className="w-16 h-12 rounded-lg cursor-pointer border-0 p-0"
                />
                <select
                  value={inputFormat}
                  onChange={(e) => setInputFormat(e.target.value)}
                  className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
                >
                  <option value="hex">HEX</option>
                  <option value="rgb">RGB</option>
                  <option value="hsl">HSL</option>
                </select>
              </div>

              <input
                type="text"
                value={inputColor}
                onChange={(e) => setInputColor(e.target.value)}
                placeholder={inputFormat === 'hex' ? '#3B82F6' : inputFormat === 'rgb' ? 'rgb(59, 130, 246)' : 'hsl(217, 91%, 60%)'}
                className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg font-mono text-gray-900 dark:text-gray-100"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* HEX */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">HEX</span>
                  <button
                    onClick={() => copyToClipboard(hex)}
                    className="text-gray-400 hover:text-indigo-500"
                  >
                    {copiedColor === hex ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="font-mono text-lg text-gray-900 dark:text-gray-100">{hex}</p>
              </div>

              {/* RGB */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">RGB</span>
                  <button
                    onClick={() => copyToClipboard(`rgb(${rgb?.r}, ${rgb?.g}, ${rgb?.b})`)}
                    className="text-gray-400 hover:text-indigo-500"
                  >
                    {copiedColor === `rgb(${rgb?.r}, ${rgb?.g}, ${rgb?.b})` ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="font-mono text-lg text-gray-900 dark:text-gray-100">
                  {rgb ? `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})` : '-'}
                </p>
              </div>

              {/* HSL */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">HSL</span>
                  <button
                    onClick={() => copyToClipboard(`hsl(${hsl?.h}, ${hsl?.s}%, ${hsl?.l}%)`)}
                    className="text-gray-400 hover:text-indigo-500"
                  >
                    {copiedColor === `hsl(${hsl?.h}, ${hsl?.s}%, ${hsl?.l}%)` ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="font-mono text-lg text-gray-900 dark:text-gray-100">
                  {hsl ? `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)` : '-'}
                </p>
              </div>
            </div>

            {/* Preview */}
            <div className="mt-6">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Preview</p>
              <div
                className="w-full h-24 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700"
                style={{ backgroundColor: hex }}
              />
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
