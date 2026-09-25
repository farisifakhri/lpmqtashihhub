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
      'bg-brand-700 hover:bg-brand-800 text-white shadow-2xs border border-brand-800 focus:ring-brand-700',
    secondary:
      'bg-brand-50 hover:bg-brand-100 text-brand-900 border border-brand-100 shadow-2xs focus:ring-brand-700 font-semibold',
    outline:
      'bg-white hover:bg-canvas border border-line-strong hover:border-line-strong text-ink shadow-2xs focus:ring-brand-700 font-semibold',
    danger:
      'bg-civic-danger hover:bg-civic-danger/90 text-white shadow-2xs border border-civic-danger focus:ring-civic-danger',
    gold:
      'bg-civicGold-500 hover:bg-civicGold-100 text-ink shadow-2xs border border-civicGold-700 focus:ring-civicGold-700 font-bold',
    ghost:
      'bg-transparent text-ink hover:bg-surface-subtle hover:text-ink active:bg-surface-strong/60 focus:ring-line-strong shadow-none border-transparent',
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
