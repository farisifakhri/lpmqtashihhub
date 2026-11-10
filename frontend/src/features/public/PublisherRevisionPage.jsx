import React, { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import {
    AlertTriangle,
    CheckCircle2,
    FileText,
    UploadCloud,
    ArrowLeft,
    RefreshCw,
    ShieldCheck,
    FileCheck,
    Building2,
    XCircle,
    Info,
    KeyRound,
    ArrowRight,
} from "lucide-react";
import kemenagLogo from "@/assets/kemenag1.png";
import lpmqLogo from "@/assets/logo-lpmq1.png";
import Switcher from "../darkmode/Switcher";
import { publisherRegistrationApi } from "@/api/publisher-registration.api";

const DOC_LABEL_MAP = {
    SURAT_PENDAFTARAN: "Surat Permohonan Pendaftaran",
    AKTA_NOTARIS: "Akta Notaris & SK Kemenkumham",
    PROFIL: "Profil Instansi / Lembaga",
    NPWP: "Salinan NPWP Badan Hukum",
    NIB: "Nomor Induk Berusaha (NIB)",
    KTP_PENANGGUNG_JAWAB: "KTP Pimpinan / Penanggung Jawab",
};

const DOC_FIELD_MAP = {
    SURAT_PENDAFTARAN: "dokumen_surat_pendaftaran",
    AKTA_NOTARIS: "dokumen_akta_notaris",
    PROFIL: "dokumen_profil",
    NPWP: "dokumen_npwp",
    NIB: "dokumen_nib",
    KTP_PENANGGUNG_JAWAB: "dokumen_ktp",
};

const MAX_SIZE_DEFAULT = 500 * 1024;
const MAX_SIZE_AKTA = 2 * 1024 * 1024;

export const PublisherRevisionPage = () => {
    const params = useParams();
    const [searchParams] = useSearchParams();
    const initialToken = params.token || searchParams.get("token") || "";

    const [currentToken, setCurrentToken] = useState(initialToken);
    const [manualTokenInput, setManualTokenInput] = useState("");

    const [isLoading, setIsLoading] = useState(Boolean(initialToken));
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [revisionData, setRevisionData] = useState(null);
    const [loadError, setLoadError] = useState("");
    const [submitError, setSubmitError] = useState("");
    const [submitSuccess, setSubmitSuccess] = useState(false);

    // Form inputs state
    const [editableFields, setEditableFields] = useState({
        nama_penerbit: "",
        alamat_lengkap: "",
        nama_penanggung_jawab: "",
        telepon_penanggung_jawab: "",
    });

    const [replacementFiles, setReplacementFiles] = useState({});
    const [fileErrors, setFileErrors] = useState({});

    const fetchRevisionData = useCallback(async (tokenToFetch) => {
        if (!tokenToFetch) {
            setLoadError("Tautan perbaikan tidak memiliki token yang valid.");
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setLoadError("");
        try {
            const res = await publisherRegistrationApi.getRevision(tokenToFetch);
            if (res?.success && res?.data) {
                setRevisionData(res.data);
                setEditableFields({
                    nama_penerbit: res.data.nama_penerbit || "",
                    alamat_lengkap: res.data.alamat_lengkap || "",
                    nama_penanggung_jawab: res.data.nama_penanggung_jawab || "",
                    telepon_penanggung_jawab: res.data.telepon_penanggung_jawab || "",
                });
            } else {
                throw new Error(res?.message || "Data perbaikan gagal dimuat.");
            }
        } catch (err) {
            const code = err.data?.code || err.code;
            if (code === "TOKEN_INVALID_OR_EXPIRED" || err.status === 400 || err.status === 410) {
                setLoadError(
                    "Tautan perbaikan sudah tidak berlaku atau pernah digunakan. Hubungi Sekretariat LPMQ jika Anda memerlukan bantuan."
                );
            } else {
                setLoadError(
                    err.message ||
                        "Gagal memuat formulir perbaikan pendaftaran dari server. Silakan muat ulang halaman."
                );
            }
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (initialToken) {
            fetchRevisionData(initialToken);
        } else {
            setIsLoading(false);
        }
    }, [initialToken, fetchRevisionData]);

    const handleManualTokenSubmit = (e) => {
        e.preventDefault();
        const clean = manualTokenInput.trim();
        if (!clean) return;
        setCurrentToken(clean);
        fetchRevisionData(clean);
    };

    const handleTextChange = (e) => {
        const { name, value } = e.target;
        setEditableFields((prev) => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (docType, e) => {
        const file = e.target.files?.[0] || null;
        setFileErrors((prev) => ({ ...prev, [docType]: null }));

        if (!file) {
            setReplacementFiles((prev) => {
                const updated = { ...prev };
                delete updated[docType];
                return updated;
            });
            return;
        }

        // Validasi format
        if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
            setFileErrors((prev) => ({
                ...prev,
                [docType]: "Format berkas harus berupa dokumen PDF (.pdf).",
            }));
            e.target.value = "";
            return;
        }

        // Validasi ukuran
        const maxSize = docType === "AKTA_NOTARIS" ? MAX_SIZE_AKTA : MAX_SIZE_DEFAULT;
        if (file.size > maxSize) {
            const maxKb = Math.round(maxSize / 1024);
            const maxLabel = maxKb >= 1024 ? `${maxKb / 1024} MB` : `${maxKb} KB`;
            setFileErrors((prev) => ({
                ...prev,
                [docType]: `Ukuran berkas melebihi batas maksimal ${maxLabel}.`,
            }));
            e.target.value = "";
            return;
        }

        setReplacementFiles((prev) => ({ ...prev, [docType]: file }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitError("");

        const payload = new FormData();
        payload.append("nama_penerbit", editableFields.nama_penerbit.trim());
        payload.append("alamat_lengkap", editableFields.alamat_lengkap.trim());
        payload.append("nama_penanggung_jawab", editableFields.nama_penanggung_jawab.trim());
        payload.append("telepon_penanggung_jawab", editableFields.telepon_penanggung_jawab.trim());

        // Lampirkan hanya berkas yang diperbarui
        Object.entries(replacementFiles).forEach(([docType, file]) => {
            const formFieldName = DOC_FIELD_MAP[docType];
            if (formFieldName && file) {
                payload.append(formFieldName, file);
            }
        });

        setIsSubmitting(true);
        try {
            const res = await publisherRegistrationApi.submitRevision(currentToken, payload);
            if (res?.success) {
                setSubmitSuccess(true);
            } else {
                throw new Error(res?.message || "Perbaikan tidak dapat diproses.");
            }
        } catch (err) {
            const code = err.data?.code || err.code;
            if (code === "TOKEN_INVALID_OR_EXPIRED") {
                setSubmitError(
                    "Tautan perbaikan ini sudah tidak berlaku atau telah kedaluwarsa (14 hari)."
                );
            } else if (code === "FILE_NOT_PDF") {
                setSubmitError("Berkas yang dikirimkan harus berformat dokumen PDF asli.");
            } else if (code === "FILE_TOO_LARGE") {
                setSubmitError("Ukuran berkas melampaui batas maksimal yang ditentukan.");
            } else {
                setSubmitError(
                    err.message ||
                        "Gagal mengirimkan perbaikan pendaftaran. Silakan periksa isian Anda."
                );
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-3 sm:p-6 animate-page-in">
            {/* Header Kembali & Tema */}
            <div className="w-full max-w-3xl mb-3 flex items-center justify-between">
                <Link
                    to="/cek-status"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-ink-muted hover:text-ink bg-surface border border-line shadow-2xs hover:border-brand-600/30 hover:bg-surface-subtle transition-all"
                >
                    <ArrowLeft className="w-3.5 h-3.5 text-brand-fg" />
                    <span>Cek Status Pendaftaran</span>
                </Link>
                <Switcher />
            </div>

            {/* Kontainer Utama */}
            <div className="w-full max-w-3xl bg-surface rounded-2xl shadow-xs border border-line p-5 sm:p-8 space-y-6">
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
                        Perbaikan Dokumen Pendaftaran
                    </h1>
                    <p className="text-xs text-ink-muted max-w-md mx-auto leading-relaxed">
                        Lengkapi atau perbarui dokumen persyaratan pendaftaran akun penerbit sesuai catatan evaluasi verifikator LPMQ.
                    </p>
                </div>

                {/* State: Loading */}
                {isLoading && (
                    <div className="p-10 text-center space-y-3">
                        <RefreshCw className="w-6 h-6 animate-spin text-brand-700 mx-auto" />
                        <p className="text-xs text-ink-muted font-medium">
                            Memvalidasi token dan memuat data perbaikan...
                        </p>
                    </div>
                )}

                {/* State: Form Masukkan Token Manual jika dibuka langsung tanpa token */}
                {!isLoading && !currentToken && !loadError && !revisionData && (
                    <div className="p-6 rounded-2xl bg-surface-subtle border border-line space-y-4 animate-fadeIn">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-800 border border-brand-100 flex items-center justify-center shrink-0">
                                <KeyRound className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-ink">
                                    Masukkan Token Perbaikan atau Kode Pendaftaran
                                </h3>
                                <p className="text-xs text-ink-muted">
                                    Silakan masukkan token perbaikan yang Anda terima melalui email/petugas, ATAU gunakan langsung Kode Pendaftaran Anda (REG-PUB-...).
                                </p>
                            </div>
                        </div>

                        <form onSubmit={handleManualTokenSubmit} className="space-y-3 pt-2">
                            <div>
                                <label
                                    htmlFor="manual-token-field"
                                    className="block text-[11px] font-bold uppercase tracking-wider text-ink-muted mb-1.5"
                                >
                                    Token Perbaikan atau Kode Pendaftaran
                                </label>
                                <input
                                    id="manual-token-field"
                                    type="text"
                                    value={manualTokenInput}
                                    onChange={(e) => setManualTokenInput(e.target.value.trim())}
                                    placeholder="Contoh: REG-PUB-2026... atau token perbaikan 64-karakter"
                                    className="w-full px-3.5 py-2.5 text-xs font-mono bg-canvas focus:bg-surface border border-line-strong rounded-xl outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-fg transition-all text-ink placeholder:text-ink-muted placeholder:font-sans"
                                    required
                                />
                            </div>

                            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                                <button
                                    type="submit"
                                    className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-brand-fill hover:bg-brand-fill-hover transition-colors shadow-2xs flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    <span>Muat Berkas Pendaftaran</span>
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                                <Link
                                    to="/cek-status"
                                    className="py-2.5 px-4 rounded-xl text-xs font-bold text-center text-ink bg-surface border border-line hover:bg-surface-subtle transition-colors shadow-2xs"
                                >
                                    Cek Status Pendaftaran
                                </Link>
                            </div>
                        </form>
                    </div>
                )}

                {/* State: Token Error / Expired */}
                {!isLoading && loadError && (
                    <div className="p-6 rounded-2xl bg-civic-dangerSoft/60 border border-civic-dangerLine text-center space-y-3 animate-fadeIn">
                        <div className="w-12 h-12 rounded-full bg-civic-dangerSoft text-civic-danger flex items-center justify-center mx-auto">
                            <XCircle className="w-7 h-7" />
                        </div>
                        <h3 className="text-base font-bold text-ink">
                            Tautan Perbaikan Tidak Berlaku
                        </h3>
                        <p className="text-xs text-civic-danger max-w-md mx-auto leading-relaxed">
                            {loadError}
                        </p>
                        <div className="pt-2 flex flex-wrap justify-center gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setLoadError("");
                                    setCurrentToken("");
                                    setManualTokenInput("");
                                }}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-brand-800 bg-surface border border-brand-200 hover:bg-surface-subtle transition-colors shadow-2xs cursor-pointer"
                            >
                                <KeyRound className="w-3.5 h-3.5 text-brand-fg" />
                                <span>Masukkan Token Lain</span>
                            </button>
                            <Link
                                to="/cek-status"
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-ink bg-surface border border-line hover:bg-surface-subtle transition-colors shadow-2xs"
                            >
                                Cek Status Pendaftaran
                            </Link>
                            <a
                                href="mailto:lpmq@kemenag.go.id"
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-brand-fill hover:bg-brand-fill-hover transition-colors shadow-2xs"
                            >
                                Hubungi Sekretariat LPMQ
                            </a>
                        </div>
                    </div>
                )}

                {/* State: Sukses Kirim Revisi */}
                {submitSuccess && (
                    <div className="p-6 rounded-2xl bg-brand-50 border border-brand-100 text-center space-y-4 animate-fadeIn">
                        <div className="w-14 h-14 rounded-full bg-brand-100 text-brand-800 flex items-center justify-center mx-auto shadow-2xs">
                            <CheckCircle2 className="w-8 h-8" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-lg font-bold text-ink">
                                Perbaikan Berhasil Dikirimkan!
                            </h3>
                            <p className="text-xs text-ink-muted max-w-md mx-auto leading-relaxed">
                                Dokumen dan data pembaruan pendaftaran Anda telah tercatat. Status permohonan Anda kini kembali menjadi{" "}
                                <strong className="text-brand-900">DIAJUKAN</strong> dan akan ditinjau ulang oleh tim verifikasi LPMQ.
                            </p>
                        </div>
                        <div className="pt-2">
                            <Link
                                to="/cek-status"
                                state={{ kode: revisionData?.kode_pendaftaran }}
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-fill hover:bg-brand-fill-hover transition-colors shadow-2xs"
                            >
                                <span>Pantau Status di Halaman Cek Status</span>
                                <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
                            </Link>
                        </div>
                    </div>
                )}

                {/* Form Perbaikan Dokumen & Data */}
                {!isLoading && !loadError && !submitSuccess && revisionData && (
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Error Alert Submit */}
                        {submitError && (
                            <div
                                role="alert"
                                className="p-3.5 rounded-xl bg-civic-dangerSoft border border-civic-dangerLine text-civic-danger text-xs flex items-start gap-2.5 animate-fadeIn"
                            >
                                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                <span className="leading-relaxed">{submitError}</span>
                            </div>
                        )}

                        {/* Catatan Kekurangan dari Petugas */}
                        <div className="p-4 rounded-xl bg-civic-warningSoft border border-civic-warningLine text-ink space-y-2">
                            <div className="flex items-center gap-2 text-civic-warning font-bold text-xs uppercase tracking-wide">
                                <AlertTriangle className="w-4 h-4" />
                                <span>Catatan Perbaikan dari Petugas Verifikator</span>
                            </div>
                            <div className="p-3 rounded-lg bg-surface border border-line text-xs font-medium text-ink leading-relaxed">
                                "{revisionData.alasan_perbaikan || "Harap lengkapi dan perbaiki berkas pendaftaran Anda."}"
                            </div>
                            <p className="text-[11px] text-ink-muted leading-tight">
                                Anda hanya perlu mengunggah ulang dokumen yang ditandai perlu diganti atau diperbaiki. Dokumen yang sudah sah tidak perlu diunggah kembali.
                            </p>
                        </div>

                        {/* Info Ringkas Pendaftaran */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-surface-subtle/70 border border-line text-xs">
                            <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted block">
                                    Kode Pendaftaran
                                </span>
                                <span className="font-mono font-bold text-ink">
                                    {revisionData.kode_pendaftaran}
                                </span>
                            </div>
                            <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted block">
                                    Jenis Penerbit
                                </span>
                                <span className="font-semibold text-ink">
                                    {revisionData.jenis_penerbit}
                                </span>
                            </div>
                            <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted block">
                                    Email Akun
                                </span>
                                <span className="font-semibold text-ink">
                                    {revisionData.email}
                                </span>
                            </div>
                        </div>

                        {/* DAFTAR DOKUMEN & PERGANTIAN BERKAS */}
                        <div className="space-y-3">
                            <p className="text-xs font-bold uppercase tracking-wider text-brand-fg">
                                Periksa & Ganti Berkas yang Belum Sesuai (PDF Saja)
                            </p>

                            <div className="space-y-3">
                                {revisionData.dokumen_terunggah?.map((doc) => {
                                    const label = DOC_LABEL_MAP[doc.tipe] || doc.tipe;
                                    const needsReplacement = doc.status === "PERLU_DIGANTI";
                                    const isAkta = doc.tipe === "AKTA_NOTARIS";
                                    const maxLabel = isAkta ? "Maks 2 MB" : "Maks 500 KB";

                                    return (
                                        <div
                                            key={doc.tipe}
                                            className={`p-3.5 rounded-xl border transition-all ${
                                                needsReplacement
                                                    ? "bg-civic-warningSoft/30 border-civic-warningLine"
                                                    : "bg-surface border-line"
                                            }`}
                                        >
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                                                <div>
                                                    <span className="text-xs font-bold text-ink">
                                                        {label}
                                                    </span>
                                                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-ink-muted">
                                                        <span>Berkas saat ini: {doc.nama_file || "-"}</span>
                                                        <span>· {maxLabel}</span>
                                                    </div>
                                                </div>

                                                <div>
                                                    {needsReplacement ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-civic-warningSoft text-civic-warning border border-civic-warningLine">
                                                            <AlertTriangle className="w-3 h-3" />
                                                            Perlu Diganti
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-brand-50 text-brand-800 border border-brand-100">
                                                            <CheckCircle2 className="w-3 h-3" />
                                                            Valid / Sesuai
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* File Input */}
                                            <div className="pt-1.5 border-t border-line/60">
                                                <label className="block text-[11px] text-ink-muted mb-1">
                                                    {needsReplacement
                                                        ? "Pilih berkas baru untuk menggantikan dokumen ini:"
                                                        : "Pilih berkas baru (opsional, jika ingin mengganti):"}
                                                </label>
                                                <input
                                                    type="file"
                                                    accept=".pdf,application/pdf"
                                                    onChange={(e) => handleFileChange(doc.tipe, e)}
                                                    className="text-xs text-ink file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-surface-subtle file:text-ink hover:file:bg-line cursor-pointer"
                                                />
                                                {fileErrors[doc.tipe] && (
                                                    <p className="text-[11px] text-civic-danger mt-1">
                                                        {fileErrors[doc.tipe]}
                                                    </p>
                                                )}
                                                {replacementFiles[doc.tipe] && (
                                                    <p className="text-[11px] text-brand-700 font-semibold mt-1">
                                                        Berkas baru siap diunggah: {replacementFiles[doc.tipe].name}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* DATA ISIAN YANG BISA DIPERBARUI */}
                        <div className="space-y-3 pt-2">
                            <p className="text-xs font-bold uppercase tracking-wider text-brand-fg">
                                Pembaruan Identitas & Kontak (Jika Diperlukan)
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-ink mb-1">
                                        Nama Resmi Penerbit
                                    </label>
                                    <input
                                        type="text"
                                        name="nama_penerbit"
                                        value={editableFields.nama_penerbit}
                                        onChange={handleTextChange}
                                        className="w-full px-3.5 py-2 text-xs sm:text-sm bg-canvas focus:bg-surface border border-line-strong rounded-xl outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-fg transition-all text-ink"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-ink mb-1">
                                        Nama Penanggung Jawab
                                    </label>
                                    <input
                                        type="text"
                                        name="nama_penanggung_jawab"
                                        value={editableFields.nama_penanggung_jawab}
                                        onChange={handleTextChange}
                                        className="w-full px-3.5 py-2 text-xs sm:text-sm bg-canvas focus:bg-surface border border-line-strong rounded-xl outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-fg transition-all text-ink"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-ink mb-1">
                                        Nomor WhatsApp / HP
                                    </label>
                                    <input
                                        type="text"
                                        name="telepon_penanggung_jawab"
                                        value={editableFields.telepon_penanggung_jawab}
                                        onChange={handleTextChange}
                                        className="w-full px-3.5 py-2 text-xs sm:text-sm bg-canvas focus:bg-surface border border-line-strong rounded-xl outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-fg transition-all text-ink"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-ink mb-1">
                                        Alamat Kantor / Pengiriman
                                    </label>
                                    <input
                                        type="text"
                                        name="alamat_lengkap"
                                        value={editableFields.alamat_lengkap}
                                        onChange={handleTextChange}
                                        className="w-full px-3.5 py-2 text-xs sm:text-sm bg-canvas focus:bg-surface border border-line-strong rounded-xl outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-fg transition-all text-ink"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Tombol Kirim Ulang Perbaikan */}
                        <div className="pt-3 border-t border-line">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-3 px-6 rounded-xl text-white font-bold text-xs sm:text-sm bg-brand-fill hover:bg-brand-fill-hover active:scale-[0.99] transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
                            >
                                {isSubmitting ? (
                                    <span className="inline-flex items-center gap-2">
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        Mengunggah & Mengirimkan Perbaikan...
                                    </span>
                                ) : (
                                    <>
                                        <FileCheck className="w-4 h-4" />
                                        <span>Kirimkan Perbaikan Dokumen Pendaftaran</span>
                                    </>
                                )}
                            </button>
                            <p className="text-[11px] text-center text-ink-muted mt-2">
                                Tautan perbaikan ini bersifat sekali pakai dan akan langsung hangus setelah formulir berhasil dikirimkan.
                            </p>
                        </div>
                    </form>
                )}
            </div>

            {/* Footer */}
            <div className="mt-6 text-center text-[11px] text-ink-muted">
                Lajnah Pentashihan Mushaf Al-Qur'an &copy; 2026 Kementerian Agama RI
            </div>
        </div>
    );
};

export default PublisherRevisionPage;
