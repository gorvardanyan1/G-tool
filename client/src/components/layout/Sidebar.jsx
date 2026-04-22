import { useState, useEffect } from 'react';
import { LayoutDashboard, Languages, Image as ImageIcon, FileText, Sun, Moon, Settings, Calculator, Grid3X3, Menu, X, GitCompare, Scan, PenTool, Code, Camera, Monitor, Database } from 'lucide-react';
import SidebarItem from './SidebarItem';
import { useTheme } from '../../hooks/useTheme';

export default function Sidebar() {
  const { theme, toggleTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu on window resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const navItems = (
    <>
      <SidebarItem to="/" icon={LayoutDashboard} label="Home" onClick={() => setIsMobileMenuOpen(false)} />
      <SidebarItem to="/translate" icon={Languages} label="Translate" onClick={() => setIsMobileMenuOpen(false)} />
      <SidebarItem to="/image" icon={ImageIcon} label="Converter" onClick={() => setIsMobileMenuOpen(false)} />
      <SidebarItem to="/image-editor" icon={PenTool} label="Editor" onClick={() => setIsMobileMenuOpen(false)} />
      <SidebarItem to="/text" icon={FileText} label="Text" onClick={() => setIsMobileMenuOpen(false)} />
      <SidebarItem to="/code-diff" icon={GitCompare} label="Diff" onClick={() => setIsMobileMenuOpen(false)} />
      <SidebarItem to="/code" icon={Code} label="Code" onClick={() => setIsMobileMenuOpen(false)} />
      <SidebarItem to="/device-tester" icon={Camera} label="Device Test" onClick={() => setIsMobileMenuOpen(false)} />
      <SidebarItem to="/device-diagnostics" icon={Monitor} label="Diagnostics" onClick={() => setIsMobileMenuOpen(false)} />
      <SidebarItem to="/sql-ai" icon={Database} label="SQL AI" onClick={() => setIsMobileMenuOpen(false)} />
      <SidebarItem to="/ocr" icon={Scan} label="OCR" onClick={() => setIsMobileMenuOpen(false)} />

      {/* Placeholder slots for future tools */}
      <div className="pt-4 border-t border-gray-300 dark:border-gray-700 mt-4 space-y-1">
        <SidebarItem to="#" icon={Calculator} label="Tool 5" isPlaceholder />
        <SidebarItem to="#" icon={Settings} label="Tool 6" isPlaceholder />
        <SidebarItem to="#" icon={Grid3X3} label="Tool 7" isPlaceholder />
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Header with Hamburger */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white/80 dark:bg-gray-950/70 backdrop-blur border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-b from-indigo-500 to-indigo-600 flex items-center justify-center shadow-sm ring-1 ring-indigo-400/50">
            <img
              src="/gtool-logo-final.svg"
              alt="ToolBox Logo"
              className="w-6 h-6"
            />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">ToolBox</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">All-in-one utilities</div>
          </div>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-all"
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-[72px] bg-gray-100 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex-col z-50">
      {/* Logo area */}
      <div className="flex items-center justify-center h-16 border-b border-gray-200 dark:border-gray-800">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-b from-indigo-500 to-indigo-600 flex items-center justify-center shadow-sm ring-1 ring-indigo-400/50">
          <img
            src="/gtool-logo-final.svg"
            alt="ToolBox Logo"
            className="w-6 h-6"
          />
        </div>
      </div>

      {/* Navigation items */}
      <nav className="flex-1 py-4 px-2 space-y-2 overflow-y-auto">
        {navItems}
      </nav>

      {/* Theme toggle at bottom */}
      <div className="p-2 border-t border-gray-200 dark:border-gray-800">
        <button
          onClick={toggleTheme}
          className="flex flex-col items-center justify-center w-full py-3 px-2 rounded-2xl text-gray-600 dark:text-gray-400 hover:bg-white/60 dark:hover:bg-gray-800/70 hover:text-gray-900 dark:hover:text-gray-100 transition-all duration-200 ring-0 hover:ring-1 hover:ring-gray-300/60 dark:hover:ring-gray-700/60"
          aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        >
          {theme === 'light' ? (
            <>
              <Moon className="w-6 h-6 mb-1" />
              <span className="text-[10px] font-medium leading-tight">Dark</span>
            </>
          ) : (
            <>
              <Sun className="w-6 h-6 mb-1" />
              <span className="text-[10px] font-medium leading-tight">Light</span>
            </>
          )}
        </button>
      </div>
    </aside>

      {/* Mobile Slide-out Menu */}
      {isMobileMenuOpen && (
        <>
          {/* Overlay */}
          <div
            className="md:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          {/* Mobile Drawer */}
          <aside className="md:hidden fixed left-0 top-16 bottom-0 w-[72px] bg-gray-100 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col z-50 animate-in slide-in-from-left">
            <nav className="flex-1 py-4 px-2 space-y-2 overflow-y-auto">
              {navItems}
            </nav>
            {/* Theme toggle at bottom for mobile */}
            <div className="p-2 border-t border-gray-200 dark:border-gray-800">
              <button
                onClick={toggleTheme}
                className="flex flex-col items-center justify-center w-full py-3 px-2 rounded-2xl text-gray-600 dark:text-gray-400 hover:bg-white/60 dark:hover:bg-gray-800/70 hover:text-gray-900 dark:hover:text-gray-100 transition-all duration-200 ring-0 hover:ring-1 hover:ring-gray-300/60 dark:hover:ring-gray-700/60"
                aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
              >
                {theme === 'light' ? (
                  <>
                    <Moon className="w-6 h-6 mb-1" />
                    <span className="text-[10px] font-medium leading-tight">Dark</span>
                  </>
                ) : (
                  <>
                    <Sun className="w-6 h-6 mb-1" />
                    <span className="text-[10px] font-medium leading-tight">Light</span>
                  </>
                )}
              </button>
            </div>
          </aside>
        </>
      )}
    </>
  );
}
