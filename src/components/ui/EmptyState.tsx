import React from 'react';

export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({ title, description, action }) => {
  return (
    <div className="py-16 px-6 text-center">
      <p className="text-base font-semibold text-[var(--sf-text-primary)]">{title}</p>
      {description && (
        <p className="mt-2 text-xs text-[var(--sf-text-muted)] max-w-sm mx-auto leading-relaxed">{description}</p>
      )}
      {action && (
        action.href ? (
          <a
            href={action.href}
            className="inline-block mt-4 text-xs font-medium text-brand-600 hover:text-brand-700 sf-transition"
          >
            {action.label} →
          </a>
        ) : action.onClick ? (
          <button
            onClick={action.onClick}
            className="inline-block mt-4 text-xs font-medium text-brand-600 hover:text-brand-700 sf-transition"
          >
            {action.label} →
          </button>
        ) : null
      )}
    </div>
  );
};
