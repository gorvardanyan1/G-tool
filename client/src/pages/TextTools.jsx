import { useState } from 'react';
import { Type, Hash, RefreshCw, Code, FileEdit } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { textApi } from '../utils/api';

const TRANSFORM_OPS = [
  { value: 'uppercase', label: 'UPPERCASE' },
  { value: 'lowercase', label: 'lowercase' },
  { value: 'capitalize', label: 'Capitalize' },
  { value: 'reverse', label: 'Reverse' },
  { value: 'removeExtraSpaces', label: 'Remove Extra Spaces' },
  { value: 'removeLines', label: 'Remove Line Breaks' }
];

export default function TextTools() {
  const [text, setText] = useState('');
  const [stats, setStats] = useState(null);
  const [transformed, setTransformed] = useState('');
  const [activeTab, setActiveTab] = useState('count');
  const [isLoading, setIsLoading] = useState(false);

  const handleCount = async () => {
    if (!text) return;
    setIsLoading(true);
    try {
      const { data } = await textApi.count(text);
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Count failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTransform = async (operation) => {
    if (!text) return;
    setIsLoading(true);
    try {
      const { data } = await textApi.transform(text, operation);
      if (data.success) {
        setTransformed(data.data.transformed);
      }
    } catch (error) {
      console.error('Transform failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBase64 = async (operation) => {
    if (!text) return;
    setIsLoading(true);
    try {
      const { data } = await textApi.base64(text, operation);
      if (data.success) {
        setTransformed(data.data.result);
      }
    } catch (error) {
      console.error('Base64 failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const tabs = [
    { id: 'count', label: 'Count', icon: Hash },
    { id: 'transform', label: 'Transform', icon: RefreshCw },
    { id: 'base64', label: 'Base64', icon: Code }
  ];

  return (
    <div className="p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4 sm:mb-6">
          Text Tools
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Input section */}
          <div className="lg:col-span-2">
            <Card padding="lg">
              <div className="flex items-center gap-3 mb-4">
                <Type className="w-5 h-5 text-indigo-500" />
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  Input Text
                </h3>
              </div>
              <textarea
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  setStats(null);
                  setTransformed('');
                }}
                placeholder="Enter or paste your text here..."
                className="w-full h-64 px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <div className="mt-2 flex justify-between text-sm text-gray-500 dark:text-gray-400">
                <span>{text.length} characters</span>
                <button
                  onClick={() => {
                    setText('');
                    setStats(null);
                    setTransformed('');
                  }}
                  className="text-red-500 hover:text-red-600 dark:hover:text-red-400"
                >
                  Clear
                </button>
              </div>
            </Card>
          </div>

          {/* Tools section */}
          <div>
            <Card padding="lg">
              <div className="flex items-center gap-3 mb-4">
                <FileEdit className="w-5 h-5 text-indigo-500" />
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  Tools
                </h3>
              </div>

              {/* Tabs */}
              <div className="flex flex-wrap gap-2 mb-4">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all min-h-[44px] ${
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

              {/* Tab content */}
              <div className="space-y-3">
                {activeTab === 'count' && (
                  <Button onClick={handleCount} disabled={!text || isLoading} className="w-full">
                    Count Characters & Words
                  </Button>
                )}

                {activeTab === 'transform' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
                    {TRANSFORM_OPS.map((op) => (
                      <button
                        key={op.value}
                        onClick={() => handleTransform(op.value)}
                        disabled={!text || isLoading}
                        className="px-3 py-2.5 text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-all disabled:opacity-50 text-left min-h-[44px]"
                      >
                        {op.label}
                      </button>
                    ))}
                  </div>
                )}

                {activeTab === 'base64' && (
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={() => handleBase64('encode')}
                      disabled={!text || isLoading}
                      variant="secondary"
                    >
                      Encode
                    </Button>
                    <Button
                      onClick={() => handleBase64('decode')}
                      disabled={!text || isLoading}
                      variant="secondary"
                    >
                      Decode
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* Results */}
        {stats && activeTab === 'count' && (
          <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card padding="md" className="text-center">
              <p className="text-2xl font-bold text-indigo-500">{stats.characters}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Characters</p>
            </Card>
            <Card padding="md" className="text-center">
              <p className="text-2xl font-bold text-indigo-500">{stats.charactersNoSpaces}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">No Spaces</p>
            </Card>
            <Card padding="md" className="text-center">
              <p className="text-2xl font-bold text-indigo-500">{stats.words}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Words</p>
            </Card>
            <Card padding="md" className="text-center">
              <p className="text-2xl font-bold text-indigo-500">{stats.paragraphs}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Paragraphs</p>
            </Card>
          </div>
        )}

        {transformed && (activeTab === 'transform' || activeTab === 'base64') && (
          <Card padding="lg" className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Result</h3>
              <button
                onClick={() => {
                  setText(transformed);
                  setTransformed('');
                  setStats(null);
                }}
                className="text-sm text-indigo-500 hover:text-indigo-600"
              >
                Copy to input
              </button>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
              <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap font-mono text-sm">
                {transformed}
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
