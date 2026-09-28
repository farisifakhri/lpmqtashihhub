import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const renderIcon = (icon) => {
  if (!icon) return null;
  if (React.isValidElement(icon)) return icon;
  if (typeof icon === 'function' || (typeof icon === 'object' && icon !== null && icon.$$typeof)) {
    const IconComponent = icon;
    return <IconComponent className="w-3.5 h-3.5" />;
  }
  return icon;
};

export const Badge = ({
  className,
  variant = 'default',
  icon,
  children,
  ...props
}) => {
  const variantStyles = {
    default: 'bg-surface-subtle text-ink border-line-strong',
    success: 'bg-brand-50 text-brand-800 border-brand-100',
    warning: 'bg-civic-warningSoft text-civic-warning border-civic-warningLine',
    danger: 'bg-civic-dangerSoft text-civic-danger border-civic-dangerLine',
    info: 'bg-civic-infoSoft text-civic-info border-civic-infoLine',
    gold: 'bg-civicGold-100 text-civicGold-700 border-civicGold-700 font-semibold',
  };

  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border tracking-wide',
          variantStyles[variant],
          className
        )
      )}
      {...props}
    >
      {icon && <span className="flex-shrink-0">{renderIcon(icon)}</span>}
      <span>{children}</span>
    </span>
  );
};
