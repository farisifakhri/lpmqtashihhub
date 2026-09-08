import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const Badge = ({
  className,
  variant = 'default',
  icon,
  children,
  ...props
}) => {
  const variantStyles = {
    default: 'bg-neutral-100 text-neutral-700 border-neutral-300',
    success: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    warning: 'bg-amber-50 text-[#C77B2A] border-amber-300',
    danger: 'bg-rose-50 text-[#B3261E] border-rose-300',
    info: 'bg-sky-50 text-[#2E6F95] border-sky-300',
    gold: 'bg-gold-50 text-gold-700 border-gold-400 font-semibold',
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
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
