import React from 'react';
import { User, ShieldCheck, Calendar, FileText } from 'lucide-react';
import { clsx } from 'clsx';

export const AssignedOfficer = ({
  name = 'Belum Ditugaskan',
  role = 'Petugas LPMQ',
  assignedAt,
  notaNo,
  className,
}) => {
  const formattedDate = assignedAt
    ? new Date(assignedAt).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <div
      className={clsx(
        'rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 sm:p-4 text-xs space-y-2',
        className
      )}
    >
      <div className="flex items-center gap-2 text-slate-500 font-medium">
        <ShieldCheck className="w-4 h-4 text-emerald-800" aria-hidden="true" />
        <span>Petugas Penanggung Jawab</span>
      </div>

      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5">
          <p className="font-bold text-slate-900 text-sm">{name}</p>
          <p className="text-slate-600 font-medium">{role}</p>
        </div>

        {notaNo && (
          <span className="font-mono text-[11px] bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-700">
            {notaNo}
          </span>
        )}
      </div>

      {formattedDate && (
        <div className="flex items-center gap-1.5 text-slate-500 pt-1 border-t border-slate-200/60">
          <Calendar className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
          <span>Ditugaskan: {formattedDate} WIB</span>
        </div>
      )}
    </div>
  );
};

export default AssignedOfficer;

