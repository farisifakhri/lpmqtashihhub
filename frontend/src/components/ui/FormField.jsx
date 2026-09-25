import React, { useId } from 'react';
import { clsx } from 'clsx';
import { AlertCircle } from 'lucide-react';

export const FormField = ({
  id,
  label,
  hint,
  error,
  required,
  children,
  className,
}) => {
  const generatedId = useId();
  const fieldId = id || generatedId;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={clsx('space-y-1.5 text-left', className)}>
      {label && (
        <label
          htmlFor={fieldId}
          className="block text-[13px] font-semibold text-ink leading-tight"
        >
          {label}
          {required && <span className="text-civic-danger ml-1" aria-hidden="true">*</span>}
        </label>
      )}

      {typeof children === 'function' ? (
        children({ id: fieldId, 'aria-describedby': describedBy, 'aria-invalid': !!error })
      ) : React.isValidElement(children) ? (
        React.cloneElement(children, {
          id: children.props.id || fieldId,
          'aria-describedby': children.props['aria-describedby'] || describedBy,
          'aria-invalid': children.props['aria-invalid'] ?? !!error,
        })
      ) : (
        children
      )}

      {error && (
        <p
          id={errorId}
          className="flex items-center gap-1.5 text-xs text-civic-danger font-medium mt-1"
          role="alert"
        >
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}

      {hint && !error && (
        <p id={hintId} className="text-xs text-ink-muted mt-1 leading-normal">
          {hint}
        </p>
      )}
    </div>
  );
};

export default FormField;

