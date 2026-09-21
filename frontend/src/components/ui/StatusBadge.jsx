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
  PackageCheck,
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { getWorkflowViewModel } from '@/lib/workflow-view-model';

export const StatusBadge = ({
  status: statusProp,
  registration,
  className,
  showIcon = true,
  size = 'md',
}) => {
  const status = registration?.status || statusProp;
  const vm = registration ? getWorkflowViewModel(registration) : null;

  const config =
    TOKENS.registrationStatus[status] ||
    TOKENS.paymentStatus[status] ||
    TOKENS.registrationStatus.DRAFT;

  let label = config.label;
  let description = config.description;
  let bgClass = config.bgClass;
  let textClass = config.textClass;
  let borderClass = config.borderClass;

  if (vm) {
    if (vm.operationalStatusLabel) {
      label = vm.operationalStatusLabel;
    }
    if (vm.blockedReason) {
      description = vm.blockedReason;
    }
    if (vm.operationalState === 'WAITING_PHYSICAL_MASTER') {
      bgClass = 'bg-amber-50';
      textClass = 'text-amber-900';
      borderClass = 'border-amber-300';
    } else if (vm.operationalState === 'PHYSICAL_MASTER_CORRECTION_REQUIRED') {
      bgClass = 'bg-rose-50';
      textClass = 'text-rose-900';
      borderClass = 'border-rose-300';
    } else if (vm.operationalState === 'READY_FOR_PHYSICAL_HANDOVER') {
      bgClass = 'bg-emerald-50';
      textClass = 'text-emerald-900';
      borderClass = 'border-emerald-300';
    }
  }

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  };

  const renderIcon = () => {
    const iconClass = size === 'sm' ? 'w-3 h-3 flex-shrink-0' : 'w-3.5 h-3.5 flex-shrink-0';
    if (vm?.operationalState === 'PHYSICAL_MASTER_CORRECTION_REQUIRED') {
      return <AlertTriangle className={iconClass} aria-hidden="true" />;
    }
    if (vm?.operationalState === 'WAITING_PHYSICAL_MASTER') {
      return <PackageCheck className={iconClass} aria-hidden="true" />;
    }
    if (vm?.operationalState === 'READY_FOR_PHYSICAL_HANDOVER') {
      return <CheckCircle2 className={iconClass} aria-hidden="true" />;
    }
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
          bgClass,
          textClass,
          borderClass,
          className
        )
      )}
      title={description}
    >
      {showIcon && renderIcon()}
      <span>{label}</span>
    </span>
  );
};

export default StatusBadge;
