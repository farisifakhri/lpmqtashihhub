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
    default: 'bg-white border-slate-200/90 text-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_10px_20px_-5px_rgba(8,50,36,0.03)]',
    billing: 'bg-gradient-to-br from-gold-50/80 via-white to-amber-50/40 border-gold-300 text-slate-900 shadow-sm',
    subtle: 'bg-slate-50/80 border-slate-200/80 text-slate-700',
    elevated: 'bg-white border-slate-200/80 text-slate-800 shadow-md',
  };

  return (
    <div
      className={twMerge(
        clsx('rounded-xl border p-6 transition-all duration-200', variantStyles[variant], className)
      )}
      {...props}
    >
      {(title || subtitle || headerAction) && (
        <div className="flex items-start justify-between mb-4 border-b border-slate-100 pb-3.5">
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
