import { useState, useEffect, useCallback } from 'react';
import { Regex, Play, Wand2, Copy, Check, AlertCircle, Flag, BookOpen } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { regexTesterApi } from '../utils/api';

const TABS = [
  { id: 'tester', label: 'Tester', icon: Play },
  { id: 'generator', label: 'AI Generator', icon: Wand2 }
];

const FLAVORS = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'php', label: 'PHP (PCRE)' },
  { value: 'python', label: 'Python' }
];

const FLAGS = [
  { value: 'g', label: 'g', description: 'Global' },
  { value: 'i', label: 'i', description: 'Ignore case' },
  { value: 'm', label: 'm', description: 'Multiline' },
  { value: 's', label: 's', description: 'DotAll' },
  { value: 'u', label: 'u', description: 'Unicode' },
  { value: 'x', label: 'x', description: 'Extended' }
];

const MATCH_COLORS = [
  'bg-red-200 text-red-900',
  'bg-orange-200 text-orange-900',
  'bg-yellow-200 text-yellow-900',
  'bg-green-200 text-green-900',
  'bg-blue-200 text-blue-900',
  'bg-purple-200 text-purple-900',
  'bg-pink-200 text-pink-900'
];

export default function RegexTester() {
  const [activeTab, setActiveTab] = useState('tester');
  
  // Tester state
  const [pattern, setPattern] = useState('');
  const [flags, setFlags] = useState('');
  const [flavor, setFlavor] = useState('javascript');
  const [testText, setTestText] = useState('');
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedItem, setCopiedItem] = useState(null);

  // Generator state
  const [genDescription, setGenDescription] = useState('');
  const [genFlavor, setGenFlavor] = useState('javascript');
  const [generatedRegex, setGeneratedRegex] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Live test on pattern/text change
  const testRegex = useCallback(async () => {
    if (!pattern || !testText) {
      setResult(null);
      return;
    }

    setIsLoading(true);
    try {
      const { data } = await regexTesterApi.test(pattern, flags, testText, flavor);
      if (data.success) {
        setResult(data.data);
      }
    } catch (err) {
      console.error('Regex test failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [pattern, flags, testText, flavor]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      testRegex();
    }, 300);
    return () => clearTimeout(timeout);
  }, [testRegex]);

  const toggleFlag = (flag) => {
    if (flags.includes(flag)) {
      setFlags(flags.replace(flag, ''));
    } else {
      setFlags(flags + flag);
    }
  };

  const copyToClipboard = (text, item) => {
    navigator.clipboard.writeText(text);
    setCopiedItem(item);
    setTimeout(() => setCopiedItem(null), 1000);
  };

  const handleGenerate = async () => {
    if (!genDescription.trim()) return;

    setIsGenerating(true);
    try {
      const { data } = await regexTesterApi.generate(genDescription, genFlavor);
      if (data.success) {
        setGeneratedRegex(data.data);
      }
    } catch (err) {
      console.error('Generate failed:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const useGeneratedPattern = () => {
    if (generatedRegex) {
      setPattern(generatedRegex.pattern);
      setFlags(generatedRegex.flags.replace(/[^gimsux]/gi, ''));
      setFlavor(generatedRegex.flavor);
      setActiveTab('tester');
    }
  };

  // Render highlighted text with matches
  const renderHighlightedText = () => {
    if (!result || !result.matches || result.matches.length === 0) {
      return <span className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{testText}</span>;
    }

    const elements = [];
    let lastIndex = 0;

    result.matches.forEach((match, idx) => {
      // Text before match
      if (match.index > lastIndex) {
        elements.push(
          <span key={`before-${idx}`} className="text-gray-900 dark:text-gray-100">
            {testText.slice(lastIndex, match.index)}
          </span>
        );
      }

      // The match
      const colorClass = MATCH_COLORS[idx % MATCH_COLORS.length];
      elements.push(
        <mark
          key={`match-${idx}`}
          className={`${colorClass} px-1 rounded cursor-pointer hover:opacity-80 transition-opacity`}
          title={`Match #${idx + 1}: "${match.match}" at index ${match.index}`}
          onClick={() => copyToClipboard(match.match, `match-${idx}`)}
        >
          {copiedItem === `match-${idx}` ? <Check className="w-3 h-3 inline" /> : match.match}
        </mark>
      );

      lastIndex = match.index + match.length;
    });

    // Remaining text
    if (lastIndex < testText.length) {
      elements.push(
        <span key="after" className="text-gray-900 dark:text-gray-100">
          {testText.slice(lastIndex)}
        </span>
      );
    }

    return <span className="whitespace-pre-wrap font-mono text-sm">{elements}</span>;
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4 sm:mb-6">
          Regex Tester
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

        {/* Tester Tab */}
        {activeTab === 'tester' && (
          <div className="space-y-4">
            {/* Pattern Input */}
            <Card padding="lg">
              <div className="flex items-center gap-2 mb-4">
                <Regex className="w-5 h-5 text-indigo-500" />
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  Pattern
                </h3>
              </div>

              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-shrink-0">
                  <select
                    value={flavor}
                    onChange={(e) => setFlavor(e.target.value)}
                    className="w-full lg:w-40 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
                  >
                    {FLAVORS.map(f => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 font-mono">/</span>
                    <input
                      type="text"
                      value={pattern}
                      onChange={(e) => setPattern(e.target.value)}
                      placeholder="Enter regex pattern..."
                      className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg font-mono text-sm text-gray-900 dark:text-gray-100"
                    />
                    <span className="text-gray-500 font-mono">/</span>
                    <input
                      type="text"
                      value={flags}
                      onChange={(e) => setFlags(e.target.value.replace(/[^gimsux]/gi, ''))}
                      placeholder="flags"
                      className="w-20 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg font-mono text-sm text-gray-900 dark:text-gray-100"
                    />
                  </div>
                </div>
              </div>

              {/* Flags */}
              <div className="mt-4 flex flex-wrap gap-3">
                {FLAGS.map(flag => (
                  <label
                    key={flag.value}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all ${
                      flags.includes(flag.value)
                        ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                        : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={flags.includes(flag.value)}
                      onChange={() => toggleFlag(flag.value)}
                      className="sr-only"
                    />
                    <Flag className="w-3 h-3" />
                    <code className="font-bold">{flag.label}</code>
                    <span className="text-xs text-gray-500">{flag.description}</span>
                  </label>
                ))}
              </div>
            </Card>

            {/* Test Text and Results */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Test Text Input */}
              <Card padding="lg">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Test Text
                </h3>
                <textarea
                  value={testText}
                  onChange={(e) => setTestText(e.target.value)}
                  placeholder="Enter text to test against the regex..."
                  className="w-full h-64 px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </Card>

              {/* Results */}
              <Card padding="lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                    Results
                  </h3>
                  {result && (
                    <span className={`text-sm font-medium ${
                      result.isValid 
                        ? result.matchCount > 0 
                          ? 'text-green-600 dark:text-green-400' 
                          : 'text-gray-500'
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {result.isValid 
                        ? `${result.matchCount} match${result.matchCount !== 1 ? 'es' : ''}`
                        : 'Invalid pattern'
                      }
                    </span>
                  )}
                </div>

                {result?.error && (
                  <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <p className="text-sm text-red-600 dark:text-red-400">{result.error}</p>
                  </div>
                )}

                {/* Highlighted Text */}
                <div className="mb-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Highlighted Matches</p>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 min-h-[120px] max-h-[200px] overflow-auto">
                    {renderHighlightedText()}
                  </div>
                </div>

                {/* Match Details */}
                {result?.matches && result.matches.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Match Details</p>
                    <div className="space-y-2 max-h-[200px] overflow-auto">
                      {result.matches.map((match, idx) => (
                        <div
                          key={idx}
                          className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              MATCH_COLORS[idx % MATCH_COLORS.length]
                            }`}>
                              {idx + 1}
                            </span>
                            <span className="text-xs text-gray-500">
                              index {match.index}, length {match.length}
                            </span>
                            <button
                              onClick={() => copyToClipboard(match.match, `detail-${idx}`)}
                              className="ml-auto text-gray-400 hover:text-indigo-500"
                            >
                              {copiedItem === `detail-${idx}` ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            </button>
                          </div>
                          <code className="block text-sm font-mono text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-900 p-2 rounded">
                            {match.match}
                          </code>
                          {match.groups && match.groups.length > 0 && (
                            <div className="mt-2 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                              <p className="text-xs text-gray-500 mb-1">Captured groups:</p>
                              {match.groups.map((group, gidx) => (
                                <div key={gidx} className="flex items-center gap-2 text-sm">
                                  <span className="text-gray-400">${gidx + 1}:</span>
                                  <code className="font-mono text-gray-700 dark:text-gray-300">
                                    {group || '(empty)'}
                                  </code>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}

        {/* Generator Tab */}
        {activeTab === 'generator' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card padding="lg">
              <div className="flex items-center gap-2 mb-4">
                <Wand2 className="w-5 h-5 text-indigo-500" />
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  AI Regex Generator
                </h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Target Language
                  </label>
                  <select
                    value={genFlavor}
                    onChange={(e) => setGenFlavor(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
                  >
                    {FLAVORS.map(f => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    What do you want to match?
                  </label>
                  <textarea
                    value={genDescription}
                    onChange={(e) => setGenDescription(e.target.value)}
                    placeholder="e.g., email addresses, phone numbers starting with +1, URLs with https..."
                    className="w-full h-32 px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 resize-none"
                  />
                </div>

                <Button
                  onClick={handleGenerate}
                  disabled={!genDescription.trim() || isGenerating}
                  className="w-full"
                >
                  <Wand2 className="w-4 h-4 mr-2" />
                  {isGenerating ? 'Generating...' : 'Generate Regex'}
                </Button>
              </div>
            </Card>

            {generatedRegex && (
              <Card padding="lg">
                <div className="flex items-center gap-2 mb-4">
                  <BookOpen className="w-5 h-5 text-indigo-500" />
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                    Generated Pattern
                  </h3>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-500">Pattern</span>
                      <button
                        onClick={() => copyToClipboard(generatedRegex.pattern, 'gen-pattern')}
                        className="text-gray-400 hover:text-indigo-500"
                      >
                        {copiedItem === 'gen-pattern' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                    <code className="block font-mono text-lg text-gray-900 dark:text-gray-100 break-all">
                      /{generatedRegex.pattern}/{generatedRegex.flags}
                    </code>
                  </div>

                  {generatedRegex.explanation && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Explanation
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                        {generatedRegex.explanation}
                      </p>
                    </div>
                  )}

                  <Button
                    onClick={useGeneratedPattern}
                    variant="secondary"
                    className="w-full"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Test This Pattern
                  </Button>
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
