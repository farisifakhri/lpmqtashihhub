import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileCheck,
  CreditCard,
  Award,
} from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { publisherAction, dateLabel } from './publisher-status';

export function PublisherRegistrationCard({ registration }) {
  const action = publisherAction(registration);
  const status = registration.status;

  // 3-Phase Tracking Computation according to REV-13
  // Phase 1: Permohonan (DRAFT or SUBMITTED)
  const isPhase1Done = status !== 'DRAFT';
  
  // Phase 2: Verifikasi & Loket
  const isPhase2Done = [
    'AWAITING_PAYMENT',
    'PAYMENT_VERIFICATION',
    'WAITING_DISTRIBUTOR_RECEIPT',
    'WAITING_DISTRIBUTION',
    'TASHIH_IN_PROGRESS',
    'READY_FOR_STT',
    'STT_ISSUED',
    'COMPLETED',
  ].includes(status);
  
  const isPhase2Active = [
    'READY_FOR_VERIFICATION',
    'VERIFICATION_ASSIGNED',
    'IN_VERIFICATION',
    'WAITING_VERIFICATION_APPROVAL',
    'VERIFICATION_APPROVED',
    'REVISION_REQUIRED',
  ].includes(status);

  // Phase 3: Pembayaran & STT
  const isPhase3Done = ['STT_ISSUED', 'COMPLETED'].includes(status);
  const isPhase3Active = [
    'AWAITING_PAYMENT',
    'PAYMENT_VERIFICATION',
    'WAITING_DISTRIBUTOR_RECEIPT',
    'WAITING_DISTRIBUTION',
    'TASHIH_IN_PROGRESS',
    'READY_FOR_STT',
  ].includes(status);

  return (
    <article className="rounded-2xl border border-line bg-surface p-5 shadow-2xs hover:border-brand-700/40 hover:shadow-xs transition-all flex flex-col justify-between space-y-4">
      {/* Top Header: Reg No & Status Badge */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-mono text-xs font-bold text-brand-900 bg-brand-50 border border-brand-200/80 px-2.5 py-0.5 rounded-lg">
            {registration.registration_no}
          </span>
          <StatusBadge registration={registration} status={registration.status} />
        </div>

        {/* Title & Service */}
        <div>
          <h3 className="font-bold text-ink text-base line-clamp-2 hover:text-brand-800 transition-colors">
            <Link to={`/publisher/registrations/${registration.id}`}>
              {registration.title}
            </Link>
          </h3>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className="text-xs font-medium text-ink-muted">
              {registration.service_type?.name || 'Reguler'}
            </span>
            {registration.foreign_metadata?.nama_mushaf && (
              <span className="text-[11px] text-ink-muted bg-surface-subtle border border-line px-2 py-0.2 rounded-md">
                {registration.foreign_metadata.nama_mushaf}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 3-Phase Stepper Tracker (REV-13: Jangan Disembunyikan) */}
      <div className="pt-2 border-t border-line/60">
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 text-[11px]">
          {/* Phase 1 */}
          <div className={`p-2 rounded-lg border flex flex-col justify-between ${
            isPhase1Done
              ? 'bg-brand-50/70 border-brand-200 text-brand-900'
              : 'bg-surface-subtle border-line text-ink-muted'
          }`}>
            <div className="flex items-center justify-between">
              <span className="font-bold">1. Permohonan</span>
              {isPhase1Done ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-brand-700 shrink-0" />
              ) : (
                <Clock className="w-3.5 h-3.5 text-ink-muted shrink-0" />
              )}
            </div>
            <span className="text-[10px] text-ink-muted mt-0.5 truncate">
              {isPhase1Done ? 'Terkirim' : 'Draf'}
            </span>
          </div>

          {/* Phase 2 */}
          <div className={`p-2 rounded-lg border flex flex-col justify-between ${
            isPhase2Done
              ? 'bg-brand-50/70 border-brand-200 text-brand-900'
              : isPhase2Active
              ? 'bg-civic-warningSoft/70 border-civic-warningLine text-civic-warning font-semibold'
              : 'bg-surface-subtle border-line text-ink-muted'
          }`}>
            <div className="flex items-center justify-between">
              <span className="font-bold">2. Verifikasi</span>
              {isPhase2Done ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-brand-700 shrink-0" />
              ) : isPhase2Active ? (
                <Clock className="w-3.5 h-3.5 text-civic-warning shrink-0" />
              ) : (
                <span className="w-3.5 h-3.5 rounded-full border border-line shrink-0" />
              )}
            </div>
            <span className="text-[10px] mt-0.5 truncate">
              {isPhase2Done
                ? 'Lolos'
                : status === 'REVISION_REQUIRED'
                ? 'Perlu Revisi'
                : registration.physical_master_intake?.status === 'RECEIVED'
                ? 'Pemeriksaan'
                : 'Menunggu Fisik'}
            </span>
          </div>

          {/* Phase 3 */}
          <div className={`p-2 rounded-lg border flex flex-col justify-between ${
            isPhase3Done
              ? 'bg-brand-50/70 border-brand-200 text-brand-900'
              : isPhase3Active
              ? 'bg-civic-infoSoft/70 border-civic-infoLine text-civic-info font-semibold'
              : 'bg-surface-subtle border-line text-ink-muted'
          }`}>
            <div className="flex items-center justify-between">
              <span className="font-bold">3. STT</span>
              {isPhase3Done ? (
                <Award className="w-3.5 h-3.5 text-brand-700 shrink-0" />
              ) : isPhase3Active ? (
                <CreditCard className="w-3.5 h-3.5 text-civic-info shrink-0" />
              ) : (
                <span className="w-3.5 h-3.5 rounded-full border border-line shrink-0" />
              )}
            </div>
            <span className="text-[10px] mt-0.5 truncate">
              {isPhase3Done
                ? 'Terbit'
                : status === 'AWAITING_PAYMENT'
                ? 'Menunggu Bayar'
                : isPhase3Active
                ? 'Proses Tashih'
                : 'Belum Aktif'}
            </span>
          </div>
        </div>
      </div>

      {/* Footer: Date & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line/60 pt-3">
        <span className="flex items-center gap-1.5 text-xs text-ink-muted">
          <Calendar className="h-3.5 w-3.5" />
          {dateLabel(registration.created_at)}
        </span>

        <div className="flex items-center gap-2">
          {action && (
            <Link
              to={action.path}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-900 font-bold text-xs border border-brand-200 transition-colors"
            >
              {action.label}
            </Link>
          )}

          <Link
            to={`/publisher/registrations/${registration.id}`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-ink hover:text-brand-800 transition-colors py-1 px-2"
          >
            <span>Detail & progres</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </article>
  );
}

