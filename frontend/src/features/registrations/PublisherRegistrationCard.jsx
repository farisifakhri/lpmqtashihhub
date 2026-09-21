import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Calendar } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PublisherProgress } from './PublisherProgress';
import { publisherAction, dateLabel } from './publisher-status';
export function PublisherRegistrationCard({ registration }) {
  const action = publisherAction(registration);
  return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4 hover:border-emerald-300 transition-colors">
    <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0 flex-1"><p className="font-mono text-xs text-emerald-700 break-all">{registration.registration_no}</p><h3 className="mt-1.5 font-bold text-slate-900 break-words">{registration.title}</h3><p className="text-xs text-slate-500 mt-1">{registration.service_type?.name}</p></div><StatusBadge registration={registration} status={registration.status} /></div>
    <PublisherProgress registration={registration} />
    <div className="flex flex-wrap justify-between items-center gap-3 border-t border-slate-100 pt-3"><span className="flex gap-1.5 items-center text-xs text-slate-500"><Calendar className="h-3.5 w-3.5" />{dateLabel(registration.created_at)}</span><div className="flex flex-wrap gap-3">{action && <Link to={action.path} className="text-xs font-bold text-emerald-800 hover:underline py-2">{action.label}</Link>}<Link to={`/publisher/registrations/${registration.id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-emerald-800 py-2">Detail & progres<ArrowUpRight className="h-4 w-4" /></Link></div></div>
  </article>;
}
