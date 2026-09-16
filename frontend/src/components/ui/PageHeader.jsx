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
        'space-y-3 pb-4',
        sticky && 'sticky top-16 z-20 bg-neutral-50/95 backdrop-blur-xs pt-2 border-b border-slate-200/80',
        className
      )}
    >
      {/* Breadcrumb Bar */}
      {breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <React.Fragment key={crumb.label || idx}>
                {crumb.path && !isLast ? (
                  <Link
                    to={crumb.path}
                    className="hover:text-emerald-800 transition-colors focus-visible:underline"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className={clsx(isLast ? 'font-semibold text-slate-800' : 'text-slate-500')}>
                    {crumb.label}
                  </span>
                )}
                {!isLast && <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />}
              </React.Fragment>
            );
          })}
        </nav>
      )}

      {/* Main Title Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-slate-900">
              {title}
            </h1>
            {badges && <div className="flex flex-wrap items-center gap-2">{badges}</div>}
          </div>
          {subtitle && (
            <p className="text-sm text-slate-600 leading-relaxed font-normal">
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

