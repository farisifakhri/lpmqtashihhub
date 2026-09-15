import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  className,
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none select-none min-h-[44px] active:scale-[0.98] cursor-pointer';

  const sizeStyles = {
    sm: 'text-xs px-3.5 py-1.5 gap-1.5 font-semibold',
    md: 'text-sm px-4.5 py-2 gap-2 font-semibold',
    lg: 'text-base px-6 py-3 gap-2.5 font-bold',
  };

  const variantStyles = {
    primary:
      'bg-gradient-to-b from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white shadow-xs shadow-primary-950/15 hover:shadow-sm border border-primary-700/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] focus:ring-primary-600',
    secondary:
      'bg-primary-50 hover:bg-primary-100 text-primary-800 hover:text-primary-900 border border-primary-200/80 shadow-2xs focus:ring-primary-500 font-semibold',
    outline:
      'bg-white hover:bg-primary-50/40 border border-slate-300 hover:border-primary-600/60 text-slate-700 hover:text-primary-800 shadow-2xs focus:ring-primary-500 font-semibold',
    danger:
      'bg-gradient-to-b from-rose-500 to-rose-700 hover:from-rose-600 hover:to-rose-800 text-white shadow-xs shadow-rose-950/15 hover:shadow-sm border border-rose-700/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] focus:ring-rose-500',
    gold:
      'bg-gradient-to-b from-gold-400 via-gold-500 to-gold-600 hover:from-gold-500 hover:to-gold-700 text-white shadow-xs shadow-gold-950/20 hover:shadow-sm border border-gold-600/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.3)] focus:ring-gold-400 font-bold',
    ghost:
      'bg-transparent text-slate-700 hover:bg-slate-100/80 hover:text-slate-900 active:bg-slate-200/60 focus:ring-slate-400 shadow-none border-transparent',
  };

  return (
    <button
      className={twMerge(
        clsx(baseStyles, sizeStyles[size], variantStyles[variant], className)
      )}
      disabled={disabled}
      {...props}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </button>
  );
};
