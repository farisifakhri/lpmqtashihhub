import React from 'react';
import { TOKENS } from '@/app/tokens';
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
  CreditCard,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const StatusBadge = ({
  status,
  className,
  showIcon = true,
  size = 'md',
}) => {
  const config =
    TOKENS.registrationStatus[status] ||
    TOKENS.paymentStatus[status] ||
    TOKENS.registrationStatus.DRAFT;

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  };

  const renderIcon = () => {
    const iconClass = size === 'sm' ? 'w-3 h-3 flex-shrink-0' : 'w-3.5 h-3.5 flex-shrink-0';
    switch (status) {
      case 'DRAFT':
        return <FileEdit className={iconClass} aria-hidden="true" />;
      case 'READY_FOR_VERIFICATION':
        return <Inbox className={iconClass} aria-hidden="true" />;
      case 'VERIFICATION_ASSIGNED':
        return <Users className={iconClass} aria-hidden="true" />;
      case 'IN_VERIFICATION':
        return <Search className={iconClass} aria-hidden="true" />;
      case 'PHYSICAL_HANDOVER_CORRECTION_REQUIRED':
      case 'REVISION_REQUIRED':
        return <AlertTriangle className={iconClass} aria-hidden="true" />;
      case 'WAITING_VERIFICATION_APPROVAL':
        return <Clock className={iconClass} aria-hidden="true" />;
      case 'VERIFICATION_APPROVED':
        return <FileCheck className={iconClass} aria-hidden="true" />;
      case 'AWAITING_PAYMENT':
      case 'PAYMENT_VERIFICATION':
        return <CreditCard className={iconClass} aria-hidden="true" />;
      case 'WAITING_DISTRIBUTION':
      case 'WAITING_DISTRIBUTOR_RECEIPT':
        return <Users className={iconClass} aria-hidden="true" />;
      case 'TASHIH_IN_PROGRESS':
        return <BookOpen className={iconClass} aria-hidden="true" />;
      case 'READY_FOR_STT':
        return <FileCheck className={iconClass} aria-hidden="true" />;
      case 'STT_ISSUED':
        return <CheckCircle2 className={iconClass} aria-hidden="true" />;
      case 'DOCUMENTATION':
      case 'DOCUMENTATION_IN_PROGRESS':
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
          'inline-flex items-center rounded-md font-semibold border shadow-2xs transition-colors',
          sizeClasses[size] || sizeClasses.md,
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

export default StatusBadge;
