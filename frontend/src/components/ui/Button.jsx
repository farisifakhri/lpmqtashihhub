import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const renderIcon = (icon) => {
  if (!icon) return null;
  if (React.isValidElement(icon)) return icon;
  if (typeof icon === 'function' || (typeof icon === 'object' && icon !== null && icon.$$typeof)) {
    const IconComponent = icon;
    return <IconComponent className="w-4 h-4" />;
  }
  return icon;
};

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
    'inline-flex items-center justify-center font-medium rounded-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none select-none min-h-[44px] active:scale-[0.99] cursor-pointer';

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 gap-1.5 font-semibold min-h-[38px]',
    md: 'text-sm px-4 py-2 gap-2 font-semibold min-h-[44px]',
    lg: 'text-base px-6 py-2.5 gap-2.5 font-bold min-h-[48px]',
  };

  const variantStyles = {
    primary:
      'bg-primary-700 hover:bg-primary-800 text-white shadow-2xs border border-primary-800 focus:ring-emerald-700',
    secondary:
      'bg-primary-50 hover:bg-primary-100 text-primary-900 border border-primary-200 shadow-2xs focus:ring-emerald-700 font-semibold',
    outline:
      'bg-white hover:bg-slate-50 border border-slate-300 hover:border-slate-400 text-slate-800 shadow-2xs focus:ring-emerald-700 font-semibold',
    danger:
      'bg-rose-700 hover:bg-rose-800 text-white shadow-2xs border border-rose-800 focus:ring-rose-600',
    gold:
      'bg-gold-500 hover:bg-gold-600 text-slate-950 shadow-2xs border border-gold-600 focus:ring-gold-500 font-bold',
    ghost:
      'bg-transparent text-slate-700 hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200/60 focus:ring-slate-400 shadow-none border-transparent',
  };

  return (
    <button
      className={twMerge(
        clsx(baseStyles, sizeStyles[size], variantStyles[variant], className)
      )}
      disabled={disabled}
      {...props}
    >
      {icon && <span className="flex-shrink-0">{renderIcon(icon)}</span>}
      {children}
    </button>
  );
};

export default Button;
