import { useState, useMemo, useRef } from 'react';
import { diffLines } from 'diff';
import { ArrowLeftRight, Trash2, Copy, Check, GitCompare, Eye, EyeOff } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

function LineNumberedTextarea({ value, onChange, placeholder, label }) {
  const textareaRef = useRef(null);
  const lineCount = value.split('\n').length;
  const numbers = Array.from({ length: Math.max(lineCount, 1) }, (_, i) => i + 1);

  const handleScroll = () => {
    if (textareaRef.current) {
      const lineNumDiv = textareaRef.current.previousSibling;
      if (lineNumDiv) lineNumDiv.scrollTop = textareaRef.current.scrollTop;
    }
  };

  return (
    <Card padding="md">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {label}
      </label>
      <div className="flex rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
        <div className="w-10 flex-shrink-0 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 text-right py-3 pr-2 overflow-hidden select-none">
          <div className="text-xs text-gray-400 dark:text-gray-500 font-mono leading-5" style={{ minHeight: '12rem' }}>
            {numbers.map((n) => (
              <div key={n} className="h-5">{n}</div>
            ))}
          </div>
        </div>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={onChange}
          onScroll={handleScroll}
          placeholder={placeholder}
          spellCheck={false}
          className="flex-1 min-w-0 h-48 sm:h-64 p-3 bg-transparent text-gray-900 dark:text-gray-100 text-sm font-mono resize-y focus:ring-0 focus:border-transparent outline-none leading-5"
          style={{ tabSize: 2 }}
        />
      </div>
    </Card>
  );
}

export default function CodeDiff() {
  const [original, setOriginal] = useState('');
  const [modified, setModified] = useState('');
  const [hasCompared, setHasCompared] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showDiff, setShowDiff] = useState(true);

  const sideBySide = useMemo(() => {
    if (!hasCompared) return { left: [], right: [] };
    const diff = diffLines(original, modified);

    let leftNum = 1;
    let rightNum = 1;
    const left = [];
    const right = [];

    diff.forEach((part) => {
      const lines = part.value.split('\n');
      if (lines[lines.length - 1] === '') lines.pop();

      lines.forEach((line) => {
        if (part.added) {
          left.push({ text: '', type: 'blank', num: '' });
          right.push({ text: line, type: 'added', num: rightNum++ });
        } else if (part.removed) {
          left.push({ text: line, type: 'removed', num: leftNum++ });
          right.push({ text: '', type: 'blank', num: '' });
        } else {
          left.push({ text: line, type: 'context', num: leftNum++ });
          right.push({ text: line, type: 'context', num: rightNum++ });
        }
      });
    });

    return { left, right };
  }, [hasCompared, original, modified]);

  const handleCompare = () => {
    setHasCompared(true);
    setCopied(false);
  };

  const handleSwap = () => {
    setOriginal(modified);
    setModified(original);
    setHasCompared(false);
  };

  const handleClear = () => {
    setOriginal('');
    setModified('');
    setHasCompared(false);
    setCopied(false);
  };

  const handleCopyUnified = () => {
    const unified = diffLines(original, modified)
      .map((part) => {
        const prefix = part.added ? '+' : part.removed ? '-' : ' ';
        return part.value
          .split('\n')
          .filter((l) => l !== '')
          .map((l) => `${prefix}${l}`)
          .join('\n');
      })
      .filter(Boolean)
      .join('\n');
    navigator.clipboard.writeText(unified).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const lineStyle = (type) => {
    switch (type) {
      case 'removed':
        return 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300';
      case 'added':
        return 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300';
      case 'blank':
        return 'bg-gray-100 dark:bg-gray-800/50 text-gray-300 dark:text-gray-600';
      default:
        return 'text-gray-700 dark:text-gray-300';
    }
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-4 sm:mb-6">
          <GitCompare className="w-6 h-6 text-indigo-500" />
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
            Code Diff Checker
          </h2>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <LineNumberedTextarea
            label="Original"
            value={original}
            onChange={(e) => setOriginal(e.target.value)}
            placeholder="Paste original code here..."
          />
          <LineNumberedTextarea
            label="Modified"
            value={modified}
            onChange={(e) => setModified(e.target.value)}
            placeholder="Paste modified code here..."
          />
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Button onClick={handleCompare} size="md" className="min-h-[44px]">
            <GitCompare className="w-4 h-4 mr-2" />
            Compare
          </Button>
          <Button onClick={handleSwap} variant="secondary" size="md" className="min-h-[44px]">
            <ArrowLeftRight className="w-4 h-4 mr-2" />
            Swap
          </Button>
          <Button onClick={handleClear} variant="secondary" size="md" className="min-h-[44px] text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300">
            <Trash2 className="w-4 h-4 mr-2" />
            Clear
          </Button>
          {hasCompared && (
            <>
              <Button onClick={() => setShowDiff((s) => !s)} variant="secondary" size="md" className="min-h-[44px]">
                {showDiff ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                {showDiff ? 'Hide Diff' : 'Show Diff'}
              </Button>
              <Button onClick={handleCopyUnified} variant="secondary" size="md" className="min-h-[44px]">
                {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                {copied ? 'Copied!' : 'Copy Unified'}
              </Button>
            </>
          )}
        </div>

        {/* Side-by-side Diff */}
        {hasCompared && showDiff && (
          <Card padding="none" className="overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Side-by-side Comparison
              </span>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800" />
                  Removed
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800" />
                  Added
                </span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <div className="grid grid-cols-2 min-w-[600px]">
                {/* Left pane */}
                <div className="border-r border-gray-200 dark:border-gray-700">
                  <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-4 py-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    Original
                  </div>
                  <div className="max-h-[500px] overflow-y-auto text-sm font-mono">
                    {sideBySide.left.map((line, i) => (
                      <div key={`L-${i}`} className={`flex ${lineStyle(line.type)}`}>
                        <span className="w-10 flex-shrink-0 text-right pr-2 py-0.5 text-gray-400 dark:text-gray-500 select-none border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                          {line.num || ''}
                        </span>
                        <span className="flex-1 pl-3 py-0.5 whitespace-pre min-w-0">
                          {line.text || ' '}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right pane */}
                <div>
                  <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-4 py-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    Modified
                  </div>
                  <div className="max-h-[500px] overflow-y-auto text-sm font-mono">
                    {sideBySide.right.map((line, i) => (
                      <div key={`R-${i}`} className={`flex ${lineStyle(line.type)}`}>
                        <span className="w-10 flex-shrink-0 text-right pr-2 py-0.5 text-gray-400 dark:text-gray-500 select-none border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                          {line.num || ''}
                        </span>
                        <span className="flex-1 pl-3 py-0.5 whitespace-pre min-w-0">
                          {line.text || ' '}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
