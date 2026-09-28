import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';

export const PageHeader = ({
  breadcrumbs = [],
  title,
  subtitle,
  badges,
  actions,
  className,
  sticky = false,
}) => {
  return (
    <header
      className={clsx(
        'space-y-3 rounded-xl border border-line bg-surface p-5 shadow-2xs',
        sticky && 'sticky top-16 z-20',
        className
      )}
    >
      {/* Breadcrumb Bar */}
      {breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-ink-muted font-medium">
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <React.Fragment key={crumb.label || idx}>
                {crumb.path && !isLast ? (
                  <Link
                    to={crumb.path}
                    className="hover:text-brand-800 transition-colors focus-visible:underline"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className={clsx(isLast ? 'font-semibold text-ink' : 'text-ink-muted')}>
                    {crumb.label}
                  </span>
                )}
                {!isLast && <ChevronRight className="w-3.5 h-3.5 text-ink-muted shrink-0" aria-hidden="true" />}
              </React.Fragment>
            );
          })}
        </nav>
      )}

      {/* Main Title Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-ink">
              {title}
            </h1>
            {badges && <div className="flex flex-wrap items-center gap-2">{badges}</div>}
          </div>
          {subtitle && (
            <p className="text-sm text-ink-muted leading-relaxed font-normal">
              {subtitle}
            </p>
          )}
        </div>

        {/* Primary and Secondary Actions */}
        {actions && (
          <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start sm:self-center">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
};

export default PageHeader;

