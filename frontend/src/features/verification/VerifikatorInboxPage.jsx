import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import { verificationApi } from "@/api/verification.api";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import {
    ClipboardCheck,
    Search,
    RefreshCw,
    AlertCircle,
    Clock,
    FileText,
    Building2,
    PackageCheck,
    ArrowRight,
    Play,
    CheckCircle2,
    AlertTriangle,
    Calendar,
    Layers,
    Sparkles,
    ShieldCheck,
    Check,
} from "lucide-react";

export const VerifikatorInboxPage = () => {
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const userRoles =
        currentUser?.roles || (currentUser?.role ? [currentUser.role] : []);
    const isHead =
        userRoles.includes("KEPALA_LPMQ") ||
        currentUser?.role === "KEPALA_LPMQ";
    const isAdmin =
        userRoles.includes("SUPERADMIN") ||
        userRoles.includes("ADMIN") ||
        currentUser?.role === "SUPERADMIN";

    const [assignments, setAssignments] = useState([]);
    const [pagination, setPagination] = useState({
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 1,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState(
        isHead ? "WAITING_APPROVAL" : "ALL",
    ); // 'ALL' | 'WAITING_APPROVAL' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED'
    const [searchQuery, setSearchQuery] = useState("");
    const [startingId, setStartingId] = useState(null);

    const fetchAssignments = async () => {
        setLoading(true);
        setError(null);
        try {
            const params = {
                page: pagination.page,
                limit: pagination.limit,
            };
            if (activeTab === "WAITING_APPROVAL") {
                params.registration_status = "WAITING_VERIFICATION_APPROVAL";
            } else if (activeTab !== "ALL") {
                params.status = activeTab;
            }
            if (searchQuery.trim()) {
                params.search = searchQuery.trim();
            }

            const res = await verificationApi.listAssignments(params);
            if (res?.data) {
                setAssignments(res.data.items || []);
                if (res.data.pagination) {
                    setPagination(res.data.pagination);
                }
            }
        } catch (err) {
            setError(
                err.message || "Gagal memuat daftar penugasan verifikasi.",
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAssignments();
    }, [activeTab, pagination.page]);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        setPagination((prev) => ({ ...prev, page: 1 }));
        fetchAssignments();
    };

    const handleStartVerification = async (assignmentId) => {
        setStartingId(assignmentId);
        try {
            await verificationApi.startVerification(assignmentId);
            navigate(`/internal/verifications/${assignmentId}`);
        } catch (err) {
            alert(err.message || "Gagal memulai pemeriksaan.");
            setStartingId(null);
        }
    };

    // Helper SLA status dengan persentase sisa waktu (target 48 jam)
    const getSlaInfo = (item) => {
        if (!item.due_at) return null;
        const now = new Date();
        const due = new Date(item.due_at);
        const diffMs = due.getTime() - now.getTime();
        const isOverdue = diffMs < 0 && item.status !== "COMPLETED";

        const totalTargetMs = 48 * 60 * 60 * 1000;
        const remainingPercent = Math.max(
            0,
            Math.min(100, Math.round((diffMs / totalTargetMs) * 100)),
        );

        if (isOverdue) {
            const hoursOverdue = Math.abs(
                Math.floor(diffMs / (1000 * 60 * 60)),
            );
            return {
                isOverdue: true,
                text: `Terlambat ${hoursOverdue} jam (SLA 2 Hari Lewat)`,
                badgeClass:
                    "bg-rose-50 text-rose-800 border-rose-200 font-bold",
                barClass: "bg-rose-600",
                percent: 100,
            };
        }

        const hoursRemaining = Math.max(
            0,
            Math.floor(diffMs / (1000 * 60 * 60)),
        );
        const daysRemaining = Math.floor(hoursRemaining / 24);
        const remainingText =
            daysRemaining > 0
                ? `Sisa ${daysRemaining} hari ${hoursRemaining % 24} jam`
                : `Sisa ${hoursRemaining} jam`;

        return {
            isOverdue: false,
            text: remainingText,
            badgeClass:
                hoursRemaining < 12
                    ? "bg-amber-50 text-amber-800 border-amber-300 font-bold"
                    : "bg-emerald-50 text-emerald-800 border-emerald-300 font-bold",
            barClass: hoursRemaining < 12 ? "bg-amber-500" : "bg-emerald-600",
            percent: remainingPercent,
        };
    };

    // Format tanggal Indonesia
    const formatDate = (dateString) => {
        if (!dateString) return "-";
        return new Date(dateString).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-16">
            {/* Header Banner with Institutional Accents */}
            <div className="relative overflow-hidden bg-gradient-to-r from-[#083224] via-[#0B3F2D] to-[#0E5139] text-white rounded-2xl p-6 sm:p-8 shadow-md border border-emerald-800/60">
                <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#DFB045_1px,transparent_1px)] [background-size:18px_18px]" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                    <div className="space-y-2">
                        {/* <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-bold tracking-wide text-gold-300 uppercase shadow-2xs">
                            <ClipboardCheck className="w-3.5 h-3.5 text-gold-400" />
                            SOP Verifikasi — Epic D
                        </div> */}
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white font-sans">
                            {isHead
                                ? "Persetujuan Hasil Verifikasi & Penugasan"
                                : "Antrean Penugasan Verifikasi Berkas"}
                        </h1>
                        <p className="text-xs sm:text-sm text-emerald-100/90 max-w-2xl leading-relaxed">
                            {isHead
                                ? "Daftar pengajuan naskah mushaf untuk penerbitan Nota Dinas penugasan dan persetujuan draf surat hasil telaah (Langkah 4 SOP)."
                                : "Daftar naskah mushaf yang ditugaskan oleh Kepala LPMQ melalui Nota Dinas resmi. Pemeriksaan mencakup validasi data pendaftaran, kelengkapan berkas digital, dan master fisik A4."}
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            onClick={fetchAssignments}
                            disabled={loading}
                            className="bg-white/10 hover:bg-white/20 text-white border-white/25 backdrop-blur-2xs text-xs font-semibold shadow-xs px-20px"
                        >
                            <RefreshCw
                                className={`w-3.5 h-3.5 mr-2 ${loading ? "animate-spin" : ""}`}
                            />
                            Segarkan Data
                        </Button>
                    </div>
                </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 p-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Status Tabs */}
                    <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100/90 rounded-xl text-xs font-semibold border border-slate-200/60">
                        {(isHead || isAdmin) && (
                            <button
                                onClick={() => {
                                    setActiveTab("WAITING_APPROVAL");
                                    setPagination((p) => ({ ...p, page: 1 }));
                                }}
                                className={`px-3.5 py-1.5 rounded-lg transition-all inline-flex items-center gap-1.5 ${
                                    activeTab === "WAITING_APPROVAL"
                                        ? "bg-amber-600 text-white shadow-2xs font-bold"
                                        : "text-amber-800 hover:text-amber-950 font-semibold"
                                }`}
                            >
                                <ShieldCheck className="w-3.5 h-3.5" />
                                Menunggu Approval Kepala
                            </button>
                        )}
                        <button
                            onClick={() => {
                                setActiveTab("ALL");
                                setPagination((p) => ({ ...p, page: 1 }));
                            }}
                            className={`px-3.5 py-1.5 rounded-lg transition-all ${
                                activeTab === "ALL"
                                    ? "bg-white text-slate-900 shadow-2xs font-bold"
                                    : "text-slate-600 hover:text-slate-900"
                            }`}
                        >
                            Semua Tugas
                        </button>
                        <button
                            onClick={() => {
                                setActiveTab("ASSIGNED");
                                setPagination((p) => ({ ...p, page: 1 }));
                            }}
                            className={`px-3.5 py-1.5 rounded-lg transition-all inline-flex items-center gap-1.5 ${
                                activeTab === "ASSIGNED"
                                    ? "bg-white text-cyan-900 shadow-2xs font-bold"
                                    : "text-slate-600 hover:text-slate-900"
                            }`}
                        >
                            <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
                            Menunggu Mulai
                        </button>
                        <button
                            onClick={() => {
                                setActiveTab("IN_PROGRESS");
                                setPagination((p) => ({ ...p, page: 1 }));
                            }}
                            className={`px-3.5 py-1.5 rounded-lg transition-all inline-flex items-center gap-1.5 ${
                                activeTab === "IN_PROGRESS"
                                    ? "bg-white text-sky-900 shadow-2xs font-bold"
                                    : "text-slate-600 hover:text-slate-900"
                            }`}
                        >
                            <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
                            Sedang Diperiksa
                        </button>
                        <button
                            onClick={() => {
                                setActiveTab("COMPLETED");
                                setPagination((p) => ({ ...p, page: 1 }));
                            }}
                            className={`px-3.5 py-1.5 rounded-lg transition-all inline-flex items-center gap-1.5 ${
                                activeTab === "COMPLETED"
                                    ? "bg-white text-emerald-900 shadow-2xs font-bold"
                                    : "text-slate-600 hover:text-slate-900"
                            }`}
                        >
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            Selesai / Diajukan
                        </button>
                    </div>

                    {/* Search Form */}
                    <form
                        onSubmit={handleSearchSubmit}
                        className="flex items-center gap-2 max-w-md w-full"
                    >
                        <div className="relative flex-1">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Cari no. registrasi, judul, atau penerbit..."
                                className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white transition-all"
                            />
                        </div>
                        <Button
                            type="submit"
                            variant="secondary"
                            size="sm"
                            className="text-xs"
                        >
                            Cari
                        </Button>
                    </form>
                </div>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-800 text-sm shadow-xs">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600 mt-0.5" />
                    <div className="flex-1">
                        <p className="font-bold">Terjadi Kendala</p>
                        <p className="text-rose-700 text-xs mt-0.5">{error}</p>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchAssignments}
                        className="text-xs"
                    >
                        Coba Lagi
                    </Button>
                </div>
            )}

            {/* Loading State */}
            {loading && assignments.length === 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
                    <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
                    <p className="text-sm font-semibold text-slate-700">
                        Memuat antrean tugas verifikasi...
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                        Mengambil data penugasan resmi dari server LPMQ
                    </p>
                </div>
            )}

            {/* Empty State */}
            {!loading && assignments.length === 0 && (
                <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center max-w-lg mx-auto shadow-xs">
                    <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto mb-4 border border-emerald-200">
                        <ClipboardCheck className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-bold text-slate-800">
                        Tidak Ada Penugasan Ditemukan
                    </h3>
                    <p className="text-xs text-slate-500 mt-1.5 max-w-sm mx-auto leading-relaxed">
                        {activeTab !== "ALL"
                            ? `Belum ada penugasan dengan filter status "${activeTab}". Silakan pilih filter lain.`
                            : "Belum ada naskah yang ditugaskan kepada Anda oleh Kepala LPMQ. Tugas baru akan muncul otomatis ketika Nota Dinas diterbitkan."}
                    </p>
                    {activeTab !== "ALL" && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setActiveTab("ALL")}
                            className="mt-4 text-xs"
                        >
                            Tampilkan Semua Tugas
                        </Button>
                    )}
                </div>
            )}

            {/* Assignment Cards List */}
            <div className="space-y-4">
                {assignments.map((item) => {
                    const reg = item.registration || {};
                    const notaDinas = item.documents?.[0];
                    const sla = getSlaInfo(item);
                    const physicalMaster = reg.physical_master_intake || {};

                    return (
                        <div
                            key={item.id}
                            className="bg-white rounded-2xl border border-slate-200/90 hover:border-emerald-300 hover:shadow-md transition-all duration-200 overflow-hidden shadow-2xs"
                        >
                            <div className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                                {/* Left Meta & Main Info */}
                                <div className="space-y-3 flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200/80 shadow-2xs">
                                            {reg.registration_no ||
                                                "REG-BELUM-TERBIT"}
                                        </span>
                                        <StatusBadge status={reg.status} />
                                        {item.status === "ASSIGNED" && (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-50 text-cyan-800 border border-cyan-200">
                                                <Clock className="w-3 h-3 text-cyan-600" />
                                                Tugas Baru
                                            </span>
                                        )}
                                        {item.status === "IN_PROGRESS" && (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-50 text-sky-800 border border-sky-200">
                                                <Play className="w-3 h-3 text-sky-600" />
                                                Sedang Diperiksa
                                            </span>
                                        )}
                                        {item.status === "COMPLETED" && (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                                Pemeriksaan Selesai
                                            </span>
                                        )}
                                    </div>

                                    <div>
                                        <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug truncate">
                                            {reg.title ||
                                                "Judul Naskah Tanpa Nama"}
                                        </h3>
                                        <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500 mt-1">
                                            <span className="inline-flex items-center gap-1 text-slate-700 font-semibold">
                                                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                                {reg.publisher?.legal_name ||
                                                    "Penerbit Tidak Terdata"}
                                            </span>
                                            {notaDinas && (
                                                <span className="inline-flex items-center gap-1 text-slate-600">
                                                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                                                    Nota Dinas:{" "}
                                                    <span className="font-mono font-semibold text-emerald-900">
                                                        {notaDinas.document_no}
                                                    </span>
                                                </span>
                                            )}
                                            <span className="inline-flex items-center gap-1 text-slate-500">
                                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                                Ditugaskan:{" "}
                                                {formatDate(item.assigned_at)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Context Badges: Master Fisik & SLA Progress */}
                                    <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
                                        {/* Master Fisik Badge */}
                                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-gold-50/70 via-white to-amber-50/40 border border-gold-300/80 text-slate-700 shadow-2xs">
                                            <PackageCheck className="w-3.5 h-3.5 text-gold-600" />
                                            <span className="text-slate-600 font-medium">
                                                Master Fisik:
                                            </span>
                                            <strong className="font-bold text-slate-900">
                                                {physicalMaster.status ===
                                                "RECEIVED"
                                                    ? `Diterima (${physicalMaster.receipt_no || "Tanda Terima LPMQ"})`
                                                    : physicalMaster.status ===
                                                        "RETURNED"
                                                      ? "Dikembalikan ke Penerbit"
                                                      : "Belum Diterima / Menunggu"}
                                            </strong>
                                        </div>

                                        {/* SLA Badge */}
                                        {sla && (
                                            <div
                                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs shadow-2xs ${sla.badgeClass}`}
                                                title={`Tenggat: ${formatDate(item.due_at)}`}
                                            >
                                                {sla.isOverdue ? (
                                                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
                                                ) : (
                                                    <Clock className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                                                )}
                                                <span>SLA 2 Hari:</span>
                                                <span>{sla.text}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Right Action Buttons */}
                                <div className="flex sm:flex-col items-stretch justify-center gap-2 pt-2 lg:pt-0 lg:border-l lg:border-slate-100 lg:pl-6 min-w-[170px]">
                                    {reg.status ===
                                    "WAITING_VERIFICATION_APPROVAL" ? (
                                        <Button
                                            variant="gold"
                                            onClick={() =>
                                                navigate(
                                                    `/internal/verifications/${item.id}`,
                                                )
                                            }
                                            className="text-xs px-4 py-2 font-bold inline-flex items-center justify-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
                                        >
                                            <ShieldCheck className="w-3.5 h-3.5" />
                                            {isHead
                                                ? "Tinjau & Setujui Draf"
                                                : "Menunggu Approval Kepala"}
                                        </Button>
                                    ) : item.status === "ASSIGNED" ? (
                                        <Button
                                            variant="gold"
                                            onClick={() =>
                                                isHead
                                                    ? navigate(
                                                          `/internal/verifications/${item.id}`,
                                                      )
                                                    : handleStartVerification(
                                                          item.id,
                                                      )
                                            }
                                            disabled={startingId === item.id}
                                            className="text-xs px-4 py-2 font-bold inline-flex items-center justify-center gap-1.5"
                                        >
                                            <Play className="w-3.5 h-3.5 fill-current" />
                                            {isHead
                                                ? "Lihat Detail Penugasan"
                                                : startingId === item.id
                                                  ? "Memulai..."
                                                  : "Mulai Pemeriksaan"}
                                        </Button>
                                    ) : item.status === "IN_PROGRESS" ? (
                                        <Button
                                            variant="primary"
                                            onClick={() =>
                                                navigate(
                                                    `/internal/verifications/${item.id}`,
                                                )
                                            }
                                            className="text-xs px-4 py-2 font-bold inline-flex items-center justify-center gap-1.5"
                                        >
                                            <ClipboardCheck className="w-3.5 h-3.5" />
                                            {isHead
                                                ? "Pantau Progres Pemeriksaan"
                                                : "Lanjutkan Pemeriksaan"}
                                        </Button>
                                    ) : (
                                        <Button
                                            variant="outline"
                                            onClick={() =>
                                                navigate(
                                                    `/internal/verifications/${item.id}`,
                                                )
                                            }
                                            className="text-xs px-4 py-2 font-semibold inline-flex items-center justify-center gap-1.5"
                                        >
                                            <FileText className="w-3.5 h-3.5" />
                                            Lihat Rekap Pemeriksaan
                                        </Button>
                                    )}

                                    <Link
                                        to={`/internal/verifications/${item.id}`}
                                        className="text-center text-xs font-semibold text-slate-500 hover:text-emerald-700 py-1 transition-colors"
                                    >
                                        Buka Detail Naskah &rarr;
                                    </Link>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between bg-white px-5 py-3.5 border border-slate-200/90 rounded-2xl text-xs shadow-xs">
                    <p className="text-slate-600">
                        Menampilkan halaman{" "}
                        <span className="font-bold text-slate-900">
                            {pagination.page}
                        </span>{" "}
                        dari{" "}
                        <span className="font-bold text-slate-900">
                            {pagination.totalPages}
                        </span>{" "}
                        (Total{" "}
                        <span className="font-bold text-slate-900">
                            {pagination.total}
                        </span>{" "}
                        penugasan)
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={pagination.page <= 1}
                            onClick={() =>
                                setPagination((p) => ({
                                    ...p,
                                    page: p.page - 1,
                                }))
                            }
                            className="text-xs font-semibold"
                        >
                            Sebelumnya
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={pagination.page >= pagination.totalPages}
                            onClick={() =>
                                setPagination((p) => ({
                                    ...p,
                                    page: p.page + 1,
                                }))
                            }
                            className="text-xs font-semibold"
                        >
                            Selanjutnya
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VerifikatorInboxPage;
