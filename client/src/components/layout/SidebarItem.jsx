import { NavLink } from 'react-router-dom';

export default function SidebarItem({ to, icon: Icon, label, isPlaceholder = false, onClick }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex flex-col items-center justify-center w-full min-h-[48px] py-3 px-2 rounded-2xl transition-all duration-200 group relative ${
          isPlaceholder
            ? 'opacity-40 cursor-not-allowed'
            : isActive
            ? 'bg-gradient-to-b from-indigo-500 to-indigo-600 text-white shadow-sm ring-1 ring-indigo-400/60'
            : 'text-gray-600 dark:text-gray-400 hover:bg-white/60 dark:hover:bg-gray-800/70 hover:text-gray-900 dark:hover:text-gray-100 hover:ring-1 hover:ring-gray-300/60 dark:hover:ring-gray-700/60'
        }`
      }
      onClick={(e) => {
        if (isPlaceholder) {
          e.preventDefault();
        } else if (onClick) {
          onClick(e);
        }
      }}
    >
      <div className="flex items-center justify-center w-10 h-10 rounded-2xl transition-colors duration-200 group-hover:bg-gray-100/70 dark:group-hover:bg-gray-900/30">
        <Icon className="w-6 h-6" />
      </div>
      <span className="text-[10px] font-semibold leading-tight text-center mt-1.5">
        {label}
      </span>
    </NavLink>
  );
}
