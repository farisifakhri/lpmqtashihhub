import React, { useCallback, useEffect, useState } from "react";
import {
    Building2,
    ShieldCheck,
    CheckCircle2,
    AlertTriangle,
    XCircle,
    Search,
    RefreshCw,
    FileText,
    Download,
    ExternalLink,
    AlertCircle,
    Eye,
    Calendar,
    Award,
    Clock,
    X,
    Building,
    Landmark,
} from "lucide-react";
import { publisherRegistrationApi } from "@/api/publisher-registration.api";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PrivateFileViewer } from "@/components/common/PrivateFileViewer";
import { ConfirmationSummaryDialog } from "@/components/common/ConfirmationSummaryDialog";

const STATUS_TABS = [
    { id: "SEMUA", label: "Semua Permohonan" },
    { id: "DIAJUKAN", label: "Menunggu Verifikasi" },
    { id: "PERLU_PERBAIKAN", label: "Perlu Perbaikan" },
    { id: "DISETUJUI", label: "Disetujui" },
    { id: "DITOLAK", label: "Ditolak" },
];

const STATUS_BADGES = {
    DIAJUKAN: {
        label: "Menunggu Verifikasi",
        badgeClass: "bg-brand-50 text-brand-800 border-brand-200",
        icon: Clock,
    },
    PERLU_PERBAIKAN: {
        label: "Perlu Perbaikan",
        badgeClass: "bg-civic-warningSoft text-civic-warning border-civic-warningLine",
        icon: AlertTriangle,
    },
    DISETUJUI: {
        label: "Disetujui",
        badgeClass: "bg-brand-50 text-brand-900 border-brand-300",
        icon: CheckCircle2,
    },
    DITOLAK: {
        label: "Ditolak",
        badgeClass: "bg-civic-dangerSoft text-civic-danger border-civic-dangerLine",
        icon: XCircle,
    },
};

const DOC_TYPE_LABELS = {
    SURAT_PENDAFTARAN: "Surat Permohonan Pendaftaran",
    AKTA_NOTARIS: "Akta Notaris & SK Kemenkumham",
    PROFIL: "Profil Instansi / Perusahaan",
    NPWP: "NPWP Badan Usaha",
    NIB: "Nomor Induk Berusaha (NIB)",
    KTP_PENANGGUNG_JAWAB: "KTP Pimpinan / Penanggung Jawab",
};

export const PublisherVerificationPage = () => {
    const [selectedStatus, setSelectedStatus] = useState("DIAJUKAN");
    const [searchTerm, setSearchTerm] = useState("");
    const [activeSearch, setActiveSearch] = useState("");
    const [items, setItems] = useState([]);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total_records: 0,
        total_pages: 1,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    // Modal Detail State
    const [selectedId, setSelectedId] = useState(null);
    const [detailData, setDetailData] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState("");

    // Preview File Modal State
    const [previewDoc, setPreviewDoc] = useState(null);

    // Decision Form State
    const [decisionType, setDecisionType] = useState("SETUJUI");
    const [decisionReason, setDecisionReason] = useState("");
    const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);
    const [decisionError, setDecisionError] = useState("");
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);

    // Load list from backend
    const loadRegistrations = useCallback(async () => {
        setIsLoading(true);
        setError("");
        try {
            const res = await publisherRegistrationApi.listAdmin({
                status: selectedStatus,
                search: activeSearch,
                page: pagination.page,
                limit: 10,
            });
            setItems(res.data || []);
            if (res.pagination) {
                setPagination((prev) => ({
                    ...prev,
                    page: res.pagination.page,
                    limit: res.pagination.limit,
                    total_records: res.pagination.total_records,
                    total_pages: res.pagination.total_pages,
                }));
            }
        } catch (err) {
            setError(err.message || "Gagal memuat daftar pendaftaran penerbit.");
        } finally {
            setIsLoading(false);
        }
    }, [selectedStatus, activeSearch, pagination.page]);

    useEffect(() => {
        loadRegistrations();
    }, [loadRegistrations]);

    // Search debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            setActiveSearch(searchTerm);
            setPagination((p) => ({ ...p, page: 1 }));
        }, 400);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Load detail
    const openDetailModal = async (id) => {
        setSelectedId(id);
        setDetailData(null);
        setDetailError("");
        setDecisionType("SETUJUI");
        setDecisionReason("");
        setDecisionError("");
        setDetailLoading(true);

        try {
            const res = await publisherRegistrationApi.getAdminDetail(id);
            if (res?.success && res?.data) {
                setDetailData(res.data);
            } else {
                throw new Error(res?.message || "Gagal memuat detail pendaftaran.");
            }
        } catch (err) {
            setDetailError(err.message || "Rincian pendaftaran tidak dapat dimuat.");
        } finally {
            setDetailLoading(false);
        }
    };

    const closeDetailModal = () => {
        setSelectedId(null);
        setDetailData(null);
        setPreviewDoc(null);
        setDecisionError("");
    };

    // Handle submit decision
    const handleSubmitDecision = async () => {
        if (!detailData) return;

        // Validasi alasan wajib untuk PERLU_PERBAIKAN dan TOLAK
        if (decisionType !== "SETUJUI" && (!decisionReason || !decisionReason.trim())) {
            setDecisionError(
                `Alasan wajib dicantumkan jika keputusan adalah ${
                    decisionType === "PERLU_PERBAIKAN" ? "Perlu Perbaikan" : "Tolak"
                }.`
            );
            return;
        }

        setDecisionError("");
        setIsSubmittingDecision(true);

        try {
            await publisherRegistrationApi.decideAdmin(detailData.id, {
                keputusan: decisionType,
                alasan: decisionReason.trim() || null,
                versi: detailData.versi,
            });

            const decisionLabel =
                decisionType === "SETUJUI"
                    ? "disetujui"
                    : decisionType === "PERLU_PERBAIKAN"
                    ? "diminta perbaikan berkas"
                    : "ditolak";

            setSuccessMessage(
                `Pendaftaran ${detailData.nama_penerbit} (${detailData.kode_pendaftaran}) berhasil ${decisionLabel}.`
            );
            closeDetailModal();
            setShowConfirmDialog(false);
            loadRegistrations();
        } catch (err) {
            const code = err.data?.code || err.code;
            if (code === "VERSION_CONFLICT" || err.status === 409) {
                setShowConfirmDialog(false);
                setDecisionError(
                    "Konflik Versi: Data pendaftaran ini telah diperbarui oleh petugas lain. Halaman akan memuat ulang data terbaru."
                );
                // Muat ulang data terbaru
                setTimeout(() => {
                    openDetailModal(detailData.id);
                    loadRegistrations();
                }, 1500);
            } else {
                setDecisionError(
                    err.message || "Gagal menyimpan keputusan pendaftaran penerbit."
                );
            }
        } finally {
            setIsSubmittingDecision(false);
        }
    };

    const handleDownloadDoc = async (doc) => {
        if (!detailData || !doc) return;
        try {
            await publisherRegistrationApi.downloadDocument(
                detailData.id,
                doc.id,
                doc.nama_asli || `${doc.tipe}.pdf`
            );
        } catch (err) {
            alert(err.message || "Gagal mengunduh dokumen.");
        }
    };

    const handleDownloadCert = async () => {
        if (!detailData) return;
        try {
            await publisherRegistrationApi.downloadCertificate(
                detailData.id,
                `sertifikat-${detailData.kode_pendaftaran}.pdf`
            );
        } catch (err) {
            alert(err.message || "Gagal mengunduh sertifikat penerbit.");
        }
    };

    return (
        <div className="space-y-6 p-4 sm:p-6 lg:p-8 animate-page-in">
            {/* Header Halaman */}
            <header className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-brand-50 border border-brand-100 text-brand-800 text-xs font-bold uppercase tracking-wider mb-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Tata Kelola Penerbit</span>
                    </div>
                    <h1 className="text-2xl font-bold text-ink">
                        Verifikasi Pendaftaran Penerbit
                    </h1>
                    <p className="mt-1 max-w-2xl text-xs sm:text-sm text-ink-muted">
                        Pemeriksaan berkas legalitas, peninjauan potensi risiko keamanan berkas, dan pengambilan keputusan persetujuan pendaftaran akun penerbit mushaf Al-Qur'an.
                    </p>
                </div>

                <Button
                    variant="outline"
                    size="sm"
                    disabled={isLoading}
                    onClick={loadRegistrations}
                    className="cursor-pointer"
                >
                    <RefreshCw className={`h-4 w-4 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
                    <span>Muat Ulang</span>
                </Button>
            </header>

            {/* Alert Notifikasi Sukses / Error */}
            {successMessage && (
                <div
                    role="status"
                    className="p-4 rounded-xl bg-brand-50 border border-brand-200 text-brand-900 text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 animate-fadeIn"
                >
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-brand-700 flex-shrink-0" />
                        <span>{successMessage}</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setSuccessMessage("")}
                        className="text-brand-700 hover:text-brand-900 text-xs font-bold cursor-pointer"
                    >
                        Tutup
                    </button>
                </div>
            )}

            {error && (
                <div
                    role="alert"
                    className="p-4 rounded-xl bg-civic-dangerSoft border border-civic-dangerLine text-civic-danger text-xs sm:text-sm flex items-center gap-2.5 animate-fadeIn"
                >
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* Filter Status Tabs & Search */}
            <div className="rounded-xl border border-line bg-surface p-4 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Tabs Status */}
                    <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-surface-subtle border border-line/70">
                        {STATUS_TABS.map((tab) => {
                            const active = selectedStatus === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => {
                                        setSelectedStatus(tab.id);
                                        setPagination((p) => ({ ...p, page: 1 }));
                                    }}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                        active
                                            ? "bg-surface text-brand-800 shadow-2xs border border-line/60"
                                            : "text-ink-muted hover:text-ink"
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Search Input */}
                    <div className="relative w-full sm:w-72">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Cari nama, kode, email, NPWP..."
                            className="w-full pl-9 pr-4 py-2 text-xs bg-canvas focus:bg-surface border border-line-strong rounded-xl outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-fg transition-all text-ink placeholder:text-ink-muted"
                        />
                        <Search className="w-4 h-4 text-ink-muted absolute left-3 top-2.5 pointer-events-none" />
                    </div>
                </div>

                <div className="text-[11px] text-ink-muted flex items-center justify-between border-t border-line/60 pt-2.5">
                    <span>
                        Menampilkan <strong>{items.length}</strong> dari <strong>{pagination.total_records}</strong> permohonan pendaftaran.
                    </span>
                    <span>Hak verifikasi: SUPERADMIN dan ADMIN_INTERNAL</span>
                </div>
            </div>

            {/* DAFTAR PENDAFTARAN PENERBIT */}
            {isLoading ? (
                <div className="p-12 text-center rounded-2xl border border-line bg-surface space-y-3">
                    <RefreshCw className="w-7 h-7 animate-spin text-brand-700 mx-auto" />
                    <p className="text-xs text-ink-muted font-medium">
                        Memuat data pendaftaran penerbit dari server...
                    </p>
                </div>
            ) : items.length === 0 ? (
                <EmptyState
                    icon={<ShieldCheck />}
                    title="Tidak ada data pendaftaran penerbit"
                    description={`Tidak ada pendaftaran yang sesuai dengan filter "${
                        STATUS_TABS.find((t) => t.id === selectedStatus)?.label
                    }"${activeSearch ? ` dan kata kunci "${activeSearch}"` : ""}.`}
                />
            ) : (
                <div className="space-y-3">
                    {items.map((reg) => {
                        const statusConfig = STATUS_BADGES[reg.status] || {
                            label: reg.status,
                            badgeClass: "bg-surface-subtle text-ink border-line",
                            icon: Clock,
                        };
                        const StatusIcon = statusConfig.icon;

                        return (
                            <article
                                key={reg.id}
                                className="rounded-xl border border-line bg-surface p-4 sm:p-5 hover:border-brand-600/30 transition-all shadow-2xs"
                            >
                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                    <div className="flex items-start gap-3 min-w-0">
                                        <div className="rounded-xl bg-brand-50 p-2.5 text-brand-800 border border-brand-100 shrink-0 mt-0.5">
                                            {reg.jenis_penerbit === "LEMBAGA_PEMERINTAH" ? (
                                                <Landmark className="h-5 w-5" />
                                            ) : (
                                                <Building2 className="h-5 w-5" />
                                            )}
                                        </div>

                                        <div className="min-w-0 space-y-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h2 className="font-bold text-ink text-sm sm:text-base leading-tight">
                                                    {reg.nama_penerbit}
                                                </h2>
                                                <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-surface-subtle border border-line text-ink-muted">
                                                    {reg.kode_pendaftaran}
                                                </span>
                                            </div>

                                            <p className="text-xs text-ink-muted">
                                                <span>{reg.jenis_penerbit}</span>
                                                {reg.email && <span> · {reg.email}</span>}
                                            </p>

                                            <div className="flex flex-wrap items-center gap-3 text-[11px] text-ink-muted pt-1">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-3.5 h-3.5 text-brand-fg" />
                                                    Diajukan:{" "}
                                                    {reg.created_at
                                                        ? new Date(reg.created_at).toLocaleDateString("id-ID")
                                                        : "-"}
                                                </span>
                                                <span>Versi: #{reg.versi}</span>

                                                {/* Peringatan Keamanan: Tautan Terdeteksi */}
                                                {reg.tautan_terdeteksi && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-civic-warningSoft text-civic-warning border border-civic-warningLine font-bold text-[10px]">
                                                        <AlertTriangle className="w-3 h-3" />
                                                        Ada Tautan di Dokumen
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Kolom Kanan: Status & Tombol Aksi */}
                                    <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                                        <span
                                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${statusConfig.badgeClass}`}
                                        >
                                            <StatusIcon className="w-3.5 h-3.5" />
                                            <span>{statusConfig.label}</span>
                                        </span>

                                        <Button
                                            size="sm"
                                            onClick={() => openDetailModal(reg.id)}
                                            className="cursor-pointer"
                                        >
                                            <Eye className="w-4 h-4 mr-1.5" />
                                            <span>Periksa & Putuskan</span>
                                        </Button>
                                    </div>
                                </div>
                            </article>
                        );
                    })}

                    {/* Kontrol Paginasi Server */}
                    <div className="flex items-center justify-between rounded-xl border border-line bg-surface px-4 py-3 text-xs sm:text-sm">
                        <span className="text-ink-muted">
                            Halaman <strong>{pagination.page}</strong> dari <strong>{pagination.total_pages || 1}</strong>
                        </span>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={isLoading || pagination.page <= 1}
                                onClick={() =>
                                    setPagination((prev) => ({
                                        ...prev,
                                        page: Math.max(1, prev.page - 1),
                                    }))
                                }
                            >
                                Sebelumnya
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={isLoading || pagination.page >= pagination.total_pages}
                                onClick={() =>
                                    setPagination((prev) => ({
                                        ...prev,
                                        page: prev.page + 1,
                                    }))
                                }
                            >
                                Berikutnya
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DETAIL PENDAFTARAN & PENGAMBILAN KEPUTUSAN */}
            {selectedId && (
                <div
                    data-testid="registration-detail-modal"
                    className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-fadeIn"
                >
                    <div className="w-full max-w-4xl bg-surface rounded-2xl shadow-xl border border-line flex flex-col max-h-[92vh] overflow-hidden my-auto">
                        {/* Header Modal */}
                        <div className="p-4 sm:p-5 border-b border-line flex items-center justify-between bg-surface shrink-0">
                            <div>
                                <span className="text-[11px] font-bold uppercase tracking-wider text-brand-fg">
                                    Verifikasi Berkas & Sidang Keputusan
                                </span>
                                <h2 className="text-lg font-bold text-ink">
                                    {detailData?.nama_penerbit || "Memuat detail..."}
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={closeDetailModal}
                                className="p-2 rounded-xl text-ink-muted hover:text-ink hover:bg-surface-subtle transition-colors cursor-pointer"
                                aria-label="Tutup Detail"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Konten Scroll Modal */}
                        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
                            {detailLoading ? (
                                <div className="p-12 text-center space-y-3">
                                    <RefreshCw className="w-6 h-6 animate-spin text-brand-700 mx-auto" />
                                    <p className="text-xs text-ink-muted font-medium">
                                        Memuat rincian lengkap berkas pendaftaran...
                                    </p>
                                </div>
                            ) : detailError ? (
                                <div className="p-4 rounded-xl bg-civic-dangerSoft border border-civic-dangerLine text-civic-danger text-xs">
                                    {detailError}
                                </div>
                            ) : detailData ? (
                                <>
                                    {/* 1. INFORMASI LEGALITAS & PENGIRIMAN */}
                                    <div className="space-y-3">
                                        <p className="text-xs font-bold uppercase tracking-wider text-brand-fg">
                                            1. Data Identitas Legalitas & Alamat Pengiriman Fisik
                                        </p>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4 rounded-xl bg-surface-subtle border border-line text-xs">
                                            <div>
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted block">
                                                    Kode Pendaftaran
                                                </span>
                                                <span className="font-mono font-bold text-ink">
                                                    {detailData.kode_pendaftaran}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted block">
                                                    Jenis Badan Usaha
                                                </span>
                                                <span className="font-semibold text-ink">
                                                    {detailData.jenis_penerbit}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted block">
                                                    Status Permohonan
                                                </span>
                                                <span className="font-semibold text-ink">
                                                    {STATUS_BADGES[detailData.status]?.label || detailData.status}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted block">
                                                    NPWP Badan
                                                </span>
                                                <span className="font-mono font-semibold text-ink">
                                                    {detailData.npwp || "-"}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted block">
                                                    NIB (OSS)
                                                </span>
                                                <span className="font-mono font-semibold text-ink">
                                                    {detailData.nib || "- (Bukan Perusahaan)"}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted block">
                                                    Versi Record
                                                </span>
                                                <span className="font-semibold text-ink">
                                                    Versi #{detailData.versi}
                                                </span>
                                            </div>
                                            <div className="sm:col-span-2 lg:col-span-3">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted block">
                                                    Alamat Lengkap Kantor (Alamat Pengiriman Naskah Fisik)
                                                </span>
                                                <span className="font-medium text-ink leading-relaxed">
                                                    {detailData.alamat_lengkap}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted block">
                                                    Penanggung Jawab (PIC)
                                                </span>
                                                <span className="font-semibold text-ink">
                                                    {detailData.nama_penanggung_jawab}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted block">
                                                    Nomor WhatsApp / HP
                                                </span>
                                                <span className="font-mono text-ink">
                                                    {detailData.telepon_penanggung_jawab}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted block">
                                                    Email Resmi
                                                </span>
                                                <span className="text-ink">
                                                    {detailData.email}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 2. DAFTAR DOKUMEN & PENGAWASAN KEAMANAN BERKAS */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs font-bold uppercase tracking-wider text-brand-fg">
                                                2. Dokumen Persyaratan & Penanda Keamanan Berkas
                                            </p>
                                            {detailData.status === "DISETUJUI" && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={handleDownloadCert}
                                                    className="cursor-pointer text-xs"
                                                >
                                                    <Award className="w-3.5 h-3.5 mr-1 text-brand-700" />
                                                    <span>Unduh Sertifikat Penerbit</span>
                                                </Button>
                                            )}
                                        </div>

                                        <div className="space-y-2.5">
                                            {detailData.dokumen?.map((doc) => {
                                                const label = DOC_TYPE_LABELS[doc.tipe] || doc.tipe;
                                                const isKtp = doc.tipe === "KTP_PENANGGUNG_JAWAB";
                                                const isPreviewActive = previewDoc?.id === doc.id;

                                                return (
                                                    <div
                                                        key={doc.id}
                                                        className="space-y-2.5"
                                                    >
                                                        <div className="p-3.5 rounded-xl border border-line bg-surface hover:bg-surface-subtle/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                            <div className="space-y-1 min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <FileText className="w-4 h-4 text-brand-800 shrink-0" />
                                                                    <span className="text-xs font-bold text-ink">
                                                                        {label}
                                                                    </span>
                                                                    {isKtp && (
                                                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-surface-subtle border border-line text-ink-muted">
                                                                            Audit Terpantau
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p className="text-[11px] text-ink-muted truncate">
                                                                    Nama file: {doc.nama_asli} ·{" "}
                                                                    {Math.round((doc.ukuran_bytes || 0) / 1024)} KB
                                                                </p>

                                                                {/* Indikator Peringatan Tautan Terdeteksi */}
                                                                {doc.tautan_terdeteksi && (
                                                                    <div className="p-2 rounded-lg bg-civic-warningSoft border border-civic-warningLine text-[11px] text-civic-warning space-y-1">
                                                                        <div className="flex items-center gap-1.5 font-bold">
                                                                            <AlertTriangle className="w-3.5 h-3.5" />
                                                                            <span>Peringatan Keamanan: Terdeteksi Tautan URL di Dokumen</span>
                                                                        </div>
                                                                        {doc.daftar_tautan?.length > 0 && (
                                                                            <ul className="list-disc pl-4 text-ink-muted">
                                                                                {doc.daftar_tautan.map((url, idx) => (
                                                                                    <li key={idx} className="break-all font-mono text-[10px]">
                                                                                        {url}
                                                                                    </li>
                                                                                ))}
                                                                            </ul>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Aksi Berkas */}
                                                            <div className="flex items-center gap-2 shrink-0">
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => setPreviewDoc(doc)}
                                                                    className="text-xs cursor-pointer"
                                                                >
                                                                    <Eye className="w-3.5 h-3.5 mr-1" />
                                                                    <span>Pratinjau</span>
                                                                </Button>

                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => handleDownloadDoc(doc)}
                                                                    className="text-xs cursor-pointer"
                                                                    title="Unduh berkas ke komputer"
                                                                >
                                                                    <Download className="w-3.5 h-3.5 mr-1" />
                                                                    <span>Unduh</span>
                                                                </Button>
                                                            </div>
                                                        </div>

                                                        {isPreviewActive && (
                                                            <div className="space-y-2 rounded-xl border border-brand-200 bg-brand-50/30 p-3">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-xs font-bold text-ink">
                                                                        Pratinjau Dokumen Aman: {label}
                                                                    </span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setPreviewDoc(null)}
                                                                        className="text-xs text-ink-muted hover:text-ink cursor-pointer"
                                                                    >
                                                                        Tutup Pratinjau
                                                                    </button>
                                                                </div>
                                                                <PrivateFileViewer
                                                                    fileId={doc.id}
                                                                    endpoint={`/admin/publisher-registrations/${encodeURIComponent(detailData.id)}/documents/${encodeURIComponent(doc.id)}`}
                                                                    fileName={doc.nama_asli}
                                                                    mimeType={doc.mime_type}
                                                                    height="420px"
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* 3. FORM PENGAMBILAN KEPUTUSAN VERIFIKASI */}
                                    <div className="space-y-4 pt-4 border-t border-line">
                                        <p className="text-xs font-bold uppercase tracking-wider text-brand-fg">
                                            3. Putusan Verifikasi Administrasi (Sidang Penerbit)
                                        </p>

                                        {decisionError && (
                                            <div className="p-3.5 rounded-xl bg-civic-dangerSoft border border-civic-dangerLine text-civic-danger text-xs flex items-start gap-2">
                                                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                                <span>{decisionError}</span>
                                            </div>
                                        )}

                                        {/* Pilihan Radio Keputusan */}
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setDecisionType("SETUJUI")}
                                                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1.5 ${
                                                    decisionType === "SETUJUI"
                                                        ? "bg-brand-50 border-brand-700 ring-2 ring-brand-700/20 shadow-2xs"
                                                        : "bg-surface border-line hover:bg-surface-subtle"
                                                }`}
                                            >
                                                <div className="flex items-center gap-2 text-brand-900 font-bold text-xs">
                                                    <CheckCircle2 className="w-4 h-4 text-brand-700" />
                                                    <span>Setujui Akun</span>
                                                </div>
                                                <span className="text-[11px] text-ink-muted leading-tight">
                                                    Aktifkan akun penerbit agar dapat login dan mengajukan tashih.
                                                </span>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => setDecisionType("PERLU_PERBAIKAN")}
                                                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1.5 ${
                                                    decisionType === "PERLU_PERBAIKAN"
                                                        ? "bg-civic-warningSoft border-civic-warning ring-2 ring-civic-warning/20 shadow-2xs"
                                                        : "bg-surface border-line hover:bg-surface-subtle"
                                                }`}
                                            >
                                                <div className="flex items-center gap-2 text-civic-warning font-bold text-xs">
                                                    <AlertTriangle className="w-4 h-4" />
                                                    <span>Perlu Perbaikan</span>
                                                </div>
                                                <span className="text-[11px] text-ink-muted leading-tight">
                                                    Kirim tautan revisi 14 hari ke email untuk mengganti dokumen.
                                                </span>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => setDecisionType("TOLAK")}
                                                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1.5 ${
                                                    decisionType === "TOLAK"
                                                        ? "bg-civic-dangerSoft border-civic-danger ring-2 ring-civic-danger/20 shadow-2xs"
                                                        : "bg-surface border-line hover:bg-surface-subtle"
                                                }`}
                                            >
                                                <div className="flex items-center gap-2 text-civic-danger font-bold text-xs">
                                                    <XCircle className="w-4 h-4" />
                                                    <span>Tolak Pendaftaran</span>
                                                </div>
                                                <span className="text-[11px] text-ink-muted leading-tight">
                                                    Tolak final dan bebaskan NPWP/NIB agar dapat mendaftar baru.
                                                </span>
                                            </button>
                                        </div>

                                        {/* Input Alasan (Wajib jika bukan SETUJUI) */}
                                        <div>
                                            <label className="block text-xs font-semibold text-ink mb-1">
                                                Catatan / Alasan Keputusan{" "}
                                                {decisionType !== "SETUJUI" && (
                                                    <span className="text-civic-danger">* (Wajib diisi)</span>
                                                )}
                                            </label>
                                            <textarea
                                                rows={3}
                                                value={decisionReason}
                                                onChange={(e) => setDecisionReason(e.target.value)}
                                                placeholder={
                                                    decisionType === "SETUJUI"
                                                        ? "Catatan opsional untuk arsip verifikasi..."
                                                        : decisionType === "PERLU_PERBAIKAN"
                                                        ? "Sebutkan dokumen yang buram/belum lengkap dan instruksi perbaikan untuk penerbit..."
                                                        : "Sebutkan alasan penolakan secara jelas dan formal..."
                                                }
                                                className="w-full px-3.5 py-2 text-xs sm:text-sm bg-canvas focus:bg-surface border border-line-strong rounded-xl outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-fg transition-all text-ink placeholder:text-ink-muted"
                                            />
                                        </div>

                                        {/* Tombol Simpan */}
                                        <div className="flex items-center justify-end gap-2.5 pt-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                disabled={isSubmittingDecision}
                                                onClick={closeDetailModal}
                                            >
                                                Batal
                                            </Button>

                                            <Button
                                                variant={
                                                    decisionType === "TOLAK"
                                                        ? "destructive"
                                                        : decisionType === "PERLU_PERBAIKAN"
                                                        ? "warning"
                                                        : "primary"
                                                }
                                                size="sm"
                                                disabled={isSubmittingDecision}
                                                onClick={() => setShowConfirmDialog(true)}
                                                className="cursor-pointer"
                                            >
                                                {isSubmittingDecision ? (
                                                    <span className="inline-flex items-center gap-1.5">
                                                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                                        Memproses...
                                                    </span>
                                                ) : (
                                                    <span>
                                                        Terapkan Keputusan:{" "}
                                                        {decisionType === "SETUJUI"
                                                            ? "Setujui"
                                                            : decisionType === "PERLU_PERBAIKAN"
                                                            ? "Minta Perbaikan"
                                                            : "Tolak"}
                                                    </span>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                </>
                            ) : null}
                        </div>
                    </div>
                </div>
            )}

            {/* DIALOG KONFIRMASI KEPUTUSAN */}
            <ConfirmationSummaryDialog
                isOpen={showConfirmDialog}
                onClose={() => setShowConfirmDialog(false)}
                onConfirm={handleSubmitDecision}
                loading={isSubmittingDecision}
                title={`Konfirmasi Keputusan: ${
                    decisionType === "SETUJUI"
                        ? "Persetujuan Penerbit"
                        : decisionType === "PERLU_PERBAIKAN"
                        ? "Permintaan Perbaikan Berkas"
                        : "Penolakan Pendaftaran"
                }`}
                description="Pastikan data dan dokumen telah diperiksa secara seksama sebelum mengonfirmasi putusan resmi sistem."
                objectName={`${detailData?.nama_penerbit} (${detailData?.kode_pendaftaran})`}
                statusChange={`${detailData?.status} → ${
                    decisionType === "SETUJUI"
                        ? "DISETUJUI"
                        : decisionType === "PERLU_PERBAIKAN"
                        ? "PERLU_PERBAIKAN"
                        : "DITOLAK"
                }`}
                impactMessage={
                    decisionType === "SETUJUI"
                        ? "Akun penerbit akan segera aktif dan dapat login untuk mengajukan permohonan pentashihan mushaf."
                        : decisionType === "PERLU_PERBAIKAN"
                        ? "Email berisi alasan perbaikan dan tautan formulir sekali pakai (14 hari) akan otomatis dikirimkan ke email penerbit."
                        : "Permohonan akan ditolak permanen, namun identitas hukum (NPWP/NIB) akan dibebaskan sehingga penerbit dapat mendaftar baru."
                }
                confirmLabel={`Ya, ${
                    decisionType === "SETUJUI"
                        ? "Setujui Akun"
                        : decisionType === "PERLU_PERBAIKAN"
                        ? "Kirim Permintaan Perbaikan"
                        : "Tolak Pendaftaran"
                }`}
                confirmVariant={decisionType === "TOLAK" ? "destructive" : "primary"}
            />
        </div>
    );
};

export default PublisherVerificationPage;
