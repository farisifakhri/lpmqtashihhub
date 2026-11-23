import React, { useMemo, useState } from 'react';
import {
  ShieldCheck,
  RefreshCw,
  BookOpen,
  CheckCircle2,
  Clock,
  Check,
  AlertTriangle,
  UserX,
  Users,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  FileText,
  RotateCcw,
  User,
  Calendar,
  X,
  Search,
} from 'lucide-react';
import { clsx } from 'clsx';
import { Button } from '@/components/ui/Button';
import { getReviewProgress } from '../distribution-view-model';

const formatDueDate = (dateString) => {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '-';
  }
};

const renderSlaBadge = (slaStatus, slaStatusLabel) => {
  switch (slaStatus) {
    case 'WARNING':
      return (
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#fefce8] text-[#a16207] border border-[#fde047] shrink-0">
          <span className="w-2.5 h-2.5 rounded-full bg-[#eab308] inline-block shrink-0" />
          {slaStatusLabel || 'Mendekati Tenggat'}
        </span>
      );
    case 'OVERDUE':
      return (
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#fef2f2] text-[#b91c1c] border border-[#fecaca] shrink-0">
          <span className="w-2.5 h-2.5 rounded-full bg-[#dc2626] inline-block shrink-0" />
          {slaStatusLabel || 'Terlambat'}
        </span>
      );
    case 'PAUSED':
      return (
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#f8fafc] text-[#475569] border border-[#cbd5e1] shrink-0">
          <span className="w-2.5 h-2.5 rounded-full bg-[#64748b] inline-block shrink-0" />
          {slaStatusLabel || 'Jeda SLA'}
        </span>
      );
    case 'ON_TIME':
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#f0fdf4] text-[#15803d] border border-[#bbf7d0] shrink-0">
          <span className="w-2.5 h-2.5 rounded-full bg-[#16a34a] inline-block shrink-0" />
          {slaStatusLabel || 'Tepat Waktu'}
        </span>
      );
  }
};

const renderAnggotaSidangAccordion = (regId, currentAssignments, isExpanded, toggleExpanded, onRevokePentashih, reg) => {
  if (!currentAssignments || currentAssignments.length === 0) return null;

  return (
    <div className="rounded-xl border border-blue-100/80 bg-[#f8faff] p-3 sm:p-3.5 transition-all">
      <button
        type="button"
        onClick={() => toggleExpanded(regId)}
        className="w-full flex items-center justify-between text-left cursor-pointer select-none group"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-2.5 font-bold text-sm text-slate-800">
          <Users className="w-5 h-5 text-slate-800" />
          <span>Anggota Sidang</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-slate-700 group-hover:text-slate-900 transition-colors" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-700 group-hover:text-slate-900 transition-colors" />
        )}
      </button>

      {isExpanded && (
        <div className="mt-3 pt-2.5 flex flex-wrap items-center gap-2 sm:gap-2.5">
          {currentAssignments.map((a) => {
            const rev = a.reviews?.[0];
            const isDone = a.status === 'COMPLETED' && rev;
            const isRevoked = a.status === 'REVOKED';

            if (isRevoked) {
              return (
                <span
                  key={a.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#fef2f2] text-[#991b1b] border border-[#fecaca] shadow-2xs"
                >
                  <X className="w-3.5 h-3.5 text-[#dc2626] shrink-0" />
                  <span>{a.assignee?.name || 'Pentashih'} (Dicabut)</span>
                </span>
              );
            }

            if (isDone) {
              if (rev.result === 'PASSED') {
                return (
                  <span
                    key={a.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#f0fdf4] text-[#166534] border border-[#bbf7d0] shadow-2xs"
                  >
                    <span className="w-4 h-4 rounded-full bg-[#16a34a] flex items-center justify-center text-white shrink-0">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </span>
                    <span>{a.assignee?.name || 'Pentashih'}</span>
                  </span>
                );
              }

              return (
                <span
                  key={a.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#fffbeb] text-[#92400e] border border-[#fde68a] shadow-2xs"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-[#d97706] shrink-0" />
                  <span>{a.assignee?.name || 'Pentashih'}</span>
                </span>
              );
            }

            // In progress or pending
            return (
              <span
                key={a.id}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs"
              >
                <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span>{a.assignee?.name || 'Pentashih'}</span>
                {onRevokePentashih && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRevokePentashih(a, reg);
                    }}
                    title={`Lepas tugas ${a.assignee?.name || 'pentashih'}`}
                    aria-label={`Lepas tugas ${a.assignee?.name || 'pentashih'}`}
                    className="ml-0.5 p-0.5 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <UserX className="w-3 h-3" />
                  </button>
                )}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
};

const renderCardFooter = (reg) => {
  const distributorName =
    reg.assigned_distributor?.name ||
    reg.distributor?.name ||
    reg.core_distributor?.name ||
    'Belum ditentukan';

  const distributorRole =
    reg.assigned_distributor?.role_label ||
    reg.distributor?.role_label ||
    'Distributor';

  const sla = reg.sla || {};
  const elapsedDays = sla.elapsed_working_days ?? reg.elapsed_working_days ?? 0;
  const targetDays = sla.target_working_days ?? reg.target_working_days ?? (reg.fee_sla_snapshot?.working_days || 5);
  const dueAt = sla.due_at || reg.due_at || reg.tashih_due_at;
  const formattedDueDate = formatDueDate(dueAt);
  const slaStatus = sla.sla_status || reg.sla_status || 'ON_TIME';
  const slaStatusLabel = sla.sla_status_label || reg.sla_status_label || (
    slaStatus === 'OVERDUE' ? 'Terlambat' :
    slaStatus === 'WARNING' ? 'Mendekati Tenggat' :
    slaStatus === 'PAUSED' ? 'Jeda SLA' : 'Tepat Waktu'
  );

  return (
    <div className="border-t border-slate-100 pt-4 mt-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-8">
        {/* Distributor Column */}
        <div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <User className="w-3.5 h-3.5 text-slate-500" />
            <span>Distributor</span>
          </div>
          <div className="flex items-center gap-3 mt-1.5">
            <div className="w-9 h-9 rounded-full bg-slate-200/80 flex items-center justify-center text-slate-500 shrink-0">
              <User className="w-5 h-5 text-slate-400" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 leading-tight">
                {distributorName}
              </div>
              <div className="text-xs text-slate-500 font-normal leading-tight mt-0.5">
                {distributorRole}
              </div>
            </div>
          </div>
        </div>

        {/* SLA Column */}
        <div className="sm:border-l sm:border-slate-200 sm:pl-8">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <Clock className="w-3.5 h-3.5 text-slate-700" />
            <span>SLA</span>
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <Calendar className="w-4 h-4 text-slate-700 shrink-0" />
            <span className="text-xs sm:text-sm font-medium text-slate-800">
              {elapsedDays} dari {targetDays} hari <span className="text-slate-400 mx-1">•</span> Jatuh tempo: {formattedDueDate}
            </span>
          </div>
        </div>
      </div>

      {/* SLA Status Badge */}
      <div className="md:ml-auto">
        {renderSlaBadge(slaStatus, slaStatusLabel)}
      </div>
    </div>
  );
};

export const ReviewProgressPanel = ({
  distLoading,
  waitingDistRegistrations = [],
  inProgressRegistrations = [],
  fetchDistributionData,
  setReviewDialogRegId,
  onRevokePentashih,
  canAssign = () => false,
  onStartAssignment,
}) => {
  const [expandedMembers, setExpandedMembers] = useState({});
  const [searchQuery, setSearchQuery] = useState('');

  const toggleExpanded = (regId) => {
    setExpandedMembers((prev) => ({
      ...prev,
      [regId]: !prev[regId],
    }));
  };

  const normalizedSearch = searchQuery.trim().toLocaleLowerCase('id-ID');
  const [filteredWaitingRegistrations, filteredInProgressRegistrations] = useMemo(() => {
    const filterRegistrations = (registrations) => registrations.filter((reg) => {
      if (!normalizedSearch) return true;
      const { currentAssignments } = getReviewProgress(reg);
      const searchableValues = [
        reg.registration_no,
        reg.title,
        reg.publisher?.legal_name,
        reg.service_type?.name,
        reg.fee_sla_snapshot?.service_name,
        ...currentAssignments.flatMap((assignment) => [
          assignment.assignee?.name,
          assignment.assignee?.nip,
          assignment.assignee?.email,
        ]),
      ];
      return searchableValues.some((value) =>
        String(value || '').toLocaleLowerCase('id-ID').includes(normalizedSearch)
      );
    });

    return [filterRegistrations(waitingDistRegistrations), filterRegistrations(inProgressRegistrations)];
  }, [waitingDistRegistrations, inProgressRegistrations, normalizedSearch]);

  const totalRegistrations = waitingDistRegistrations.length + inProgressRegistrations.length;
  const visibleRegistrations = filteredWaitingRegistrations.length + filteredInProgressRegistrations.length;

  return (
    <div className="bg-white rounded-2xl border border-line/90 shadow-xs overflow-hidden">
      <div className="p-5 sm:p-6 border-b border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-ink flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-brand-700" />
            Penugasan, Monitoring Sidang & Review Hasil Pentashihan
          </h3>
          <p className="text-xs text-ink-muted mt-0.5">
            Mulai penugasan naskah yang siap, pantau progres telaah anggota sidang, lalu reviu hasil pentashihan untuk penetapan STT atau revisi naskah.
          </p>
        </div>
        <div className="flex w-full sm:w-auto items-center gap-2">
          <div className="relative min-w-0 flex-1 sm:w-72 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" aria-hidden="true" />
            <input
              type="search"
              aria-label="Cari distribusi sidang pentashih"
              placeholder="Cari nomor, judul, penerbit, atau pentashih..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full rounded-xl border border-line bg-white py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink-muted focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDistributionData}
            disabled={distLoading}
            icon={<RefreshCw className={`w-3.5 h-3.5 ${distLoading ? 'animate-spin' : ''}`} />}
          >
            Segarkan
          </Button>
        </div>
      </div>

      {distLoading ? (
        <div className="py-16 text-center text-ink-muted">
          <RefreshCw className="w-7 h-7 animate-spin mx-auto mb-2 text-brand-700" />
          <p className="text-xs font-semibold">Memuat progres sidang pentashihan...</p>
        </div>
      ) : totalRegistrations === 0 ? (
        <div className="py-16 text-center text-ink-muted max-w-sm mx-auto">
          <div className="w-12 h-12 rounded-full bg-surface-subtle text-ink-muted flex items-center justify-center mx-auto mb-2.5">
            <BookOpen className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-ink">Tidak ada naskah yang menunggu penugasan maupun sidang aktif</p>
          <p className="text-xs text-ink-muted mt-1">
            Naskah yang siap ditugaskan dan sidang yang sedang berjalan akan tampil di sini.
          </p>
        </div>
      ) : visibleRegistrations === 0 ? (
        <div className="py-16 text-center text-ink-muted max-w-sm mx-auto">
          <div className="w-12 h-12 rounded-full bg-surface-subtle text-ink-muted flex items-center justify-center mx-auto mb-2.5">
            <Search className="w-6 h-6" aria-hidden="true" />
          </div>
          <p className="text-sm font-bold text-ink">Tidak ada sidang yang cocok dengan pencarian</p>
          <p className="text-xs text-ink-muted mt-1">Coba kata kunci nomor registrasi, judul, penerbit, atau nama pentashih lainnya.</p>
        </div>
      ) : (
        <div className="p-4 sm:p-6 space-y-4 bg-slate-50/50">
          {filteredWaitingRegistrations.map((reg) => {
            const publisherName = reg.publisher?.legal_name || reg.publisher?.brand_name || 'Penerbit';
            const serviceTypeName = reg.fee_sla_snapshot?.service_name || reg.service_type?.name || 'Mushaf Al-Qur\'an';
            const isExpanded = Boolean(expandedMembers[reg.id]);
            const currentAssignments = reg.assignments || [];

            return (
              <div
                key={`assign-${reg.id}`}
                className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs hover:border-slate-300 transition-all space-y-4"
              >
                {/* Top Row: Badges & Action Button */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Reg No Badge */}
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-[#f0fdf4] text-[#166534] border border-[#bbf7d0]">
                      <FileText className="w-3.5 h-3.5 text-[#16a34a]" />
                      {reg.registration_no}
                    </span>

                    {/* Status Badge */}
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#eff6ff] text-[#1e40af] border border-[#bfdbfe]">
                      <Clock className="w-3.5 h-3.5 text-[#2563eb]" />
                      Menunggu Penugasan
                    </span>
                  </div>

                  {/* Action Button */}
                  <div className="flex items-center justify-end gap-2 shrink-0">
                    {canAssign(reg) ? (
                      <button
                        type="button"
                        onClick={() => onStartAssignment(reg)}
                        className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-[#1b7a43] hover:bg-[#146034] text-white inline-flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                      >
                        <Users className="w-4 h-4" />
                        <span>Mulai Penugasan</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-medium bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                        <Clock className="w-3.5 h-3.5" /> Menunggu penetapan oleh Admin
                      </span>
                    )}
                  </div>
                </div>

                {/* Title & Subtitle */}
                <div>
                  <h4 className="text-xl font-bold text-slate-900 tracking-tight leading-snug">
                    {reg.title}
                  </h4>
                  <p className="text-sm text-slate-500 mt-1 font-normal">
                    <span className="font-semibold text-slate-700">{publisherName}</span>
                    {' • '}
                    <span>{serviceTypeName}</span>
                  </p>
                </div>

                {/* Accordion Anggota Sidang (if any) */}
                {currentAssignments.length > 0 &&
                  renderAnggotaSidangAccordion(
                    reg.id,
                    currentAssignments,
                    isExpanded,
                    toggleExpanded,
                    onRevokePentashih,
                    reg
                  )}

                {/* Footer: Distributor & SLA */}
                {renderCardFooter(reg)}
              </div>
            );
          })}

          {filteredInProgressRegistrations.map((reg) => {
            const { iteration: maxIter, currentAssignments, totalMembers, completedMembers, hasRevoked, isReadyToReview } = getReviewProgress(reg);
            const waitingParaf = Boolean(reg.distribution_paraf_pending);
            const isExpanded = Boolean(expandedMembers[reg.id]);
            const publisherName = reg.publisher?.legal_name || reg.publisher?.brand_name || 'Penerbit';
            const serviceTypeName = reg.fee_sla_snapshot?.service_name || reg.service_type?.name || 'Mushaf Al-Qur\'an';

            return (
              <div
                key={reg.id}
                className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs hover:border-slate-300 transition-all space-y-4"
              >
                {/* Top Row: Badges & Action Button */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Reg No Badge */}
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-[#f0fdf4] text-[#166534] border border-[#bbf7d0]">
                      <FileText className="w-3.5 h-3.5 text-[#16a34a]" />
                      {reg.registration_no}
                    </span>

                    {/* Iteration Badge */}
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#eff6ff] text-[#1e40af] border border-[#bfdbfe]">
                      <RotateCcw className="w-3.5 h-3.5 text-[#2563eb]" />
                      Iterasi #{maxIter}
                    </span>

                    {/* Status Badge */}
                    {waitingParaf ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#eff6ff] text-[#1e40af] border border-[#bfdbfe]">
                        <Clock className="w-3.5 h-3.5 text-[#2563eb]" />
                        Menunggu Paraf Pemaraf
                      </span>
                    ) : isReadyToReview ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#10b981]" />
                        Seluruh Pentashih Selesai ({completedMembers}/{totalMembers})
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#fffbeb] text-[#92400e] border border-[#fde68a]">
                        <Clock className="w-3.5 h-3.5 text-[#d97706]" />
                        Sidang Berjalan: {completedMembers} dari {totalMembers} Selesai
                      </span>
                    )}

                    {hasRevoked && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#fef2f2] text-[#991b1b] border border-[#fecaca]">
                        <UserX className="w-3.5 h-3.5 text-[#dc2626]" />
                        Penugasan Dicabut
                      </span>
                    )}
                  </div>

                  {/* Action Button */}
                  <div className="flex items-center justify-end gap-2 shrink-0">
                    {waitingParaf ? (
                      <button
                        type="button"
                        onClick={() => setReviewDialogRegId(reg.id)}
                        className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 inline-flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                      >
                        <Clock className="w-4 h-4 text-slate-600" />
                        <span>Menunggu Paraf · Lihat Keputusan</span>
                        <ChevronRight className="w-4 h-4 text-slate-500" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setReviewDialogRegId(reg.id)}
                        className={clsx(
                          'px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold inline-flex items-center gap-2 shadow-xs transition-colors cursor-pointer',
                          isReadyToReview
                            ? 'bg-[#1b7a43] hover:bg-[#146034] text-white'
                            : 'bg-slate-900 hover:bg-slate-800 text-white'
                        )}
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>{isReadyToReview ? 'Reviu Hasil Sidang (Langkah 3)' : 'Lihat Hasil Anggota'}</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Title & Subtitle */}
                <div>
                  <h4 className="text-xl font-bold text-slate-900 tracking-tight leading-snug">
                    {reg.title}
                  </h4>
                  <p className="text-sm text-slate-500 mt-1 font-normal">
                    <span className="font-semibold text-slate-700">{publisherName}</span>
                    {' • '}
                    <span>{serviceTypeName}</span>
                  </p>
                </div>

                {/* Accordion Anggota Sidang */}
                {renderAnggotaSidangAccordion(
                  reg.id,
                  currentAssignments,
                  isExpanded,
                  toggleExpanded,
                  onRevokePentashih,
                  reg
                )}

                {/* Footer: Distributor & SLA */}
                {renderCardFooter(reg)}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
