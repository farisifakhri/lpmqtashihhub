import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const Card = ({
  children,
  className,
  variant = 'default',
  title,
  subtitle,
  headerAction,
  ...props
}) => {
  const variantStyles = {
    default: 'bg-white border-line text-ink shadow-2xs',
    billing: 'bg-civicGold-100/70 border-civicGold-700 text-ink shadow-2xs',
    subtle: 'bg-canvas border-line text-ink',
    elevated: 'bg-white border-line text-ink shadow-md',
  };

  return (
    <div
      className={twMerge(
        clsx('rounded-xl border p-5 sm:p-6 transition-all duration-150', variantStyles[variant], className)
      )}
      {...props}
    >
      {(title || subtitle || headerAction) && (
        <div className="flex items-start justify-between mb-4 border-b border-line pb-3">
          <div>
            {title && <h3 className="text-base sm:text-lg font-bold text-ink tracking-tight">{title}</h3>}
            {subtitle && <p className="text-xs text-ink-muted mt-0.5">{subtitle}</p>}
          </div>
          {headerAction && <div className="flex-shrink-0">{headerAction}</div>}
        </div>
      )}
      {children}
    </div>
  );
};

export default Card;
