import { Menu } from 'lucide-react';

export default function TopBar({ title }) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
        {title}
      </h1>
      <div className="flex items-center gap-4">
        {/* Additional top bar actions can go here */}
      </div>
    </div>
  );
}
