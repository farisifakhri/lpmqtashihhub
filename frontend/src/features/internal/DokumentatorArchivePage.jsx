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
  Filter,
  PenTool,
  Clock,
  History,
  Send,
  X,
  FileCheck2,
} from 'lucide-react';
import { registrationApi } from '@/api/registration.api';
import { documentationApi } from '@/api/documentation.api';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { showToast } from '@/components/ui/toast';
import { TashihLoader } from '@/components/ui/TashihLoader';
import { formatDocumentType, formatDocumentStatus } from '@/lib/glossary';

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
  const [tabFilter, setTabFilter] = useState('ALL'); // ALL, READY_FOR_STT, WAITING_TU, STT_ISSUED, COMPLETED, PENDING, ARCHIVED

  // Quick Filters (Paket B-11)
  const [yearFilter, setYearFilter] = useState('ALL');
  const [monthFilter, setMonthFilter] = useState('ALL');
  const [standardFilter, setStandardFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Modals state
  const [createDraftModalReg, setCreateDraftModalReg] = useState(null);
  const [historyModalReg, setHistoryModalReg] = useState(null);

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
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNo = reg.registration_no?.toLowerCase().includes(q);
        const matchTitle = reg.title?.toLowerCase().includes(q);
        const matchPub = reg.publisher?.legal_name?.toLowerCase().includes(q);
        if (!matchNo && !matchTitle && !matchPub) return false;
      }

      // Year Filter
      if (yearFilter !== 'ALL') {
        const regYear = new Date(reg.created_at).getFullYear().toString();
        if (regYear !== yearFilter) return false;
      }

      // Month Filter
      if (monthFilter !== 'ALL') {
        const regMonth = String(new Date(reg.created_at).getMonth() + 1).padStart(2, '0');
        if (regMonth !== monthFilter) return false;
      }

      // Standard Mushaf Filter
      if (standardFilter !== 'ALL') {
        const serviceName = (reg.service_type?.name || '').toLowerCase();
        const title = (reg.title || '').toLowerCase();
        const std = standardFilter.toLowerCase();
        if (!serviceName.includes(std) && !title.includes(std)) return false;
      }

      // Category Filter
      if (categoryFilter !== 'ALL') {
        const kind = reg.service_type?.service_kind || '';
        const name = (reg.service_type?.name || '').toLowerCase();
        if (categoryFilter === 'BARU' && !name.includes('baru') && kind !== 'REGULAR') return false;
        if (categoryFilter === 'PERPANJANGAN' && !name.includes('perpanjangan') && kind !== 'PERPANJANGAN') return false;
        if (categoryFilter === 'LUAR_NEGERI' && !name.includes('luar negeri') && kind !== 'LUAR_NEGERI') return false;
      }

      const isArchived = Boolean(reg.foreign_metadata?.documentation_archive?.storage_location?.archive_code);
      const sttDoc = reg.official_documents?.find((d) => d.document_type === 'SURAT_TANDA_TASHIH');
      const isTuSubmitted = sttDoc?.content_snapshot?.tu_workflow?.status === 'SUBMITTED_TO_TU';

      if (tabFilter === 'READY_FOR_STT') return reg.status === 'READY_FOR_STT' && !sttDoc;
      if (tabFilter === 'WAITING_TU') return sttDoc && sttDoc.status !== 'ISSUED' && reg.status !== 'STT_ISSUED';
      if (tabFilter === 'STT_ISSUED') return reg.status === 'STT_ISSUED' || reg.status === 'DOCUMENTATION_IN_PROGRESS';
      if (tabFilter === 'COMPLETED') return reg.status === 'COMPLETED';
      if (tabFilter === 'ARCHIVED') return isArchived;
      if (tabFilter === 'PENDING') return !isArchived;

      return true;
    });
  }, [registrations, searchQuery, yearFilter, monthFilter, standardFilter, categoryFilter, tabFilter]);

  const isBothYes = hasMasterDoc === true && has5Exemplars === true;

  const handleCreateDraftStt = async (regId) => {
    setSaving(true);
    try {
      await documentationApi.createOfficialDocument(regId, { document_type: 'SURAT_TANDA_TASHIH' });
      showToast('Draf Surat Tanda Tashih (STT) berhasil dibuat.', 'success');
      setCreateDraftModalReg(null);
      await fetchRegistrations();
      if (selectedId === regId) await loadDetail(regId);
    } catch (err) {
      showToast(err.message || 'Gagal membuat draf STT.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitToTu = async (documentId) => {
    setSaving(true);
    try {
      await documentationApi.submitToTu(documentId);
      showToast('Draf STT berhasil diteruskan ke Tata Usaha untuk pembubuhan paraf.', 'success');
      await fetchRegistrations();
      if (selectedId) await loadDetail(selectedId);
    } catch (err) {
      showToast(err.message || 'Gagal mengirim draf STT ke Tata Usaha.', 'error');
    } finally {
      setSaving(false);
    }
  };

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
              <span>Modul Pengarsipan & Verifikasi Fisik</span>
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
        {/* Left Column: Registration List / Cards per Mushaf (Paket B-11) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-surface rounded-xl shadow-sm border border-line p-4 space-y-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari nomor registrasi atau judul..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-line-strong rounded-lg focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 outline-none"
              />
            </div>

            {/* Quick Filter Bar: Tahun, Bulan, Standar, Kategori (B-11) */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-ink-muted mb-0.5">Tahun</label>
                <select
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                  className="w-full px-2 py-1.5 border border-line-strong rounded-md text-xs bg-surface"
                >
                  <option value="ALL">Semua Tahun</option>
                  <option value="2026">2026</option>
                  <option value="2025">2025</option>
                  <option value="2024">2024</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-ink-muted mb-0.5">Bulan</label>
                <select
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                  className="w-full px-2 py-1.5 border border-line-strong rounded-md text-xs bg-surface"
                >
                  <option value="ALL">Semua Bulan</option>
                  <option value="01">Januari</option>
                  <option value="02">Februari</option>
                  <option value="03">Maret</option>
                  <option value="04">April</option>
                  <option value="05">Mei</option>
                  <option value="06">Juni</option>
                  <option value="07">Juli</option>
                  <option value="08">Agustus</option>
                  <option value="09">September</option>
                  <option value="10">Oktober</option>
                  <option value="11">November</option>
                  <option value="12">Desember</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-ink-muted mb-0.5">Standar Mushaf</label>
                <select
                  value={standardFilter}
                  onChange={(e) => setStandardFilter(e.target.value)}
                  className="w-full px-2 py-1.5 border border-line-strong rounded-md text-xs bg-surface"
                >
                  <option value="ALL">Semua Standar</option>
                  <option value="Usmani">Usmani</option>
                  <option value="Bahriyah">Bahriyah</option>
                  <option value="Braille">Braille</option>
                  <option value="Isyarat">Isyarat</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-ink-muted mb-0.5">Kategori</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full px-2 py-1.5 border border-line-strong rounded-md text-xs bg-surface"
                >
                  <option value="ALL">Semua Kategori</option>
                  <option value="BARU">Mushaf Baru</option>
                  <option value="PERPANJANGAN">Perpanjangan STT</option>
                  <option value="LUAR_NEGERI">Mushaf Luar Negeri</option>
                </select>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap border-b border-line pb-1 gap-1 text-xs font-medium">
              <button
                type="button"
                onClick={() => setTabFilter('ALL')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  tabFilter === 'ALL'
                    ? 'bg-brand-50 text-brand-800 font-bold border border-brand-200'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                Semua ({registrations.length})
              </button>
              <button
                type="button"
                onClick={() => setTabFilter('READY_FOR_STT')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  tabFilter === 'READY_FOR_STT'
                    ? 'bg-amber-50 text-amber-800 font-bold border border-amber-200'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                Siap Draf STT
              </button>
              <button
                type="button"
                onClick={() => setTabFilter('WAITING_TU')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  tabFilter === 'WAITING_TU'
                    ? 'bg-blue-50 text-blue-800 font-bold border border-blue-200'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                Proses TU/Kepala
              </button>
              <button
                type="button"
                onClick={() => setTabFilter('STT_ISSUED')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  tabFilter === 'STT_ISSUED'
                    ? 'bg-purple-50 text-purple-800 font-bold border border-purple-200'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                STT Terbit
              </button>
              <button
                type="button"
                onClick={() => setTabFilter('PENDING')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  tabFilter === 'PENDING'
                    ? 'bg-brand-50 text-brand-800 font-bold border border-brand-200'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                Belum Arsip
              </button>
              <button
                type="button"
                onClick={() => setTabFilter('ARCHIVED')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  tabFilter === 'ARCHIVED'
                    ? 'bg-brand-50 text-brand-800 font-bold border border-brand-200'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                Arsip Rapi
              </button>
            </div>

            {/* Registration Cards */}
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
              <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
                {filteredRegistrations.map((item) => {
                  const isSelected = item.id === selectedId;
                  const isArchived = Boolean(item.foreign_metadata?.documentation_archive?.storage_location?.archive_code);
                  const sttDoc = item.official_documents?.find((d) => d.document_type === 'SURAT_TANDA_TASHIH');
                  const tuWorkflow = sttDoc?.content_snapshot?.tu_workflow;
                  const isTuSubmitted = tuWorkflow?.status === 'SUBMITTED_TO_TU';
                  const hasParaf1 = Boolean(tuWorkflow?.paraf_1);
                  const hasParaf2 = Boolean(tuWorkflow?.paraf_2);

                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedId(item.id)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-2.5 ${
                        isSelected
                          ? 'border-brand-700 bg-brand-50/40 shadow-xs ring-1 ring-brand-700'
                          : 'border-line hover:border-line-strong bg-white hover:bg-surface-subtle'
                      }`}
                    >
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-xs text-brand-800 font-mono bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
                            {item.registration_no}
                          </span>
                          <span className="text-[11px] text-ink-muted font-mono">
                            {new Date(item.created_at).toLocaleDateString('id-ID')}
                          </span>
                        </div>
                        <StatusBadge status={item.status} size="xs" />
                      </div>

                      {/* Title & Publisher */}
                      <div>
                        <div className="font-bold text-sm text-ink line-clamp-1">
                          {item.title}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-ink-muted mt-0.5">
                          <Building2 className="w-3.5 h-3.5 text-ink-muted shrink-0" />
                          <span className="truncate max-w-[150px]">{item.publisher?.legal_name || 'Penerbit'}</span>
                          <span>•</span>
                          <span className="truncate">{item.service_type?.name || 'Tashih Standar'}</span>
                        </div>
                      </div>

                      {/* STT Status & Paraf Tracking */}
                      <div className="p-2 bg-surface-subtle rounded-md text-[11px] space-y-1 border border-line">
                        <div className="flex items-center justify-between text-ink font-semibold">
                          <span>Surat Tanda Tashih:</span>
                          {sttDoc ? (
                            <span className="font-mono text-brand-800">{sttDoc.document_no}</span>
                          ) : item.status === 'READY_FOR_STT' ? (
                            <span className="text-amber-700 font-bold">Siap Draf STT</span>
                          ) : (
                            <span className="text-ink-muted">Belum ada</span>
                          )}
                        </div>
                        {sttDoc && (
                          <div className="flex items-center gap-2 text-ink-muted pt-1 border-t border-line">
                            <span>Paraf 1: <strong className={hasParaf1 ? 'text-civic-success' : 'text-amber-600'}>{hasParaf1 ? '✓ Sudah' : 'Menunggu'}</strong></span>
                            <span>·</span>
                            <span>Paraf 2: <strong className={hasParaf2 ? 'text-civic-success' : 'text-amber-600'}>{hasParaf2 ? '✓ Sudah' : 'Menunggu'}</strong></span>
                            <span>·</span>
                            <span>TTD: <strong className={sttDoc.status === 'ISSUED' ? 'text-civic-success' : 'text-amber-600'}>{sttDoc.status === 'ISSUED' ? '✓ Sah' : 'Menunggu'}</strong></span>
                          </div>
                        )}
                      </div>

                      {/* 5 Exemplar Archive status */}
                      <div className="text-xs">
                        {isArchived ? (
                          <div className="flex items-center gap-1.5 text-civic-success font-medium bg-civic-successSoft px-2.5 py-1 rounded border border-civic-successLine">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">Arsip Tersimpan ({item.foreign_metadata?.documentation_archive?.storage_location?.archive_code})</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-civic-warning font-medium bg-civic-warningSoft px-2.5 py-1 rounded border border-civic-warningLine">
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            <span>Deposit 5 Eksemplar: Belum Dicatat</span>
                          </div>
                        )}
                      </div>

                      {/* Card Action Buttons */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-line" onClick={(e) => e.stopPropagation()}>
                        {item.status === 'READY_FOR_STT' && !sttDoc && (
                          <Button
                            size="xs"
                            variant="primary"
                            onClick={() => setCreateDraftModalReg(item)}
                            className="text-xs font-bold"
                          >
                            <PenTool className="w-3 h-3 mr-1" />
                            Buat Draf STT
                          </Button>
                        )}
                        {sttDoc && !isTuSubmitted && sttDoc.status !== 'ISSUED' && (
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => handleSubmitToTu(sttDoc.id)}
                            className="text-xs font-bold text-amber-700 border-amber-300 hover:bg-amber-50"
                          >
                            <Send className="w-3 h-3 mr-1" />
                            Kirim ke TU
                          </Button>
                        )}
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => setHistoryModalReg(item)}
                          className="text-xs"
                        >
                          <History className="w-3 h-3 mr-1 text-ink-muted" />
                          Riwayat
                        </Button>
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => setSelectedId(item.id)}
                          className="text-xs text-brand-800 border-brand-200 hover:bg-brand-50"
                        >
                          <MapPin className="w-3 h-3 mr-1" />
                          Catat Arsip
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Detailed Workspace */}
        <div className="lg:col-span-7 space-y-6">
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
                                  {formatDocumentType(doc.document_type)}
                                </div>
                                <div className="text-ink-muted font-mono text-[11px]">
                                  {doc.document_no} (v{doc.version}) • Status: {formatDocumentStatus(doc.status)}
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

      {/* Modal: Buat Draf STT (Paket B-11) */}
      {createDraftModalReg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-line">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2 text-brand-950 font-bold text-sm">
                <FileCheck2 className="w-5 h-5 text-brand-700" />
                Buat Draf Surat Tanda Tashih (STT)
              </div>
              <button
                onClick={() => setCreateDraftModalReg(null)}
                className="text-ink-muted hover:text-ink p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-ink-muted">
              Naskah ini telah menyelesaikan sidang pentashihan dan dinyatakan lolos. Anda akan membuat berkas draf STT atomik dengan penomoran draf resmi yang nantinya diteruskan ke Tata Usaha.
            </p>

            <div className="p-3 bg-canvas border border-line rounded-lg text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-ink-muted">Nomor Registrasi:</span>
                <strong className="font-mono text-ink">{createDraftModalReg.registration_no}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Judul Naskah:</span>
                <strong className="text-ink text-right">{createDraftModalReg.title}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Penerbit:</span>
                <strong className="text-ink">{createDraftModalReg.publisher?.legal_name}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Layanan / Standar:</span>
                <strong className="text-ink">{createDraftModalReg.service_type?.name}</strong>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-line">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCreateDraftModalReg(null)}
                disabled={saving}
              >
                Batal
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleCreateDraftStt(createDraftModalReg.id)}
                disabled={saving}
                className="font-bold"
              >
                {saving ? 'Memproses...' : 'Buat Draf STT Sekarang'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Riwayat Dokumen Lengkap (Paket B-11) */}
      {historyModalReg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-xl max-w-xl w-full p-6 space-y-4 shadow-xl border border-line max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2 text-brand-950 font-bold text-sm">
                <History className="w-5 h-5 text-brand-700" />
                Riwayat Dokumen Resmi & Arsip Naskah
              </div>
              <button
                onClick={() => setHistoryModalReg(null)}
                className="text-ink-muted hover:text-ink p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-canvas border border-line rounded-lg text-xs space-y-1">
              <p>Nomor Registrasi: <strong className="font-mono text-ink">{historyModalReg.registration_no}</strong></p>
              <p>Judul: <strong className="text-ink">{historyModalReg.title}</strong></p>
            </div>

            <div className="overflow-y-auto space-y-2 flex-1 pr-1 text-xs">
              <h5 className="font-bold text-ink uppercase tracking-wider text-[11px]">Daftar Dokumen Resmi:</h5>
              {historyModalReg.official_documents && historyModalReg.official_documents.length > 0 ? (
                <div className="divide-y divide-line border border-line rounded-lg overflow-hidden">
                  {historyModalReg.official_documents.map((doc) => (
                    <div key={doc.id} className="p-2.5 flex items-center justify-between hover:bg-canvas">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-brand-700 shrink-0" />
                        <div>
                          <div className="font-bold text-ink">{doc.document_no || `DOC-${doc.id.slice(0, 6)}`}</div>
                          <div className="text-[11px] text-ink-muted">
                            {formatDocumentType(doc.document_type)} · Versi {doc.version} · {formatDocumentStatus(doc.status)}
                          </div>
                        </div>
                      </div>
                      <a
                        href={`/api/v1/official-documents/${doc.id}/pdf`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded border border-line text-brand-800 font-semibold hover:bg-brand-50"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Lihat PDF
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-ink-muted italic p-3 bg-canvas rounded-lg">Belum ada dokumen resmi yang diterbitkan untuk naskah ini.</p>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-line">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setHistoryModalReg(null)}
              >
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DokumentatorArchivePage;

