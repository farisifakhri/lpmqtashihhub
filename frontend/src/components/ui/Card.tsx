import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'billing' | 'subtle';
  title?: string;
  subtitle?: string;
  headerAction?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  variant = 'default',
  title,
  subtitle,
  headerAction,
  ...props
}) => {
  const variantStyles = {
    default: 'bg-white border-neutral-200 text-neutral-800 shadow-xs',
    billing: 'bg-gold-50 border-gold-400 text-neutral-900 shadow-sm',
    subtle: 'bg-neutral-50 border-neutral-200 text-neutral-700',
  };

  return (
    <div
      className={twMerge(
        clsx('rounded-lg border p-6 transition-all', variantStyles[variant], className)
      )}
      {...props}
    >
      {(title || subtitle || headerAction) && (
        <div className="flex items-start justify-between mb-4 border-b border-neutral-100 pb-3">
          <div>
            {title && <h3 className="text-lg font-semibold text-neutral-900">{title}</h3>}
            {subtitle && <p className="text-xs text-neutral-500 mt-0.5">{subtitle}</p>}
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      {children}
    </div>
  );
};
