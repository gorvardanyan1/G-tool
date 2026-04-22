export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  type = 'button',
  onClick,
  ...props
}) {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900';

  const variants = {
    primary: 'bg-indigo-500 text-white hover:bg-indigo-600 active:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed',
    secondary: 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-700 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed',
    outline: 'border-2 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-indigo-500 hover:text-indigo-500 dark:hover:border-indigo-400 dark:hover:text-indigo-400',
    ghost: 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
  };

  const sizes = {
    sm: 'px-3 py-2 min-h-[44px] text-sm',
    md: 'px-4 py-2.5 min-h-[44px] text-sm',
    lg: 'px-6 py-3 min-h-[48px] text-base'
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
