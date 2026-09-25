import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const renderIcon = (icon, size) => {
  if (!icon) return null;
  if (React.isValidElement(icon)) return icon;
  if (typeof icon === 'function' || (typeof icon === 'object' && icon !== null && icon.$$typeof)) {
    const IconComponent = icon;
    const iconSizeClass = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5';
    return <IconComponent className={iconSizeClass} />;
  }
  return icon;
};

export const IconButton = ({
  icon,
  label,
  title,
  variant = 'ghost',
  size = 'md',
  className,
  disabled,
  ...props
}) => {
  const accessibleLabel = label || title;

  const baseStyles =
    'inline-flex items-center justify-center rounded-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-brand-700 focus:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed select-none cursor-pointer';

  const sizeStyles = {
    sm: 'w-9 h-9 p-1.5 text-xs',
    md: 'w-11 h-11 p-2.5 text-sm',
    lg: 'w-12 h-12 p-3 text-base',
  };

  const variantStyles = {
    ghost:
      'bg-transparent text-ink-muted hover:text-ink hover:bg-surface-subtle border border-transparent active:bg-surface-strong/70',
    outline:
      'bg-white text-ink hover:text-brand-900 hover:bg-canvas border border-line shadow-2xs',
    primary:
      'bg-brand-700 hover:bg-brand-800 text-white border border-brand-800 shadow-2xs',
    secondary:
      'bg-brand-50 hover:bg-brand-100 text-brand-900 border border-brand-100 shadow-2xs',
    danger:
      'bg-civic-dangerSoft hover:bg-civic-dangerSoft text-civic-danger border border-civic-dangerLine',
  };

  return (
    <button
      type="button"
      className={twMerge(
        clsx(baseStyles, sizeStyles[size] || sizeStyles.md, variantStyles[variant] || variantStyles.ghost, className)
      )}
      aria-label={accessibleLabel}
      title={title || label}
      disabled={disabled}
      {...props}
    >
      {renderIcon(icon, size)}
    </button>
  );
};

export default IconButton;

