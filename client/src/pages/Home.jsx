import { useNavigate } from 'react-router-dom';
import { Languages, Image as ImageIcon, FileText, GitCompare, ArrowRight, Scan, PenTool, Code, Camera, Monitor, Database } from 'lucide-react';
import Card from '../components/ui/Card';

export default function Home() {
  const navigate = useNavigate();

  const tools = [
    {
      title: 'Translate',
      description: 'Translate text between multiple languages with ease.',
      icon: Languages,
      path: '/translate',
      color: 'bg-blue-500'
    },
    {
      title: 'Image Converter',
      description: 'Convert images between formats and resize them.',
      icon: ImageIcon,
      path: '/image',
      color: 'bg-green-500'
    },
    {
      title: 'Text Tools',
      description: 'Analyze, transform, and encode text utilities.',
      icon: FileText,
      path: '/text',
      color: 'bg-purple-500'
    },
    {
      title: 'Code Diff',
      description: 'Compare two versions of code side by side.',
      icon: GitCompare,
      path: '/code-diff',
      color: 'bg-orange-500'
    },
    {
      title: 'Code Tools',
      description: 'Encryption, hashing, JSON tools, serialization, and encoding utilities.',
      icon: Code,
      path: '/code',
      color: 'bg-red-500'
    },
    {
      title: 'Device Tester',
      description: 'Test camera and microphone functionality with real-time monitoring.',
      icon: Camera,
      path: '/device-tester',
      color: 'bg-teal-500'
    },
    {
      title: 'Device Diagnostics',
      description: 'Comprehensive hardware diagnostics and system information.',
      icon: Monitor,
      path: '/device-diagnostics',
      color: 'bg-purple-600'
    },
    {
      title: 'SQL AI',
      description: 'Generate SQL queries from plain English for MySQL, PostgreSQL, and SQLite.',
      icon: Database,
      path: '/sql-ai',
      color: 'bg-indigo-600'
    },
    {
      title: 'Image to Text',
      description: 'Extract text from images using OCR technology.',
      icon: Scan,
      path: '/ocr',
      color: 'bg-pink-500'
    },
    {
      title: 'Image Editor',
      description: 'Professional image editing with filters, merge, and annotations.',
      icon: PenTool,
      path: '/image-editor',
      color: 'bg-indigo-500'
    }
  ];

  return (
    <div className="p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="relative overflow-hidden rounded-3xl border border-gray-200 dark:border-gray-800 bg-gradient-to-br from-indigo-50 via-white to-white dark:from-indigo-950/40 dark:via-gray-950 dark:to-gray-950">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-indigo-400/20 blur-3xl" />
              <div className="absolute -bottom-24 -left-24 w-64 h-64 rounded-full bg-indigo-600/10 blur-3xl" />
            </div>
            <div className="relative p-6 sm:p-10">
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                <div>
                  <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-3 tracking-tight">
                    Welcome to ToolBox
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 max-w-2xl">
                    A clean, fast workspace for translations, conversions, diagnostics, and daily utilities.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => navigate('/translate')}
                    className="px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-semibold transition-colors"
                  >
                    Start with Translate
                  </button>
                  <button
                    onClick={() => navigate('/device-diagnostics')}
                    className="px-4 py-2 rounded-xl bg-white/80 dark:bg-gray-900/60 hover:bg-white dark:hover:bg-gray-900 text-gray-900 dark:text-gray-100 font-semibold border border-gray-200 dark:border-gray-800 transition-colors"
                  >
                    Run Diagnostics
                  </button>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-2xl bg-white/70 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800 p-4">
                  <div className="text-xs text-gray-600 dark:text-gray-400">Tools</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{tools.length}</div>
                </div>
                <div className="rounded-2xl bg-white/70 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800 p-4">
                  <div className="text-xs text-gray-600 dark:text-gray-400">Theme</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">Light/Dark</div>
                </div>
                <div className="rounded-2xl bg-white/70 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800 p-4">
                  <div className="text-xs text-gray-600 dark:text-gray-400">Fast</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">Vite</div>
                </div>
                <div className="rounded-2xl bg-white/70 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800 p-4">
                  <div className="text-xs text-gray-600 dark:text-gray-400">UI</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">Tailwind</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tools.map((tool) => (
            <Card
              key={tool.title}
              hover
              className="group hover:-translate-y-0.5 transition-transform duration-200"
              onClick={() => navigate(tool.path)}
            >
              <div className="flex items-start gap-4">
                <div className={`${tool.color} p-3 rounded-2xl shadow-sm ring-1 ring-black/5`}>
                  <tool.icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors">
                    {tool.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {tool.description}
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-all group-hover:translate-x-1" />
              </div>
            </Card>
          ))}
        </div>

        <div className="mt-12">
          <div className="p-6 rounded-3xl border border-indigo-100 dark:border-indigo-800 bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-900/20 dark:to-gray-950">
            <h3 className="font-semibold text-indigo-900 dark:text-indigo-300 mb-2">
              Coming Soon
            </h3>
            <p className="text-sm text-indigo-700 dark:text-indigo-400">
              More tools are on the way! We&apos;re working on adding PDF tools, code formatters,
              and data converters to make your workflow even smoother.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
