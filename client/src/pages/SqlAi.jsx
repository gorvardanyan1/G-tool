import { useMemo, useState } from 'react';
import { Sparkles, Copy, Check, Trash2 } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import api from '../utils/api';

export default function SqlAi() {
  const [dialect, setDialect] = useState('mysql');
  const [prompt, setPrompt] = useState('');
  const [sql, setSql] = useState('');
  const [explanation, setExplanation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const examples = useMemo(
    () => [
      {
        title: 'NOT NULL filter',
        text: "Get user_id in table 'post' where comment_id is not null"
      },
      {
        title: 'Last 10 posts',
        text: 'Get last 10 posts ordered by created_at desc'
      },
      {
        title: 'Count per group',
        text: 'Count comments per post_id and show only posts with more than 5 comments'
      },
      {
        title: 'Join example',
        text: 'Get post title and user name by joining posts and users'
      }
    ],
    []
  );

  const handleGenerate = async () => {
    try {
      setError('');
      setSql('');
      setExplanation('');

      if (!prompt.trim()) {
        setError('Please enter a request.');
        return;
      }

      setLoading(true);

      const { data } = await api.post('/sql-ai/generate', {
        prompt: prompt.trim(),
        dialect
      });

      if (!data?.success) {
        setError(data?.error || 'Failed to generate SQL');
        return;
      }

      setSql(typeof data.data?.sql === 'string' ? data.data.sql : '');
      setExplanation(typeof data.data?.explanation === 'string' ? data.data.explanation : '');
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'Failed to generate SQL');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!sql) return;
    try {
      await navigator.clipboard.writeText(sql);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setError('Copy failed.');
    }
  };

  const handleClear = () => {
    setPrompt('');
    setSql('');
    setExplanation('');
    setError('');
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">SQL AI</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Describe what you want in plain English. I’ll generate the SQL and explain it.
          </p>
        </div>

        {error && (
          <Card className="mb-6 border-red-200 dark:border-red-800">
            <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Dialect
                  </label>
                  <select
                    value={dialect}
                    onChange={(e) => setDialect(e.target.value)}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  >
                    <option value="mysql">MySQL</option>
                    <option value="postgres">PostgreSQL</option>
                    <option value="sqlite">SQLite</option>
                  </select>
                </div>

                <div className="flex items-end gap-3">
                  <Button onClick={handleGenerate} disabled={loading} className="w-full">
                    <Sparkles className="w-4 h-4 mr-2" />
                    {loading ? 'Generating…' : 'Generate'}
                  </Button>
                  <Button onClick={handleClear} variant="secondary" disabled={loading}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Request
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={6}
                  placeholder="Example: Get user_id in table 'post' where comment_id is not null"
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
          </Card>

          <Card>
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Examples</h3>
              <div className="space-y-2">
                {examples.map((ex) => (
                  <button
                    key={ex.title}
                    onClick={() => setPrompt(ex.text)}
                    className="w-full text-left p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-400 transition-colors"
                  >
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{ex.title}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">{ex.text}</div>
                  </button>
                ))}
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Generated SQL</h3>
              <Button onClick={handleCopy} variant="outline" disabled={!sql}>
                {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
            <textarea
              value={sql}
              readOnly
              rows={10}
              placeholder="Your SQL will appear here…"
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-mono text-sm"
            />
          </Card>

          <Card>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Explanation</h3>
            <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap min-h-[240px]">
              {explanation || 'Explanation will appear here…'}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
