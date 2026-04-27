import { useState, useEffect, useCallback } from 'react';
import { Send, Trash2, Clock, Save, History, ChevronDown, ChevronUp, Plus, X } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { apiTesterApi } from '../utils/api';

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
const BODY_TYPES = [
  { value: 'none', label: 'None' },
  { value: 'json', label: 'JSON' },
  { value: 'urlencoded', label: 'Form URL-encoded' },
  { value: 'raw', label: 'Raw' }
];

const STATUS_COLORS = {
  2: 'text-green-600 dark:text-green-400',
  3: 'text-yellow-600 dark:text-yellow-400',
  4: 'text-orange-600 dark:text-orange-400',
  5: 'text-red-600 dark:text-red-400'
};

export default function ApiTester() {
  const [url, setUrl] = useState('');
  const [method, setMethod] = useState('GET');
  const [headers, setHeaders] = useState([{ key: '', value: '' }]);
  const [bodyType, setBodyType] = useState('none');
  const [body, setBody] = useState('');
  const [response, setResponse] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showHeaders, setShowHeaders] = useState(true);
  const [showResponseHeaders, setShowResponseHeaders] = useState(false);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  // Load history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('apiTesterHistory');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load history:', e);
      }
    }
  }, []);

  // Save history to localStorage
  useEffect(() => {
    localStorage.setItem('apiTesterHistory', JSON.stringify(history));
  }, [history]);

  const addHeader = () => {
    setHeaders([...headers, { key: '', value: '' }]);
  };

  const removeHeader = (index) => {
    setHeaders(headers.filter((_, i) => i !== index));
  };

  const updateHeader = (index, field, value) => {
    const newHeaders = [...headers];
    newHeaders[index][field] = value;
    setHeaders(newHeaders);
  };

  const formatJson = (text) => {
    try {
      // First try strict JSON parse
      return { success: true, text: JSON.stringify(JSON.parse(text), null, 2) };
    } catch {
      // Try to convert JavaScript object syntax to JSON
      try {
        // Fix common JS object syntax issues:
        // 1. Unquoted keys: {a:1} -> {"a":1}
        // 2. Single quotes: {'a':'b'} -> {"a":"b"}
        // 3. Trailing commas: {a:1,} -> {a:1}
        let fixed = text
          .replace(/(['"])(\w+)\1\s*:/g, '"$2":') // quoted keys -> keep as is, we'll handle below
          .replace(/(\w+)\s*:/g, '"$1":') // unquoted keys -> quoted
          .replace(/'([^'\\]*)'/g, '"$1"') // single quotes -> double quotes
          .replace(/,\s*([}\]])/g, '$1'); // trailing commas -> remove

        return { success: true, text: JSON.stringify(JSON.parse(fixed), null, 2) };
      } catch (err2) {
        return { success: false, error: `Invalid JSON: ${err2.message}` };
      }
    }
  };

  const handleSend = async () => {
    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResponse(null);

    try {
      // Build headers object
      const headerObj = {};
      headers.forEach(h => {
        if (h.key.trim()) {
          headerObj[h.key.trim()] = h.value;
        }
      });

      let requestBody = body;
      if (bodyType === 'json' && body.trim()) {
        try {
          requestBody = JSON.parse(body);
        } catch {
          setError('Invalid JSON in request body');
          setIsLoading(false);
          return;
        }
      } else if (bodyType === 'urlencoded' && body.trim()) {
        try {
          requestBody = JSON.parse(body);
        } catch {
          // Keep as string if not valid JSON object
        }
      }

      const { data } = await apiTesterApi.proxy(
        url,
        method,
        headerObj,
        requestBody,
        bodyType
      );

      if (data.success) {
        setResponse(data.data);

        // Add to history
        const historyItem = {
          id: Date.now(),
          url,
          method,
          timestamp: new Date().toISOString()
        };
        setHistory(prev => [historyItem, ...prev.slice(0, 49)]);
      } else {
        setError(data.error || 'Request failed');
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const loadFromHistory = (item) => {
    setUrl(item.url);
    setMethod(item.method);
  };

  const deleteHistoryItem = (id, e) => {
    e.stopPropagation();
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  const clearHistory = () => {
    if (confirm('Clear all history?')) {
      setHistory([]);
    }
  };

  const getStatusColor = (status) => {
    const firstDigit = Math.floor(status / 100);
    return STATUS_COLORS[firstDigit] || 'text-gray-600 dark:text-gray-400';
  };

  const formatResponseBody = (body) => {
    if (typeof body === 'object') {
      return JSON.stringify(body, null, 2);
    }
    return body;
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
            API Tester
          </h2>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all"
          >
            <History className="w-4 h-4" />
            History ({history.length})
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Request Form */}
          <div className="lg:col-span-3 space-y-6">
            {/* URL Bar */}
            <Card padding="lg">
              <div className="flex flex-col sm:flex-row gap-3">
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {HTTP_METHODS.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://api.example.com/endpoint"
                  className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <Button
                  onClick={handleSend}
                  disabled={isLoading}
                  className="min-h-[44px]"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {isLoading ? 'Sending...' : 'Send'}
                </Button>
              </div>
            </Card>

            {/* Headers Section */}
            <Card padding="lg">
              <button
                onClick={() => setShowHeaders(!showHeaders)}
                className="flex items-center justify-between w-full mb-4"
              >
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  Headers
                </h3>
                {showHeaders ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>

              {showHeaders && (
                <div className="space-y-3">
                  {headers.map((header, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Key"
                        value={header.key}
                        onChange={(e) => updateHeader(index, 'key', e.target.value)}
                        className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <input
                        type="text"
                        placeholder="Value"
                        value={header.value}
                        onChange={(e) => updateHeader(index, 'value', e.target.value)}
                        className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <button
                        onClick={() => removeHeader(index)}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={addHeader}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    Add Header
                  </button>
                </div>
              )}
            </Card>

            {/* Body Section */}
            {method !== 'GET' && method !== 'HEAD' && (
              <Card padding="lg">
                <div className="flex items-center gap-4 mb-4">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                    Body
                  </h3>
                  <div className="flex gap-2">
                    {BODY_TYPES.map(type => (
                      <button
                        key={type.value}
                        onClick={() => setBodyType(type.value)}
                        className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
                          bodyType === type.value
                            ? 'bg-indigo-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                {bodyType !== 'none' && (
                  <div className="space-y-3">
                    <textarea
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      placeholder={
                        bodyType === 'json' ? '{\n  "key": "value"\n}' :
                        bodyType === 'urlencoded' ? '{\n  "key": "value"\n}' :
                        'Raw body content...'
                      }
                      className="w-full h-48 px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    {bodyType === 'json' && body.trim() && (
                      <button
                        onClick={() => {
                          const result = formatJson(body);
                          if (result.success) {
                            setBody(result.text);
                          } else {
                            setError(result.error);
                          }
                        }}
                        className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        Format JSON
                      </button>
                    )}
                  </div>
                )}
              </Card>
            )}

            {/* Response Section */}
            {(response || error) && (
              <Card padding="lg">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Response
                </h3>

                {error && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <p className="text-red-600 dark:text-red-400">{error}</p>
                  </div>
                )}

                {response && (
                  <div className="space-y-4">
                    {/* Status Line */}
                    <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <span className={`text-2xl font-bold ${getStatusColor(response.status)}`}>
                        {response.status}
                      </span>
                      <span className="text-gray-600 dark:text-gray-400">
                        {response.statusText}
                      </span>
                      <span className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                        <Clock className="w-4 h-4" />
                        {response.responseTime}ms
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {Math.round(response.size / 1024 * 100) / 100} KB
                      </span>
                    </div>

                    {/* Response Headers */}
                    <div>
                      <button
                        onClick={() => setShowResponseHeaders(!showResponseHeaders)}
                        className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 mb-2"
                      >
                        {showResponseHeaders ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        Headers ({Object.keys(response.headers).length})
                      </button>
                      {showResponseHeaders && (
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-sm font-mono">
                          {Object.entries(response.headers).map(([key, value]) => (
                            <div key={key} className="py-1">
                              <span className="text-indigo-600 dark:text-indigo-400">{key}:</span>{' '}
                              <span className="text-gray-700 dark:text-gray-300">{value}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Response Body */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Body
                      </h4>
                      <pre className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-sm font-mono text-gray-900 dark:text-gray-100 overflow-x-auto whitespace-pre-wrap break-all">
                        {formatResponseBody(response.body)}
                      </pre>
                    </div>
                  </div>
                )}
              </Card>
            )}
          </div>

          {/* History Sidebar */}
          {showHistory && (
            <div className="lg:col-span-1">
              <Card padding="lg" className="sticky top-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                    History
                  </h3>
                  <button
                    onClick={clearHistory}
                    className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                    title="Clear history"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {history.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    No history yet
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {history.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => loadFromHistory(item)}
                        className="w-full text-left p-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all group"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                            item.method === 'GET' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                            item.method === 'POST' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                            item.method === 'PUT' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                            item.method === 'DELETE' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                            'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
                          }`}>
                            {item.method}
                          </span>
                          <button
                            onClick={(e) => deleteHistoryItem(item.id, e)}
                            className="ml-auto opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                        <p className="text-sm text-gray-900 dark:text-gray-100 truncate">
                          {item.url}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {new Date(item.timestamp).toLocaleString()}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
