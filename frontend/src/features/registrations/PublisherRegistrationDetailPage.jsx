import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  PackageCheck,
  Clock,
  Building2,
} from 'lucide-react';
import { registrationApi } from '@/api/registration.api';
import { verificationApi } from '@/api/verification.api';
import { reportApi } from '@/api/report.api';
import { fileApi } from '@/api/file.api';
import { useAuth } from '@/features/auth/AuthContext';
import { Button } from '@/components/ui/Button';
import { publisherAction } from './publisher-status';

import { PublisherDetailHeader } from './detail/PublisherDetailHeader';
import { PublisherStatusAlerts } from './detail/PublisherStatusAlerts';
import { PublisherDigitalFilesTab } from './detail/PublisherDigitalFilesTab';
import { PublisherPhysicalMasterTab } from './detail/PublisherPhysicalMasterTab';
import { PublisherTimelineTab } from './detail/PublisherTimelineTab';
import { PublisherOfficialDocsTab } from './detail/PublisherOfficialDocsTab';
import { PublisherDetailModals } from './detail/PublisherDetailModals';

export function PublisherRegistrationDetailPage() {
  const { id } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Core Data State
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [refresh, setRefresh] = useState(0);

  // Form & Action State
  const [type, setType] = useState('COVER');
  const [file, setFile] = useState(null);
  const [volumeCount, setVolumeCount] = useState(30);
  const [dispatchData, setDispatchData] = useState({
    courier: 'LOKET_LPMQ',
    tracking_no: '',
  });

  // Modals & Dialogs State
  const [actionLoading, setActionLoading] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showShippingLabel, setShowShippingLabel] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [previewFile, setPreviewFile] = useState(null);
  const [physicalReceiptUrl, setPhysicalReceiptUrl] = useState(null);

  // Tabs
  const initialTab = searchParams.get('tab') || 'berkas';
  const [activeTab, setActiveTab] = useState(
    ['berkas', 'berkas-fisik', 'timeline', 'dokumen'].includes(initialTab) ? initialTab : 'berkas'
  );

  useEffect(() => {
    if (location.state?.showReceipt) {
      setShowReceipt(true);
    }
  }, [location.state]);

  useEffect(() => () => {
    if (physicalReceiptUrl) URL.revokeObjectURL(physicalReceiptUrl);
  }, [physicalReceiptUrl]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    Promise.all([registrationApi.getDetail(id), reportApi.getRegistrationTimeline(id)])
      .then(([detail, timeline]) => {
        if (active) {
          setData({ ...detail.data, timeline: timeline.data.timeline });
          setVolumeCount(detail.data.physical_master_intake?.volume_count || 30);
        }
      })
      .catch((err) => {
        if (active) setError(err.message || 'Detail naskah tidak dapat dimuat.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, refresh, currentUser?.id]);

  useEffect(() => {
    setData(null);
    setSuccess('');
    setFile(null);
    setType('COVER');
  }, [id, currentUser?.id]);

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && ['berkas', 'berkas-fisik', 'timeline', 'dokumen'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('tab', newTab);
    setSearchParams(nextParams, { replace: true });
  };

  const editable = data && ['DRAFT', 'REVISION_REQUIRED'].includes(data.status);
  const revision = data?.status === 'REVISION_REQUIRED';
  const action = data && publisherAction(data);

  const revisionNote = [...(data?.timeline || [])]
    .reverse()
    .find((item) => item.to_status === 'REVISION_REQUIRED')?.notes;

  const requiredFiles = ['COVER', 'SAMPLE_PAGE_1_5'].every((required) =>
    data?.manuscript_files?.some((item) => item.type === required)
  );

  const run = async (operation, message) => {
    if (busy) return;
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await operation();
      setSuccess(message);
      setRefresh((value) => value + 1);
    } catch (err) {
      setError(err.message || 'Tindakan gagal. Muat ulang untuk memastikan status terbaru.');
    } finally {
      setBusy(false);
    }
  };

  const upload = (event) => {
    event.preventDefault();
    if (!file || busy) return;
    if (
      !['application/pdf', 'image/png', 'image/jpeg'].includes(file.type) ||
      !file.size ||
      file.size > 10 * 1024 * 1024
    ) {
      setError('Pilih PDF, PNG, atau JPEG berisi data dengan ukuran maksimal 10 MB.');
      return;
    }
    run(async () => {
      const uploaded = await fileApi.upload(file);
      await registrationApi.addManuscript(id, { type, file_id: uploaded.id });
      setFile(null);
      const inputEl = event.target.querySelector('input[type="file"]');
      if (inputEl) inputEl.value = '';
    }, 'Berkas berhasil ditambahkan sebagai versi baru.');
  };

  const savePhysical = (event) => {
    event.preventDefault();
    const existing = data.physical_master_intake;
    run(
      () =>
        registrationApi.declarePhysicalMaster(id, {
          format: 'A4',
          binding_method: 'PER_JUZ',
          volume_count: Number(volumeCount),
          ...(existing?.sent_at ? { sent_at: existing.sent_at } : {}),
          ...(existing?.delivery_method ? { delivery_method: existing.delivery_method } : {}),
          ...(existing?.notes ? { notes: existing.notes } : {}),
        }),
      'Pernyataan master fisik berhasil disimpan.'
    );
  };

  const handleDispatch = (event) => {
    event.preventDefault();
    run(
      () => registrationApi.dispatchPhysical(id, dispatchData),
      'Konfirmasi pengiriman berkas fisik ke LPMQ berhasil dicatat. Status diindikasikan sedang diverifikasi.'
    );
  };

  const handleDeleteDraft = async () => {
    setActionLoading(true);
    setError('');
    try {
      await registrationApi.deleteRegistration(id);
      setShowDeleteModal(false);
      navigate('/publisher/registrations');
    } catch (err) {
      setError(err.message || 'Gagal menghapus draf permohonan.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelRegistration = async () => {
    setActionLoading(true);
    setError('');
    try {
      await registrationApi.transitionStatus(id, 'CANCELLED', cancelReason);
      setShowCancelModal(false);
      setSuccess('Permohonan berhasil dibatalkan dan ditarik dari antrean.');
      setRefresh((value) => value + 1);
    } catch (err) {
      setError(err.message || 'Gagal membatalkan permohonan.');
    } finally {
      setActionLoading(false);
    }
  };

  const showPhysicalReceipt = async () => {
    setActionLoading(true);
    setError('');
    try {
      const blob = await verificationApi.getPhysicalReceiptPdf(id);
      setPhysicalReceiptUrl(URL.createObjectURL(blob));
    } catch (reason) {
      setError(reason.message || 'PDF tanda terima fisik belum dapat dibuka.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16 animate-fadeIn">
      {/* Back Link */}
      <Link
        to="/publisher/registrations"
        className="inline-flex gap-2 items-center text-xs font-semibold text-ink-muted hover:text-brand-800 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Riwayat permohonan
      </Link>

      {/* Error Alert */}
      {error && (
        <div
          role="alert"
          className="rounded-xl bg-civic-dangerSoft border border-civic-dangerLine text-civic-danger p-4 text-xs font-semibold"
        >
          {error}
        </div>
      )}

      {!loading && !data && error && (
        <Button variant="outline" size="sm" onClick={() => setRefresh((value) => value + 1)}>
          Muat ulang
        </Button>
      )}

      {/* Success Notification */}
      {success && (
        <div
          role="status"
          className="rounded-xl bg-brand-50 border border-brand-100 text-brand-800 p-4 text-xs font-semibold flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 text-brand-700 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center space-y-2">
          <div className="w-7 h-7 border-3 border-brand-700 border-t-transparent rounded-full animate-spin mx-auto" />
          <p role="status" className="text-xs text-ink-muted font-medium">
            Memuat detail naskah…
          </p>
        </div>
      ) : (
        data && (
          <>
            {/* 1. Header Card & Status Progress */}
            <PublisherDetailHeader
              data={data}
              busy={busy}
              actionLoading={actionLoading}
              setRefresh={setRefresh}
              setShowReceipt={setShowReceipt}
              setShowDeleteModal={setShowDeleteModal}
              setShowCancelModal={setShowCancelModal}
              setShowShippingLabel={setShowShippingLabel}
            />

            {/* 2. Hero Next Action Card & Status Banners */}
            <PublisherStatusAlerts
              data={data}
              action={action}
              editable={editable}
              revision={revision}
              revisionNote={revisionNote}
              requiredFiles={requiredFiles}
              actionLoading={actionLoading}
              showPhysicalReceipt={showPhysicalReceipt}
              handleTabChange={handleTabChange}
            />

            {/* 3. Structured Tab Navigation */}
            <div className="border-b border-line pt-2">
              <nav className="flex items-center gap-2 overflow-x-auto" aria-label="Navigasi Permohonan">
                <button
                  type="button"
                  onClick={() => handleTabChange('berkas')}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === 'berkas'
                      ? 'border-brand-800 text-brand-900 bg-brand-50/50 rounded-t-lg'
                      : 'border-transparent text-ink-muted hover:text-ink hover:border-line'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Berkas Digital</span>
                  <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-surface-subtle border border-line text-ink">
                    {data.manuscript_files?.length || 0}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTabChange('berkas-fisik')}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === 'berkas-fisik'
                      ? 'border-brand-800 text-brand-900 bg-brand-50/50 rounded-t-lg'
                      : 'border-transparent text-ink-muted hover:text-ink hover:border-line'
                  }`}
                >
                  <PackageCheck className="w-4 h-4" />
                  <span>Penyerahan Berkas Fisik</span>
                  <span className={`font-mono text-[10px] px-1.5 py-0.2 rounded-full border ${
                    data.physical_master_intake?.status === 'RECEIVED'
                      ? 'bg-brand-100 text-brand-800 border-brand-200'
                      : data.physical_dispatch_status === 'DISPATCHED'
                        ? 'bg-civic-infoSoft text-civic-info border-civic-infoLine'
                        : 'bg-surface-subtle text-ink border-line'
                  }`}>
                    {data.physical_master_intake?.status === 'RECEIVED'
                      ? 'Diterima'
                      : data.physical_dispatch_status === 'DISPATCHED'
                        ? 'Dikirim'
                        : `${volumeCount} Jilid`}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTabChange('timeline')}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === 'timeline'
                      ? 'border-brand-800 text-brand-900 bg-brand-50/50 rounded-t-lg'
                      : 'border-transparent text-ink-muted hover:text-ink hover:border-line'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span>Riwayat & Lacak Proses</span>
                  <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-surface-subtle border border-line text-ink">
                    {data.timeline?.length || 0}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTabChange('dokumen')}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === 'dokumen'
                      ? 'border-brand-800 text-brand-900 bg-brand-50/50 rounded-t-lg'
                      : 'border-transparent text-ink-muted hover:text-ink hover:border-line'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  <span>Dokumen Resmi</span>
                  {(data.official_documents?.length > 0 || data.foreign_metadata?.surat_permohonan_file_id) && (
                    <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-brand-100 border border-brand-200 text-brand-800">
                      {(data.official_documents?.length || 0) + (data.foreign_metadata?.surat_permohonan_file_id ? 1 : 0)}
                    </span>
                  )}
                </button>
              </nav>
            </div>

            {/* TAB 1: Berkas Digital */}
            <div className={activeTab === 'berkas' ? 'space-y-6 animate-fadeIn' : 'hidden'}>
              <PublisherDigitalFilesTab
                data={data}
                editable={editable}
                revision={revision}
                requiredFiles={requiredFiles}
                type={type}
                setType={setType}
                file={file}
                setFile={setFile}
                busy={busy}
                upload={upload}
                onSubmitRegistration={() =>
                  run(
                    () => registrationApi.submitRegistration(id),
                    revision ? 'Perbaikan berhasil diajukan ulang.' : 'Permohonan berhasil dikirim.'
                  )
                }
                setPreviewFile={setPreviewFile}
                handleTabChange={handleTabChange}
              />
            </div>

            {/* TAB 2: Penyerahan Berkas Fisik */}
            <div className={activeTab === 'berkas-fisik' ? 'space-y-6 animate-fadeIn' : 'hidden'}>
              <PublisherPhysicalMasterTab
                data={data}
                editable={editable}
                volumeCount={volumeCount}
                setVolumeCount={setVolumeCount}
                busy={busy}
                savePhysical={savePhysical}
                actionLoading={actionLoading}
                showPhysicalReceipt={showPhysicalReceipt}
                dispatchData={dispatchData}
                setDispatchData={setDispatchData}
                handleDispatch={handleDispatch}
                setShowShippingLabel={setShowShippingLabel}
              />
            </div>

            {/* TAB 3: Riwayat & Lacak Proses */}
            <div className={activeTab === 'timeline' ? 'space-y-6 animate-fadeIn' : 'hidden'}>
              <PublisherTimelineTab data={data} />
            </div>

            {/* TAB 4: Dokumen Resmi */}
            <div className={activeTab === 'dokumen' ? 'space-y-6 animate-fadeIn' : 'hidden'}>
              <PublisherOfficialDocsTab
                data={data}
                setPreviewFile={setPreviewFile}
                setShowReceipt={setShowReceipt}
              />
            </div>
          </>
        )
      )}

      {/* Modals & Dialogs */}
      <PublisherDetailModals
        data={data}
        actionLoading={actionLoading}
        previewFile={previewFile}
        setPreviewFile={setPreviewFile}
        showDeleteModal={showDeleteModal}
        setShowDeleteModal={setShowDeleteModal}
        handleDeleteDraft={handleDeleteDraft}
        showCancelModal={showCancelModal}
        setShowCancelModal={setShowCancelModal}
        cancelReason={cancelReason}
        setCancelReason={setCancelReason}
        handleCancelRegistration={handleCancelRegistration}
        physicalReceiptUrl={physicalReceiptUrl}
        setPhysicalReceiptUrl={setPhysicalReceiptUrl}
        showReceipt={showReceipt}
        setShowReceipt={setShowReceipt}
        showShippingLabel={showShippingLabel}
        setShowShippingLabel={setShowShippingLabel}
        onReceiptClose={() => {
          setShowReceipt(false);
          if (location.state?.showReceipt) {
            navigate(location.pathname, { replace: true, state: {} });
          }
        }}
      />
    </div>
  );
}

export default PublisherRegistrationDetailPage;
