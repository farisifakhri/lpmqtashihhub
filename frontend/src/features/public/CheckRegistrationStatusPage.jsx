import React, { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import {
    Search,
    ShieldCheck,
    Clock,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    ArrowLeft,
    RefreshCw,
    ExternalLink,
    HelpCircle,
    FileCheck,
    Download,
    KeyRound,
    ArrowRight,
    Mail,
} from "lucide-react";
import kemenagLogo from "@/assets/kemenag1.png";
import lpmqLogo from "@/assets/logo-lpmq1.png";
import Switcher from "../darkmode/Switcher";
import { publisherRegistrationApi } from "@/api/publisher-registration.api";

export const CheckRegistrationStatusPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const urlKode = searchParams.get("kode") || "";

    const [kodePendaftaran, setKodePendaftaran] = useState(urlKode);
    const [isLoading, setIsLoading] = useState(false);
    const [statusResult, setStatusResult] = useState(null);
    const [error, setError] = useState("");

    // Quick token input for revision form
    const [inputToken, setInputToken] = useState("");
    const [isDownloadingCert, setIsDownloadingCert] = useState(false);

    const performSearch = useCallback(async (codeToSearch) => {
        const cleanInput = (codeToSearch || "").trim();

        if (!cleanInput) {
            setError("Harap masukkan kode pendaftaran atau alamat email Anda.");
            return;
        }

        setError("");
        setIsLoading(true);
        setStatusResult(null);

        try {
            const res = await publisherRegistrationApi.checkStatus(cleanInput);
            if (res?.success && res?.data) {
                setStatusResult(res.data);
            } else {
                throw new Error(res?.message || "Data status pendaftaran tidak ditemukan.");
            }
        } catch (err) {
            const code = err.data?.code || err.code;
            if (code === "REGISTRATION_NOT_FOUND" || err.status === 404) {
                setError(
                    "Data pendaftaran tidak ditemukan. Pastikan Anda memasukkan kode pendaftaran resmi atau alamat email yang didaftarkan."
                );
            } else if (code === "RATE_LIMITED" || err.status === 429) {
                setError(
                    "Terlalu banyak permintaan pemeriksaan status dari jaringan Anda. Mohon tunggu beberapa menit sebelum mencoba lagi."
                );
            } else {
                setError(
                    err.message ||
                        "Tidak dapat memeriksa status pendaftaran saat ini. Silakan coba beberapa saat lagi."
                );
            }
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Auto-search jika parameter kode ada di URL
    useEffect(() => {
        if (urlKode) {
            setKodePendaftaran(urlKode.includes('@') ? urlKode.trim() : urlKode.toUpperCase());
            performSearch(urlKode);
        }
    }, [urlKode, performSearch]);

    const handleSearch = (e) => {
        e.preventDefault();
        performSearch(kodePendaftaran);
    };

    const handleGoToRevision = (e) => {
        e.preventDefault();
        const cleanToken = inputToken.trim();
        if (cleanToken) {
            navigate(`/pendaftaran-penerbit/perbaikan?token=${encodeURIComponent(cleanToken)}`);
        } else {
            navigate('/pendaftaran-penerbit/perbaikan');
        }
    };

    const handleDownloadCertificate = async () => {
        if (!statusResult?.kode_pendaftaran) return;
        setIsDownloadingCert(true);
        try {
            await publisherRegistrationApi.downloadPublicCertificate(
                statusResult.kode_pendaftaran,
                `Sertifikat-Penerbit-${statusResult.kode_pendaftaran}.pdf`
            );
        } catch (err) {
            alert(err.message || "Gagal mengunduh sertifikat penerbit. Silakan hubungi Sekretariat LPMQ.");
        } finally {
            setIsDownloadingCert(false);
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return "-";
        try {
            return new Date(dateStr).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            });
        } catch {
            return dateStr;
        }
    };

    return (
        <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-3 sm:p-6 animate-page-in">
            {/* Header Kembali & Tema */}
            <div className="w-full max-w-2xl mb-3 flex items-center justify-between">
                <Link
                    to="/"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-ink-muted hover:text-ink bg-surface border border-line shadow-2xs hover:border-brand-600/30 hover:bg-surface-subtle transition-all"
                >
                    <ArrowLeft className="w-3.5 h-3.5 text-brand-fg" />
                    <span>Halaman Utama</span>
                </Link>
                <div className="flex items-center gap-3">
                    <Switcher />
                    <Link
                        to="/login"
                        className="text-xs font-semibold text-brand-fg hover:text-brand-fill-hover hover:underline"
                    >
                        Masuk ke Akun
                    </Link>
                </div>
            </div>

            {/* Kontainer Utama */}
            <div className="w-full max-w-2xl bg-surface rounded-2xl shadow-xs border border-line p-5 sm:p-8 space-y-6">
                {/* Logo & Judul */}
                <div className="text-center space-y-2">
                    <div className="inline-flex items-center gap-3 py-1 mb-1">
                        <img
                            src={kemenagLogo}
                            alt="Kementerian Agama RI"
                            className="h-10 w-auto object-contain"
                        />
                        <div className="h-7 w-[1px] bg-line" />
                        <img
                            src={lpmqLogo}
                            alt="LPMQ"
                            className="h-9 w-auto object-contain rounded"
                        />
                    </div>
                    <h1 className="text-2xl font-extrabold text-ink tracking-tight">
                        Cek Status Pendaftaran Penerbit
                    </h1>
                    <p className="text-xs text-ink-muted max-w-md mx-auto leading-relaxed">
                        Pantau proses verifikasi permohonan pendaftaran akun penerbit mushaf Al-Qur'an secara mandiri menggunakan kode pendaftaran resmi atau email yang didaftarkan.
                    </p>
                </div>

                {/* Form Input Kode / Email */}
                <form onSubmit={handleSearch} className="space-y-3">
                    <div>
                        <label
                            htmlFor="kode-pendaftaran-input"
                            className="block text-xs font-bold text-ink uppercase tracking-wider mb-1.5"
                        >
                            Kode Pendaftaran atau Email Terdaftar
                        </label>
                        <div className="relative flex items-center">
                            <input
                                id="kode-pendaftaran-input"
                                type="text"
                                value={kodePendaftaran}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setKodePendaftaran(val.includes('@') ? val.trim() : val.toUpperCase());
                                }}
                                placeholder="Contoh: REG-PUB-7K9M2X4F atau email@penerbit.com"
                                maxLength={100}
                                className="w-full pl-4 pr-11 py-3 text-sm font-mono tracking-wider bg-canvas focus:bg-surface border border-line-strong rounded-xl outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-fg transition-all text-ink placeholder:text-ink-muted placeholder:font-sans"
                                required
                            />
                            <Search className="w-4 h-4 text-ink-muted absolute right-4 pointer-events-none" />
                        </div>
                        <p className="text-[11px] text-ink-muted mt-1">
                            Masukkan kode pendaftaran resmi (diawali REG-PUB-) atau alamat email aktif yang digunakan saat pendaftaran.
                        </p>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-2.5 px-5 rounded-xl text-white font-bold text-xs sm:text-sm bg-brand-fill hover:bg-brand-fill-hover active:scale-[0.99] transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
                    >
                        {isLoading ? (
                            <span className="inline-flex items-center gap-2">
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                Memeriksa Pangkalan Data...
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-2">
                                <Search className="w-4 h-4" />
                                Periksa Status Pendaftaran
                            </span>
                        )}
                    </button>
                </form>

                {/* Alert Error */}
                {error && (
                    <div
                        role="alert"
                        className="p-4 rounded-xl bg-civic-dangerSoft border border-civic-dangerLine text-civic-danger text-xs flex items-start gap-2.5 animate-fadeIn"
                    >
                        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{error}</span>
                    </div>
                )}

                {/* HASIL PEMERIKSAAN STATUS */}
                {statusResult && (
                    <div
                        data-testid="status-result-card"
                        className="p-5 rounded-2xl border bg-surface-subtle/50 space-y-4 animate-fadeIn"
                    >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-line">
                            <div>
                                <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                                    Kode Pendaftaran
                                </span>
                                <p className="font-mono text-base font-extrabold text-ink">
                                    {statusResult.kode_pendaftaran || '-'}
                                </p>
                            </div>
                            <div className="text-left sm:text-right">
                                <span className="text-[11px] text-ink-muted block">
                                    Diajukan pada
                                </span>
                                <span className="text-xs font-semibold text-ink">
                                    {formatDate(statusResult.tanggal_pengajuan)}
                                </span>
                            </div>
                        </div>

                        {/* Banner Pencarian Email */}
                        {statusResult.is_email_search && (
                            <div className="p-3.5 rounded-xl bg-brand-50 border border-brand-200 text-ink text-xs flex items-start gap-2.5">
                                <Mail className="w-4 h-4 text-brand-fg shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                    <p className="font-semibold text-brand-900">
                                        Pencarian Berdasarkan Email: {statusResult.masked_email}
                                    </p>
                                    <p className="text-ink-muted leading-relaxed">
                                        {statusResult.message}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* STATUS: DIAJUKAN (Menunggu Verifikasi) */}
                        {statusResult.status === "DIAJUKAN" && (
                            <div className="p-4 rounded-xl bg-brand-50 border border-brand-100 text-ink space-y-2">
                                <div className="flex items-center gap-2 text-brand-800 font-bold text-sm">
                                    <Clock className="w-4 h-4" />
                                    <span>Menunggu Verifikasi Petugas</span>
                                </div>
                                <p className="text-xs text-ink-muted leading-relaxed">
                                    Berkas dan dokumen persyaratan Anda telah diterima secara lengkap dan saat ini berada dalam antrean peninjauan oleh petugas verifikator / sekretariat LPMQ.
                                </p>
                                <p className="text-[11px] text-brand-900/80 pt-1 border-t border-brand-100">
                                    Harap periksa email Anda secara berkala untuk menerima pembaruan status verifikasi.
                                </p>
                            </div>
                        )}

                        {/* STATUS: PERLU_PERBAIKAN */}
                        {statusResult.status === "PERLU_PERBAIKAN" && (
                            <div className="p-4 sm:p-5 rounded-xl bg-civic-warningSoft border border-civic-warningLine text-ink space-y-4">
                                <div className="flex items-center gap-2 text-civic-warning font-bold text-sm">
                                    <AlertTriangle className="w-4 h-4" />
                                    <span>Memerlukan Perbaikan Dokumen</span>
                                </div>
                                <div className="p-3.5 rounded-lg bg-surface border border-line text-xs space-y-1">
                                    <p className="font-semibold text-ink">
                                        Catatan Kekurangan dari Petugas:
                                    </p>
                                    <p className="text-ink-muted italic leading-relaxed">
                                        "{statusResult.alasan || "Silakan periksa dokumen persyaratan Anda."}"
                                    </p>
                                </div>
                                <p className="text-xs text-ink-muted leading-relaxed">
                                    {statusResult.instruksi ||
                                        "Tautan perbaikan sekali pakai telah dikirimkan ke alamat email terdaftar Anda. Anda dapat memperbarui dokumen yang belum sesuai dalam kurun waktu 14 hari kalender."}
                                </p>

                                {/* Aksi Alur Perbaikan Dokumen */}
                                <div className="pt-2 border-t border-civic-warningLine/60 space-y-3">
                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                                        <Link
                                            to={`/pendaftaran-penerbit/perbaikan?token=${encodeURIComponent(statusResult.kode_pendaftaran)}`}
                                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-fill hover:bg-brand-fill-hover transition-colors shadow-2xs cursor-pointer"
                                        >
                                            <FileCheck className="w-4 h-4" />
                                            <span>Perbaiki Dokumen Sekarang (Gunakan Kode Pendaftaran)</span>
                                        </Link>
                                    </div>

                                    {/* Input Token Cepat */}
                                    <form onSubmit={handleGoToRevision} className="p-3 rounded-xl bg-surface border border-line space-y-2">
                                        <label htmlFor="quick-token-input" className="block text-[11px] font-bold text-ink flex items-center gap-1.5">
                                            <KeyRound className="w-3.5 h-3.5 text-brand-fg" />
                                            <span>Atau Masukkan Token Perbaikan / Kode Pendaftaran:</span>
                                        </label>
                                        <div className="flex flex-col sm:flex-row gap-2">
                                            <input
                                                id="quick-token-input"
                                                type="text"
                                                value={inputToken}
                                                onChange={(e) => setInputToken(e.target.value.trim())}
                                                placeholder="Contoh: REG-PUB-XXXXXX atau token perbaikan..."
                                                className="flex-1 px-3 py-2 text-xs font-mono bg-canvas focus:bg-surface border border-line-strong rounded-lg outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-fg transition-all text-ink placeholder:text-ink-muted placeholder:font-sans"
                                            />
                                            <button
                                                type="submit"
                                                className="px-3.5 py-2 rounded-lg text-xs font-bold text-ink bg-surface border border-line hover:bg-surface-subtle hover:text-brand-fg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                                            >
                                                <span>Lanjutkan</span>
                                                <ArrowRight className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}

                        {/* STATUS: DISETUJUI */}
                        {statusResult.status === "DISETUJUI" && (
                            <div className="p-4 sm:p-5 rounded-xl bg-brand-50 border border-brand-100 text-ink space-y-3.5">
                                <div className="flex items-center gap-2 text-brand-800 font-bold text-sm">
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span>Pendaftaran Telah Disetujui</span>
                                </div>
                                <p className="text-xs text-ink-muted leading-relaxed">
                                    Selamat! Pendaftaran akun penerbit Anda telah disetujui secara resmi oleh LPMQ Kementerian Agama RI. Akun Anda kini aktif dan dapat digunakan untuk masuk ke portal pentashihan mushaf Al-Qur'an.
                                </p>
                                <div className="pt-1 flex flex-col sm:flex-row gap-2.5">
                                    <button
                                        type="button"
                                        disabled={isDownloadingCert}
                                        onClick={handleDownloadCertificate}
                                        className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-brand-800 bg-surface border border-brand-200 hover:bg-surface-subtle transition-colors shadow-2xs cursor-pointer disabled:opacity-60"
                                    >
                                        {isDownloadingCert ? (
                                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                            <Download className="w-3.5 h-3.5 text-brand-fg" />
                                        )}
                                        <span>{isDownloadingCert ? "Mengunduh..." : "Unduh Sertifikat Penerbit Resmi (PDF)"}</span>
                                    </button>
                                    <Link
                                        to="/login"
                                        className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-brand-fill hover:bg-brand-fill-hover transition-colors shadow-2xs"
                                    >
                                        <span>Masuk ke Portal Pentashihan</span>
                                        <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
                                    </Link>
                                </div>
                            </div>
                        )}

                        {/* STATUS: DITOLAK */}
                        {statusResult.status === "DITOLAK" && (
                            <div className="p-4 rounded-xl bg-civic-dangerSoft border border-civic-dangerLine text-ink space-y-3">
                                <div className="flex items-center gap-2 text-civic-danger font-bold text-sm">
                                    <XCircle className="w-4 h-4" />
                                    <span>Pendaftaran Ditolak</span>
                                </div>
                                {statusResult.alasan && (
                                    <div className="p-3 rounded-lg bg-surface border border-line text-xs space-y-1">
                                        <p className="font-semibold text-ink">Alasan Penolakan:</p>
                                        <p className="text-civic-danger italic">
                                            "{statusResult.alasan}"
                                        </p>
                                    </div>
                                )}
                                <p className="text-xs text-ink-muted leading-relaxed">
                                    Keputusan penolakan ini bersifat final. Namun, identitas badan hukum (NPWP dan NIB) serta email Anda telah dibebaskan oleh sistem, sehingga instansi Anda dipersilakan mengajukan permohonan pendaftaran baru dengan berkas persyaratan yang lengkap dan sesuai regulasi.
                                </p>
                                <div className="pt-1">
                                    <Link
                                        to="/register"
                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-ink bg-surface border border-line hover:bg-surface-subtle transition-colors shadow-2xs"
                                    >
                                        <span>Ajukan Pendaftaran Baru</span>
                                        <ExternalLink className="w-3.5 h-3.5" />
                                    </Link>
                                </div>
                            </div>
                        )}

                        {/* STATUS FALLBACK LAINNYA (MENCEGAH KARTU KOSONG) */}
                        {!["DIAJUKAN", "PERLU_PERBAIKAN", "DISETUJUI", "DITOLAK"].includes(statusResult.status) && statusResult.status && (
                            <div className="p-4 rounded-xl bg-surface border border-line text-ink space-y-2">
                                <div className="flex items-center gap-2 text-brand-fg font-bold text-sm">
                                    <Clock className="w-4 h-4" />
                                    <span>{statusResult.status_label || statusResult.status}</span>
                                </div>
                                <p className="text-xs text-ink-muted leading-relaxed">
                                    Permohonan pendaftaran Anda saat ini berstatus <strong>{statusResult.status_label || statusResult.status}</strong> dan sedang dalam proses penanganan oleh sekretariat LPMQ.
                                </p>
                            </div>
                        )}

                        {/* TIMELINE ALUR & PROGRES PENDAFTARAN */}
                        {Array.isArray(statusResult.timeline) && statusResult.timeline.length > 0 && (
                            <div className="pt-4 border-t border-line space-y-3">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-ink">
                                    Alur & Progres Pendaftaran
                                </h4>
                                <div className="space-y-3">
                                    {statusResult.timeline.map((item, idx) => (
                                        <div key={idx} className="flex items-start gap-3 text-xs">
                                            <div className="mt-0.5 shrink-0">
                                                {item.status === 'COMPLETED' ? (
                                                    <CheckCircle2 className="w-4 h-4 text-civic-success" />
                                                ) : item.status === 'IN_PROGRESS' ? (
                                                    <Clock className="w-4 h-4 text-brand-fg animate-pulse" />
                                                ) : item.status === 'WARNING' ? (
                                                    <AlertTriangle className="w-4 h-4 text-civic-warning" />
                                                ) : item.status === 'FAILED' ? (
                                                    <XCircle className="w-4 h-4 text-civic-danger" />
                                                ) : (
                                                    <div className="w-3.5 h-3.5 rounded-full border-2 border-line-strong ml-0.5 mt-0.5" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className={`font-semibold ${item.status === 'COMPLETED' ? 'text-ink' : item.status === 'IN_PROGRESS' ? 'text-brand-fg font-bold' : item.status === 'WARNING' ? 'text-civic-warning font-bold' : item.status === 'FAILED' ? 'text-civic-danger font-bold' : 'text-ink-muted'}`}>
                                                        {item.title}
                                                    </span>
                                                    {item.timestamp && (
                                                        <span className="text-[10px] text-ink-muted font-mono">
                                                            {formatDate(item.timestamp)}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[11px] text-ink-muted leading-relaxed mt-0.5">
                                                    {item.description}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Bantuan Layanan Info */}
                <div className="pt-2 border-t border-line flex flex-col sm:flex-row items-center justify-between text-xs text-ink-muted gap-2">
                    <div className="flex items-center gap-1.5">
                        <HelpCircle className="w-3.5 h-3.5 text-brand-fg" />
                        <span>Mengalami kendala kode pendaftaran?</span>
                    </div>
                    <a
                        href="https://wa.me/628111997125"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-brand-fg hover:underline inline-flex items-center gap-1"
                    >
                        <span>Hubungi Loket LPMQ (WhatsApp)</span>
                    </a>
                </div>
            </div>

            {/* Footer Hak Cipta */}
            <div className="mt-6 text-center text-[11px] text-ink-muted">
                Lajnah Pentashihan Mushaf Al-Qur'an &copy; 2026 Kementerian Agama RI
            </div>
        </div>
    );
};

export default CheckRegistrationStatusPage;
