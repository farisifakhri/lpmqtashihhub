import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Archive,
  Search,
  RefreshCw,
  FileText,
  Building2,
  CheckCircle2,
  AlertCircle,
  FolderArchive,
  Layers,
  Calendar,
  Check,
  Download,
  ExternalLink,
  BookOpen,
  MapPin,
  ClipboardList,
  Sparkles,
} from 'lucide-react';
import { registrationApi } from '@/api/registration.api';
import { documentationApi } from '@/api/documentation.api';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { showToast } from '@/components/ui/toast';
import { TashihLoader } from '@/components/ui/TashihLoader';

const QUALITY_OPTIONS = [
  { value: 'SANGAT_BAIK', label: 'Sangat Baik' },
  { value: 'BAIK', label: 'Baik' },
  { value: 'CUKUP', label: 'Cukup' },
  { value: 'KURANG', label: 'Kurang / Perlu Perhatian' },
];

export const DokumentatorArchivePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedParamId = searchParams.get('id');

  const [registrations, setRegistrations] = useState([]);
  const [selectedId, setSelectedId] = useState(selectedParamId || null);
  const [detail, setDetail] = useState(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [tabFilter, setTabFilter] = useState('ALL'); // ALL, PENDING, ARCHIVED

  // Form State
  const [hasMasterDoc, setHasMasterDoc] = useState(null); // true / false / null
  const [has5Exemplars, setHas5Exemplars] = useState(null); // true / false / null
  const [cabinet, setCabinet] = useState('');
  const [shelf, setShelf] = useState('');
  const [archiveCode, setArchiveCode] = useState('');
  const [storageNotes, setStorageNotes] = useState('');

  // Survey State (Tashih.go.id)
  const [survey, setSurvey] = useState({
    print_quality: 'BAIK',
    paper_quality: 'BAIK',
    binding_quality: 'BAIK',
    font_clarity: 'BAIK',
    cover_finishing: 'BAIK',
    notes: '',
  });

  const fetchRegistrations = async () => {
    setLoadingList(true);
    try {
      const res = await registrationApi.listRegistrations({
        search: searchQuery,
        limit: 50,
      });
      const items = res.data?.items || [];
      setRegistrations(items);
      if (!selectedId && items.length > 0) {
        setSelectedId(items[0].id);
      }
    } catch (err) {
      showToast('Gagal memuat daftar naskah untuk dokumentasi.', 'error');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchRegistrations();
  }, [searchQuery]);

  const loadDetail = async (id) => {
    if (!id) return;
    setLoadingDetail(true);
    try {
      const res = await documentationApi.getDocumentationDetail(id);
      const data = res.data;
      setDetail(data);

      const existingArchive = data.documentation_archive;
      if (existingArchive) {
        setHasMasterDoc(Boolean(existingArchive.has_master_documentation));
        setHas5Exemplars(Boolean(existingArchive.has_received_5_exemplars));
        setCabinet(existingArchive.storage_location?.cabinet || '');
        setShelf(existingArchive.storage_location?.shelf || '');
        setArchiveCode(existingArchive.storage_location?.archive_code || '');
        setStorageNotes(existingArchive.storage_location?.notes || '');
        if (existingArchive.survey) {
          setSurvey({
            print_quality: existingArchive.survey.print_quality || 'BAIK',
            paper_quality: existingArchive.survey.paper_quality || 'BAIK',
            binding_quality: existingArchive.survey.binding_quality || 'BAIK',
            font_clarity: existingArchive.survey.font_clarity || 'BAIK',
            cover_finishing: existingArchive.survey.cover_finishing || 'BAIK',
            notes: existingArchive.survey.overall_notes || existingArchive.survey.notes || '',
          });
        }
      } else {
        // Default form state for fresh registration
        setHasMasterDoc(null);
        setHas5Exemplars(null);
        setCabinet('');
        setShelf('');
        setArchiveCode('');
        setStorageNotes('');
        setSurvey({
          print_quality: 'BAIK',
          paper_quality: 'BAIK',
          binding_quality: 'BAIK',
          font_clarity: 'BAIK',
          cover_finishing: 'BAIK',
          notes: '',
        });
      }
    } catch (err) {
      showToast('Gagal memuat data detail arsip naskah.', 'error');
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    if (selectedId) {
      loadDetail(selectedId);
      setSearchParams({ id: selectedId });
    }
  }, [selectedId]);

  const filteredRegistrations = useMemo(() => {
    return registrations.filter((reg) => {
      const isArchived = Boolean(reg.foreign_metadata?.documentation_archive?.storage_location?.archive_code);
      if (tabFilter === 'ARCHIVED') return isArchived;
      if (tabFilter === 'PENDING') return !isArchived;
      return true;
    });
  }, [registrations, tabFilter]);

  const isBothYes = hasMasterDoc === true && has5Exemplars === true;

  const handleSaveArchive = async (e) => {
    e.preventDefault();
    if (hasMasterDoc === null || has5Exemplars === null) {
      showToast('Harap jawab kedua pertanyaan konfirmasi dokumentasi dan 5 eksemplar.', 'warning');
      return;
    }

    if (isBothYes && (!cabinet.trim() || !shelf.trim() || !archiveCode.trim())) {
      showToast('Karena kedua syarat terpenuhi, lokasi arsip (Lemari, Rak, Kode Berkas) wajib diisi.', 'warning');
      return;
    }

    setSaving(true);
    try {
      await documentationApi.saveDocumentationArchive(selectedId, {
        has_master_documentation: hasMasterDoc,
        has_received_5_exemplars: has5Exemplars,
        storage_cabinet: cabinet.trim(),
        storage_shelf: shelf.trim(),
        archive_code: archiveCode.trim(),
        storage_notes: storageNotes.trim(),
        survey,
      });

      showToast('Dokumentasi arsip dan survei mutu mushaf berhasil disimpan!', 'success');
      await loadDetail(selectedId);
      await fetchRegistrations();
    } catch (err) {
      showToast(err.message || 'Gagal menyimpan arsip dokumentasi.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-surface border-b border-line -mt-6 -mx-6 px-6 py-6 sm:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-brand-fg font-semibold text-sm mb-1">
              <FolderArchive className="w-5 h-5 text-brand-fg" />
              <span>Modul Pengarsipan & Verifikasi Fisik (DOC-02)</span>
            </div>
            <h1 className="text-2xl font-bold text-ink tracking-tight">
              Dokumentator: Pengarsipan Naskah & Deposit Mushaf
            </h1>
            <p className="text-sm text-ink-muted mt-1">
              Pencatatan berkas arsip naskah master, verifikasi tanda terima deposit 5 eksemplar, dan evaluasi mutu fisik sesuai standar Tashih.go.id.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                fetchRegistrations();
                if (selectedId) loadDetail(selectedId);
              }}
              className="flex items-center gap-1.5"
            >
              <RefreshCw className="w-4 h-4" />
              Segarkan
            </Button>
          </div>
        </div>
      </div>

      {/* Main Grid: Master List (Left) and Workspace (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Registration List */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-surface rounded-xl shadow-sm border border-line p-4">
            {/* Search Input */}
            <div className="relative mb-3">
              <Search className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari nomor registrasi atau judul..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-line-strong rounded-lg focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 outline-none"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex border-b border-line mb-3 text-xs font-medium">
              <button
                type="button"
                onClick={() => setTabFilter('ALL')}
                className={`flex-1 pb-2 text-center border-b-2 transition-colors ${
                  tabFilter === 'ALL'
                    ? 'border-brand-700 text-brand-fg font-semibold'
                    : 'border-transparent text-ink-muted hover:text-ink'
                }`}
              >
                Semua ({registrations.length})
              </button>
              <button
                type="button"
                onClick={() => setTabFilter('PENDING')}
                className={`flex-1 pb-2 text-center border-b-2 transition-colors ${
                  tabFilter === 'PENDING'
                    ? 'border-brand-700 text-brand-fg font-semibold'
                    : 'border-transparent text-ink-muted hover:text-ink'
                }`}
              >
                Belum Arsip
              </button>
              <button
                type="button"
                onClick={() => setTabFilter('ARCHIVED')}
                className={`flex-1 pb-2 text-center border-b-2 transition-colors ${
                  tabFilter === 'ARCHIVED'
                    ? 'border-brand-700 text-brand-fg font-semibold'
                    : 'border-transparent text-ink-muted hover:text-ink'
                }`}
              >
                Arsip Rapi
              </button>
            </div>

            {/* Registration Items */}
            {loadingList ? (
              <div className="py-12 flex justify-center">
                <TashihLoader text="Memuat naskah..." />
              </div>
            ) : filteredRegistrations.length === 0 ? (
              <div className="py-8 text-center text-ink-muted text-sm">
                <Archive className="w-8 h-8 mx-auto text-line-strong mb-2" />
                Tidak ada pengajuan ditemukan.
              </div>
            ) : (
              <div className="space-y-2 max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
                {filteredRegistrations.map((item) => {
                  const isSelected = item.id === selectedId;
                  const isArchived = Boolean(item.foreign_metadata?.documentation_archive?.storage_location?.archive_code);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${
                        isSelected
                          ? 'border-brand-700 bg-brand-50/50 shadow-xs ring-1 ring-brand-700'
                          : 'border-line hover:border-line-strong hover:bg-surface-subtle'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-xs text-brand-800 font-mono">
                          {item.registration_no}
                        </span>
                        <StatusBadge status={item.status} size="xs" />
                      </div>
                      <div className="font-medium text-sm text-ink mt-1 line-clamp-1">
                        {item.title}
                      </div>
                      <div className="flex items-center justify-between text-xs text-ink-muted mt-2">
                        <span className="truncate max-w-[140px]">
                          {item.publisher?.legal_name || 'Penerbit'}
                        </span>
                        {isArchived ? (
                          <span className="inline-flex items-center gap-1 text-civic-success font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5 text-civic-success" />
                            Diarsipkan
                          </span>
                        ) : (
                          <span className="text-civic-warning font-medium">
                            Perlu Dicatat
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Detailed Workspace */}
        <div className="lg:col-span-8 space-y-6">
          {loadingDetail ? (
            <div className="bg-surface rounded-xl shadow-sm border border-line p-12 flex justify-center">
              <TashihLoader text="Menyiapkan berkas dan lembar arsip dokumentator..." />
            </div>
          ) : !detail ? (
            <div className="bg-surface rounded-xl shadow-sm border border-line p-12 text-center text-ink-muted">
              <FolderArchive className="w-12 h-12 mx-auto text-line-strong mb-3" />
              Pilih salah satu pengajuan dari daftar di sebelah kiri untuk memeriksa berkas dan mengisi arsip dokumentasi.
            </div>
          ) : (
            <>
              {/* Registration Header Banner */}
              <div className="bg-surface rounded-xl shadow-sm border border-line p-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-line pb-4">
                  <div>
                    <span className="font-mono text-xs font-bold text-brand-fg bg-brand-50 px-2 py-0.5 rounded">
                      {detail.registration.registration_no}
                    </span>
                    <h2 className="text-xl font-bold text-ink mt-1">
                      {detail.registration.title}
                    </h2>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-ink-muted mt-1.5">
                      <span className="inline-flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-ink-muted" />
                        {detail.publisher?.legal_name || 'Penerbit'}
                      </span>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5 text-ink-muted" />
                        {detail.service_type?.name || 'Layanan Tashih'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <StatusBadge status={detail.registration.status} size="md" />
                  </div>
                </div>

                {/* Archive Status Notification */}
                {detail.documentation_archive?.storage_location ? (
                  <div className="mt-4 p-3.5 bg-civic-successSoft border border-civic-successLine rounded-lg flex items-start gap-3 text-civic-success text-sm">
                    <CheckCircle2 className="w-5 h-5 text-civic-success shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-civic-success">
                        Naskah Master & Eksemplar Telah Diarsipkan
                      </div>
                      <div className="text-xs text-civic-success mt-1">
                        Kode Berkas: <strong>{detail.documentation_archive.storage_location.archive_code}</strong> | Lokasi: <strong>{detail.documentation_archive.storage_location.cabinet} / {detail.documentation_archive.storage_location.shelf}</strong>
                        {detail.documentation_archive.recorded_by && ` • Dicatat oleh: ${detail.documentation_archive.recorded_by.name}`}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 p-3.5 bg-civic-warningSoft border border-civic-warningLine rounded-lg flex items-start gap-3 text-civic-warning text-sm">
                    <AlertCircle className="w-5 h-5 text-civic-warning shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-civic-warning">
                        Menunggu Pencatatan Lokasi Arsip
                      </div>
                      <div className="text-xs text-civic-warning mt-0.5">
                        Pastikan berkas master dan deposit 5 eksemplar telah diterima lengkap sebelum menetapkan lokasi penyimpanan fisik.
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 1: Kumpulan Berkas Pengajuan & Hasil Tashih */}
              <div className="bg-surface rounded-xl shadow-sm border border-line overflow-hidden">
                <div className="bg-surface-subtle/75 px-5 py-3.5 border-b border-line flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FolderArchive className="w-4 h-4 text-brand-fg" />
                    <h3 className="font-bold text-sm text-ink">
                      Kumpulan Berkas Pengajuan & Dokumen Hasil Tashih (Berkas Siap Arsip)
                    </h3>
                  </div>
                  <span className="text-xs text-ink-muted font-medium">
                    Total Berkas: {(detail.manuscript_files?.length || 0) + (detail.official_documents?.length || 0)}
                  </span>
                </div>

                <div className="p-5 space-y-4">
                  {/* Master Fisik Intake Info */}
                  {detail.physical_intake && (
                    <div className="p-3 bg-surface-subtle border border-line rounded-lg text-xs space-y-1">
                      <div className="font-semibold text-ink flex items-center justify-between">
                        <span>Penerimaan Master Fisik di Loket:</span>
                        <span className="font-mono text-ink-muted">{detail.physical_intake.receipt_no}</span>
                      </div>
                      <div className="text-ink-muted flex flex-wrap gap-4">
                        <span>Kondisi: <strong>{detail.physical_intake.condition || 'BAIK'}</strong></span>
                        <span>Jumlah Jilid: <strong>{detail.physical_intake.volume_count}</strong></span>
                        <span>Diterima: <strong>{new Date(detail.physical_intake.received_at).toLocaleDateString('id-ID')}</strong></span>
                      </div>
                    </div>
                  )}

                  {/* Official Documents List */}
                  <div>
                    <h4 className="text-xs font-semibold text-ink uppercase tracking-wider mb-2">
                      Dokumen Resmi & Surat Keputusan
                    </h4>
                    {detail.official_documents && detail.official_documents.length > 0 ? (
                      <div className="divide-y divide-line border border-line rounded-lg overflow-hidden">
                        {detail.official_documents.map((doc) => (
                          <div key={doc.id} className="p-3 flex items-center justify-between hover:bg-surface-subtle text-xs">
                            <div className="flex items-center gap-2.5">
                              <FileText className="w-4 h-4 text-brand-fg shrink-0" />
                              <div>
                                <div className="font-medium text-ink">
                                  {doc.document_type === 'SURAT_TANDA_TASHIH'
                                    ? 'Surat Tanda Tashih (STT)'
                                    : doc.document_type === 'BERITA_ACARA_TASHIH'
                                    ? 'Berita Acara Pentashihan'
                                    : doc.document_type}
                                </div>
                                <div className="text-ink-muted font-mono text-[11px]">
                                  {doc.document_no} (v{doc.version}) • Status: {doc.status}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <a
                                href={`/api/v1/official-documents/${doc.id}/pdf`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-brand-fg bg-brand-50 rounded hover:bg-brand-100 transition-colors"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                Lihat PDF
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-ink-muted italic p-3 bg-surface-subtle rounded-lg border border-dashed border-line">
                        Belum ada dokumen resmi yang diterbitkan untuk naskah ini.
                      </div>
                    )}
                  </div>

                  {/* Manuscript Files */}
                  <div>
                    <h4 className="text-xs font-semibold text-ink uppercase tracking-wider mb-2">
                      Berkas Naskah Digital Pemohon
                    </h4>
                    {detail.manuscript_files && detail.manuscript_files.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {detail.manuscript_files.map((file) => (
                          <div key={file.id} className="p-2.5 border border-line rounded-lg flex items-center justify-between hover:bg-surface-subtle text-xs">
                            <div className="truncate pr-2">
                              <div className="font-medium text-ink truncate">
                                {file.file_name || `Berkas ${file.file_type}`}
                              </div>
                              <div className="text-ink-muted text-[11px]">
                                Tipe: {file.file_type} • {(file.file_size ? `${Math.round(file.file_size / 1024)} KB` : 'PDF')}
                              </div>
                            </div>
                            <a
                              href={`/api/v1/uploads/${file.file_id}/download`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-ink-muted hover:text-brand-fg p-1 rounded"
                              title="Unduh Berkas"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-ink-muted italic p-3 bg-surface-subtle rounded-lg border border-dashed border-line">
                        Tidak ada berkas digital terlampir.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION 2 & 3: Formulir Dokumentasi, Lokasi Arsip, dan Survei */}
              <form onSubmit={handleSaveArchive} className="bg-surface rounded-xl shadow-sm border border-line p-5 space-y-6">
                <div className="border-b border-line pb-3 flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-brand-fg" />
                  <h3 className="font-bold text-base text-ink">
                    Formulir Verifikasi Dokumentasi & Evaluasi Mutu
                  </h3>
                </div>

                {/* Dua Pertanyaan Wajib Dokumentator */}
                <div className="space-y-4 bg-surface-subtle p-4 rounded-xl border border-line">
                  {/* Pertanyaan 1 */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-ink">
                      1. Apakah dokumentasi terhadap mushaf master ini sudah ada? <span className="text-civic-danger">*</span>
                    </label>
                    <div className="flex items-center gap-6">
                      <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-ink">
                        <input
                          type="radio"
                          name="has_master_doc"
                          checked={hasMasterDoc === true}
                          onChange={() => setHasMasterDoc(true)}
                          className="w-4 h-4 text-brand-fill focus:ring-brand-700/20"
                        />
                        <span>Ya, sudah ada</span>
                      </label>
                      <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-ink">
                        <input
                          type="radio"
                          name="has_master_doc"
                          checked={hasMasterDoc === false}
                          onChange={() => setHasMasterDoc(false)}
                          className="w-4 h-4 text-brand-fill focus:ring-brand-700/20"
                        />
                        <span>Tidak / Belum ada</span>
                      </label>
                    </div>
                  </div>

                  {/* Pertanyaan 2 */}
                  <div className="space-y-2 pt-2 border-t border-line">
                    <label className="block text-sm font-semibold text-ink">
                      2. Apakah sudah menerima 5 eksemplar dari penerbit? <span className="text-civic-danger">*</span>
                    </label>
                    <div className="flex items-center gap-6">
                      <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-ink">
                        <input
                          type="radio"
                          name="has_5_exemplars"
                          checked={has5Exemplars === true}
                          onChange={() => setHas5Exemplars(true)}
                          className="w-4 h-4 text-brand-fill focus:ring-brand-700/20"
                        />
                        <span>Ya, sudah menerima 5 eksemplar</span>
                      </label>
                      <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-ink">
                        <input
                          type="radio"
                          name="has_5_exemplars"
                          checked={has5Exemplars === false}
                          onChange={() => setHas5Exemplars(false)}
                          className="w-4 h-4 text-brand-fill focus:ring-brand-700/20"
                        />
                        <span>Tidak / Belum diterima</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Lokasi Penyimpanan Arsip (Muncul HANYA jika KEDUA pertanyaan YA) */}
                {isBothYes ? (
                  <div className="p-4 bg-civic-successSoft border border-civic-successLine rounded-xl space-y-4 animate-in fade-in duration-200">
                    <div className="flex items-center gap-2 text-civic-success font-semibold text-sm">
                      <MapPin className="w-4 h-4 text-civic-success" />
                      <span>Alokasi Lokasi Tempat Penyimpanan Berkas & Deposit Mushaf Fisik</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-ink mb-1">
                          Tempat Lemari <span className="text-civic-danger">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="Misal: Lemari A, Lemari 02"
                          value={cabinet}
                          onChange={(e) => setCabinet(e.target.value)}
                          required={isBothYes}
                          className="w-full px-3 py-2 text-sm bg-surface border border-line-strong rounded-lg focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-ink mb-1">
                          Nomor / Baris Rak <span className="text-civic-danger">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="Misal: Rak 3, Tingkat 1"
                          value={shelf}
                          onChange={(e) => setShelf(e.target.value)}
                          required={isBothYes}
                          className="w-full px-3 py-2 text-sm bg-surface border border-line-strong rounded-lg focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-ink mb-1">
                          Nomor / Kode Berkas <span className="text-civic-danger">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="Misal: ARSIP-2026-M042"
                          value={archiveCode}
                          onChange={(e) => setArchiveCode(e.target.value)}
                          required={isBothYes}
                          className="w-full px-3 py-2 text-sm bg-surface border border-line-strong rounded-lg focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-ink mb-1">
                        Catatan Khusus Tempat Penyimpanan (Opsional)
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Disimpan dalam boks arsip nomor 12 bersama mushaf master"
                        value={storageNotes}
                        onChange={(e) => setStorageNotes(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-surface border border-line-strong rounded-lg focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 outline-none"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 bg-surface-subtle border border-dashed border-line rounded-lg text-xs text-ink-muted flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-ink-muted shrink-0" />
                    <span>Formulir lemari dan rak penyimpanan arsip akan terbuka otomatis apabila kedua pertanyaan di atas dijawab <strong>"Ya"</strong>.</span>
                  </div>
                )}

                {/* Survei Mutu Mushaf Sesuai Standar Tashih.go.id */}
                <div className="space-y-4 pt-2 border-t border-line">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-brand-fg" />
                    <h4 className="font-bold text-sm text-ink">
                      Survei Mutu Mushaf Fisik (Format Resmi Tashih.go.id)
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* 1. Cetak Huruf & Tinta */}
                    <div>
                      <label className="block text-xs font-semibold text-ink mb-1">
                        1. Mutu Cetak Huruf & Kepekatan Tinta
                      </label>
                      <select
                        value={survey.print_quality}
                        onChange={(e) => setSurvey({ ...survey, print_quality: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-line-strong rounded-lg focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 outline-none bg-surface"
                      >
                        {QUALITY_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* 2. Mutu Kertas */}
                    <div>
                      <label className="block text-xs font-semibold text-ink mb-1">
                        2. Mutu Kertas Mushaf (Ketebalan & Warna)
                      </label>
                      <select
                        value={survey.paper_quality}
                        onChange={(e) => setSurvey({ ...survey, paper_quality: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-line-strong rounded-lg focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 outline-none bg-surface"
                      >
                        {QUALITY_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* 3. Mutu Jilid & Jahitan */}
                    <div>
                      <label className="block text-xs font-semibold text-ink mb-1">
                        3. Mutu Jilid & Jahitan Punggung Mushaf
                      </label>
                      <select
                        value={survey.binding_quality}
                        onChange={(e) => setSurvey({ ...survey, binding_quality: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-line-strong rounded-lg focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 outline-none bg-surface"
                      >
                        {QUALITY_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* 4. Kejelasan Tanda Baca */}
                    <div>
                      <label className="block text-xs font-semibold text-ink mb-1">
                        4. Kejelasan Tanda Baca & Rasm Standar
                      </label>
                      <select
                        value={survey.font_clarity}
                        onChange={(e) => setSurvey({ ...survey, font_clarity: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-line-strong rounded-lg focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 outline-none bg-surface"
                      >
                        {QUALITY_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* 5. Finishing Cover */}
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-ink mb-1">
                        5. Penyelesaian Cover / Hardcover Finishing
                      </label>
                      <select
                        value={survey.cover_finishing}
                        onChange={(e) => setSurvey({ ...survey, cover_finishing: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-line-strong rounded-lg focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 outline-none bg-surface"
                      >
                        {QUALITY_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1">
                      Catatan Evaluasi / Rekomendasi Mutu Dokumentator
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Tuliskan catatan teknis hasil pemeriksaan fisik dan deposit 5 eksemplar..."
                      value={survey.notes}
                      onChange={(e) => setSurvey({ ...survey, notes: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-line-strong rounded-lg focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 outline-none"
                    />
                  </div>
                </div>

                {/* Tombol Simpan */}
                <div className="pt-4 border-t border-line flex items-center justify-end gap-3">
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={saving}
                    className="flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    {saving ? 'Menyimpan...' : 'Simpan Dokumentasi & Arsip'}
                  </Button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DokumentatorArchivePage;

