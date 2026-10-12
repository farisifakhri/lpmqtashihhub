import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { clsx } from 'clsx';

/**
 * Komponen Modal dasar standar LPMQ.
 * Menangani:
 * - Tombol Escape untuk menutup
 * - Perangkap fokus (focus trap) di dalam dialog
 * - Kunci scroll dokumen (body scroll lock)
 * - Kembalikan fokus ke elemen pemicu saat ditutup
 * - Aksesibilitas ARIA (role="dialog", aria-modal="true")
 */
export const Modal = ({
  isOpen = false,
  onClose,
  title,
  description,
  children,
  size = 'md', // 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  className = '',
  triggerRef,
  ariaLabelledBy,
  ariaDescribedBy,
}) => {
  const dialogRef = useRef(null);
  const previousActiveElementRef = useRef(null);

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    '2xl': 'max-w-5xl',
    full: 'max-w-[95vw] sm:max-w-6xl',
  };

  // Simpan elemen aktif sebelum modal terbuka untuk memulihkan fokus saat ditutup
  useEffect(() => {
    if (isOpen) {
      previousActiveElementRef.current = document.activeElement;
    } else if (previousActiveElementRef.current) {
      const elToFocus = triggerRef?.current || previousActiveElementRef.current;
      if (elToFocus && typeof elToFocus.focus === 'function') {
        elToFocus.focus();
      }
    }
  }, [isOpen, triggerRef]);

  // Kunci scroll halaman saat modal terbuka
  useEffect(() => {
    if (!isOpen) return undefined;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  // Focus trap & Escape listener
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && closeOnEscape) {
        e.stopPropagation();
        onClose?.();
        return;
      }

      if (e.key === 'Tab') {
        const dialog = dialogRef.current;
        if (!dialog) return;

        const focusableSelector =
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
        const focusableElements = Array.from(dialog.querySelectorAll(focusableSelector)).filter(
          (el) => el.offsetParent !== null || el === document.activeElement
        );

        if (focusableElements.length === 0) {
          e.preventDefault();
          return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement || !dialog.contains(document.activeElement)) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement || !dialog.contains(document.activeElement)) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Fokus awal ke dialog atau elemen pertama yang dapat difokuskan
    const timer = setTimeout(() => {
      if (dialogRef.current) {
        const firstFocusable = dialogRef.current.querySelector(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])'
        );
        if (firstFocusable) {
          firstFocusable.focus();
        } else {
          dialogRef.current.focus();
        }
      }
    }, 50);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timer);
    };
  }, [isOpen, closeOnEscape, onClose]);

  if (!isOpen) return null;

  const titleId = ariaLabelledBy || (title ? 'modal-title' : undefined);
  const descId = ariaDescribedBy || (description ? 'modal-description' : undefined);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descId}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-ink/70 backdrop-blur-xs animate-fadeIn"
      onClick={(e) => {
        if (closeOnOverlayClick && e.target === e.currentTarget) {
          onClose?.();
        }
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={clsx(
          'bg-surface rounded-2xl w-full shadow-2xl border border-line outline-none max-h-[90vh] flex flex-col animate-dialog-in overflow-hidden',
          sizeClasses[size] || sizeClasses.md,
          className
        )}
      >
        {(title || showCloseButton) && (
          <div className="flex items-start justify-between gap-3 px-5 sm:px-6 py-4 border-b border-line shrink-0">
            <div>
              {title && (
                <h3 id={titleId} className="text-base sm:text-lg font-bold text-ink leading-snug">
                  {title}
                </h3>
              )}
              {description && (
                <p id={descId} className="text-xs sm:text-sm text-ink-muted mt-0.5">
                  {description}
                </p>
              )}
            </div>

            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Tutup dialog"
                className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-canvas transition-colors cursor-pointer shrink-0 -mr-1"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        <div className="p-5 sm:p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
};

export default Modal;

