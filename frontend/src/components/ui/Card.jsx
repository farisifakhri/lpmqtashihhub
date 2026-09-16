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
    default: 'bg-white border-slate-200 text-slate-800 shadow-2xs',
    billing: 'bg-gold-50/70 border-gold-300 text-slate-900 shadow-2xs',
    subtle: 'bg-slate-50 border-slate-200 text-slate-700',
    elevated: 'bg-white border-slate-200 text-slate-800 shadow-md',
  };

  return (
    <div
      className={twMerge(
        clsx('rounded-xl border p-5 sm:p-6 transition-all duration-150', variantStyles[variant], className)
      )}
      {...props}
    >
      {(title || subtitle || headerAction) && (
        <div className="flex items-start justify-between mb-4 border-b border-slate-100 pb-3">
          <div>
            {title && <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          {headerAction && <div className="flex-shrink-0">{headerAction}</div>}
        </div>
      )}
      {children}
    </div>
  );
};

export default Card;
