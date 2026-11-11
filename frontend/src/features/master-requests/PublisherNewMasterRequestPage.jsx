import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { MasterRequestForm } from './MasterRequestForm';

/** Halaman pengajuan permohonan master (khusus penerbit terdaftar). */
export const PublisherNewMasterRequestPage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  // Data akun penerbit dipakai sebagai nilai awal; tetap dapat disesuaikan pemohon.
  const defaults = useMemo(() => ({
    lembaga: currentUser?.publisherName || currentUser?.publisher?.legal_name || '',
    email: currentUser?.email || '',
  }), [currentUser]);

  return (
    <div className="space-y-5">
      <Link to="/publisher/master-requests"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-ink">
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Kembali ke daftar permohonan
      </Link>
      <MasterRequestForm
        defaults={defaults}
        onSubmitted={(result) => navigate('/publisher/master-requests', { state: { submitted: result } })}
      />
    </div>
  );
};

export default PublisherNewMasterRequestPage;
