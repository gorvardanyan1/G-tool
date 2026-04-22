export default function Card({
  children,
  className = '',
  padding = 'md',
  hover = false,
  ...props
}) {
  const baseStyles = 'bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800';

  const paddings = {
    none: '',
    sm: 'p-3 sm:p-4',
    md: 'p-4 sm:p-6',
    lg: 'p-5 sm:p-8'
  };

  const hoverStyles = hover
    ? 'hover:shadow-md dark:hover:shadow-lg transition-shadow duration-200 cursor-pointer'
    : '';

  return (
    <div className={`${baseStyles} ${paddings[padding]} ${hoverStyles} ${className}`} {...props}>
      {children}
    </div>
  );
}
