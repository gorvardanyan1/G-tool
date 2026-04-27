import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import Sidebar from './components/layout/Sidebar';
import Home from './pages/Home';
import Translate from './pages/Translate';
import ImageConverter from './pages/ImageConverter';
import TextTools from './pages/TextTools';
import CodeDiff from './pages/CodeDiff';
import Ocr from './pages/Ocr';
import ImageEditor from './pages/ImageEditor';
import Code from './pages/Code';
import DeviceTester from './pages/DeviceTester';
import DeviceDiagnostics from './pages/DeviceDiagnostics';
import SqlAi from './pages/SqlAi';
import QrGenerator from './pages/QrGenerator';
import ApiTester from './pages/ApiTester';
import ColorPalette from './pages/ColorPalette';
import RegexTester from './pages/RegexTester';
import NotFound from './pages/NotFound';

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <div className="flex min-h-screen bg-white dark:bg-gray-950">
          <Sidebar />
          <main className="flex-1 md:ml-[72px] pt-16 md:pt-0">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/translate" element={<Translate />} />
              <Route path="/image" element={<ImageConverter />} />
              <Route path="/text" element={<TextTools />} />
              <Route path="/code-diff" element={<CodeDiff />} />
              <Route path="/ocr" element={<Ocr />} />
              <Route path="/image-editor" element={<ImageEditor />} />
              <Route path="/code" element={<Code />} />
              <Route path="/device-tester" element={<DeviceTester />} />
              <Route path="/device-diagnostics" element={<DeviceDiagnostics />} />
              <Route path="/sql-ai" element={<SqlAi />} />
              <Route path="/api-tester" element={<ApiTester />} />
              <Route path="/qr" element={<QrGenerator />} />
              <Route path="/regex" element={<RegexTester />} />
              <Route path="/color" element={<ColorPalette />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
