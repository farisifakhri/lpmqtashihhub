import React from 'react';
import { clsx } from 'clsx';

export const Skeleton = ({
  className,
  variant = 'rectangular',
  ...props
}) => {
  const variantStyles = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  return (
    <div
      className={clsx(
        'animate-pulse bg-surface-subtle/80 border border-line/40',
        variantStyles[variant] || variantStyles.rectangular,
        className
      )}
      aria-hidden="true"
      {...props}
    />
  );
};

export default Skeleton;

