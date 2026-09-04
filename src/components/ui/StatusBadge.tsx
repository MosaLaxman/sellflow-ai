import React from 'react';

interface StatusBadgeProps {
  variant: 'success' | 'warning' | 'error' | 'neutral' | 'info';
  children: React.ReactNode;
  className?: string;
}

const VARIANT_STYLES: Record<StatusBadgeProps['variant'], string> = {
  success: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40',
  warning: 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40',
  error: 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/40',
  neutral: 'text-stone-600 dark:text-stone-400 bg-stone-100 dark:bg-stone-800',
  info: 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40',
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ variant, children, className = '' }) => {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${VARIANT_STYLES[variant]} ${className}`}
    >
      {children}
    </span>
  );
};
