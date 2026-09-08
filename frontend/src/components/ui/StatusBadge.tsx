import React from 'react';
import { TOKENS, RegistrationStatusCode } from '@/app/tokens';
import {
  FileEdit,
  Inbox,
  Search,
  AlertTriangle,
  Users,
  BookOpen,
  FileCheck,
  Award,
  XCircle,
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface StatusBadgeProps {
  status: RegistrationStatusCode;
  className?: string;
  showIcon?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  className,
  showIcon = true,
}) => {
  const config = TOKENS.registrationStatus[status] || TOKENS.registrationStatus.DRAFT;

  const renderIcon = () => {
    const iconClass = 'w-3.5 h-3.5 flex-shrink-0';
    switch (status) {
      case 'DRAFT':
        return <FileEdit className={iconClass} aria-hidden="true" />;
      case 'READY_FOR_VERIFICATION':
        return <Inbox className={iconClass} aria-hidden="true" />;
      case 'IN_VERIFICATION':
        return <Search className={iconClass} aria-hidden="true" />;
      case 'REVISION_REQUIRED':
        return <AlertTriangle className={iconClass} aria-hidden="true" />;
      case 'WAITING_DISTRIBUTION':
        return <Users className={iconClass} aria-hidden="true" />;
      case 'TASHIH_IN_PROGRESS':
        return <BookOpen className={iconClass} aria-hidden="true" />;
      case 'DOCUMENTATION':
        return <FileCheck className={iconClass} aria-hidden="true" />;
      case 'COMPLETED':
        return <Award className={iconClass} aria-hidden="true" />;
      case 'CANCELLED':
        return <XCircle className={iconClass} aria-hidden="true" />;
      default:
        return null;
    }
  };

  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border shadow-xs transition-colors',
          config.bgClass,
          config.textClass,
          config.borderClass,
          className
        )
      )}
      title={config.description}
    >
      {showIcon && renderIcon()}
      <span>{config.label}</span>
    </span>
  );
};
