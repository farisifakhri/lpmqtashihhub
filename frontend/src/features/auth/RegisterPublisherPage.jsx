import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
    ShieldCheck,
    Building2,
    Landmark,
    Building,
    User,
    Mail,
    Lock,
    Phone,
    MapPin,
    AlertCircle,
    CheckCircle2,
    Eye,
    EyeOff,
    FileText,
    UploadCloud,
    Copy,
    Check,
    ArrowRight,
    ExternalLink,
    FileCheck,
    HelpCircle,
    Shield,
    Clock,
    FileCode2,
    X,
} from "lucide-react";
import kemenagLogo from "@/assets/kemenag1.png";
import lpmqLogo from "@/assets/logo-lpmq1.png";
import Switcher from "../darkmode/Switcher";
import { publisherRegistrationApi } from "@/api/publisher-registration.api";

// Konfigurasi tautan unduh contoh surat pendaftaran
const TEMPLATE_SURAT_URL =
    import.meta.env.VITE_SURAT_PENDAFTARAN_TEMPLATE_URL ||
    "https://tashih.kemenag.go.id/download-materi";

const MAX_SIZE_DEFAULT = 500 * 1024; // 500 KB
const MAX_SIZE_AKTA = 2 * 1024 * 1024; // 2 MB

const PERSYARATAN_DOKUMEN = {
    PERUSAHAAN: {
        huruf: "A",
        label: "Perusahaan (PT/CV)",
        items: [
            {
                nama: "Surat Pendaftaran Penerbit Mushaf Al-Qur'an",
                format: "Format file pdf. Ukuran masimal 500kb.",
                linkText: "Contoh surat dapat diunduh di sini",
                linkUrl: "https://tashih.kemenag.go.id/download-materi",
            },
            {
                nama: "Akta Notaris",
                format: "Format file pdf. Ukuran masimal 2 mb",
            },
            {
                nama: "SIUP dan TDP",
                format: "Format file pdf. Ukuran masimal 500kb",
                catatan: "(Jika memiliki NIB, maka SIUP dan TDP boleh tidak dilampirkan)",
            },
            {
                nama: "Profil Perusahaan",
                format: "Format file pdf. Ukuran masimal 500kb",
            },
            {
                nama: "NPWP",
                format: "Format file pdf. Ukuran masimal 500 kb",
            },
            {
                nama: "NIB",
                format: "Format file pdf. Ukuran masimal 500 kb",
            },
            {
                nama: "KTP Penanggung Jawab",
                format: "Format file pdf. Ukuran masimal 500 kb",
            },
        ],
    },
    LEMBAGA_PEMERINTAH: {
        huruf: "B",
        label: "Lembaga Pemerintah",
        items: [
            {
                nama: "Surat Pendaftaran Penerbit Mushaf Al-Qur'an",
                format: "Format file pdf. Ukuran masimal 500kb.",
                linkText: "Contoh surat dapat diunduh di sini",
                linkUrl: "https://tashih.kemenag.go.id/download-materi",
            },
            {
                nama: "Profil Lembaga",
                format: "Format file pdf. Ukuran masimal 500kb",
            },
            {
                nama: "NPWP",
                format: "Format file pdf. Ukuran masimal 500 kb",
            },
            {
                nama: "KTP Penanggung Jawab",
                format: "Format file pdf. Ukuran masimal 500 kb",
            },
        ],
    },
    YAYASAN: {
        huruf: "C",
        label: "Yayasan",
        items: [
            {
                nama: "Surat Pendaftaran Penerbit Mushaf Al-Qur'an",
                format: "Format file pdf. Ukuran masimal 500kb.",
                linkText: "Contoh surat dapat diunduh di sini",
                linkUrl: "https://tashih.kemenag.go.id/download-materi",
            },
            {
                nama: "Akta Notaris",
                format: "Format file pdf. Ukuran masimal 2 mb",
            },
            {
                nama: "Profil yayasan",
                format: "Format file pdf. Ukuran masimal 500kb",
            },
            {
                nama: "NPWP",
                format: "Format file pdf. Ukuran masimal 500 kb",
            },
            {
                nama: "KTP Penanggung Jawab",
                format: "Format file pdf. Ukuran masimal 500 kb",
            },
        ],
    },
};

const ENTITY_OPTIONS = [
    {
        id: "PERUSAHAAN",
        label: "Perusahaan (PT / CV)",
        desc: "Badan usaha berbadan hukum swasta",
        icon: Building2,
    },
    {
        id: "YAYASAN",
        label: "Yayasan",
        desc: "Badan hukum keagamaan / sosial / pendidikan",
        icon: Building,
    },
    {
        id: "LEMBAGA_PEMERINTAH",
        label: "Lembaga Pemerintah",
        desc: "Kementerian / Lembaga / Dinas / Perguruan Tinggi",
        icon: Landmark,
    },
];

export const RegisterPublisherPage = () => {
    // Form State
    const [jenisPenerbit, setJenisPenerbit] = useState("PERUSAHAAN");
    const [guideTab, setGuideTab] = useState("PERUSAHAAN");
    const [formData, setFormData] = useState({
        nama_penerbit: "",
        alamat_lengkap: "",
        nama_penanggung_jawab: "",
        telepon_penanggung_jawab: "",
        email: "",
        password: "",
        npwp: "",
        nib: "",
    });

    // File State (File Objects)
    const [files, setFiles] = useState({
        dokumen_surat_pendaftaran: null,
        dokumen_akta_notaris: null,
        dokumen_profil: null,
        dokumen_npwp: null,
        dokumen_nib: null,
        dokumen_ktp: null,
    });

    const [fileErrors, setFileErrors] = useState({});
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [successData, setSuccessData] = useState(null);
    const [copied, setCopied] = useState(false);

    // Sync active checklist tab when user clicks entity option
    const handleJenisChange = (id) => {
        setJenisPenerbit(id);
        setGuideTab(id);
        setError("");
        // Bersihkan NIB & Akta jika pindah ke jenis yang tidak mensyaratkannya
        if (id !== "PERUSAHAAN") {
            setFormData((prev) => ({ ...prev, nib: "" }));
            setFiles((prev) => ({ ...prev, dokumen_nib: null }));
        }
        if (id === "LEMBAGA_PEMERINTAH") {
            setFiles((prev) => ({ ...prev, dokumen_akta_notaris: null }));
        }
    };

    const handleTextChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (error) setError("");
    };

    // Validasi berkas di sisi klien
    const handleFileChange = (field, e, maxSizeBytes) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        // Validasi ekstensi & tipe MIME (hanya PDF)
        const isPdfName = selectedFile.name.toLowerCase().endsWith(".pdf");
        const isPdfMime = selectedFile.type === "application/pdf" || selectedFile.type === "";

        if (!isPdfName || !isPdfMime) {
            setFileErrors((prev) => ({
                ...prev,
                [field]: "Format berkas harus berupa dokumen PDF (.pdf).",
            }));
            e.target.value = "";
            return;
        }

        // Validasi ukuran berkas
        if (selectedFile.size > maxSizeBytes) {
            const maxKb = Math.round(maxSizeBytes / 1024);
            const sizeLabel = maxKb >= 1024 ? `${Math.round(maxKb / 1024)} MB` : `${maxKb} KB`;
            setFileErrors((prev) => ({
                ...prev,
                [field]: `Ukuran berkas melebihi batas maksimal ${sizeLabel}.`,
            }));
            e.target.value = "";
            return;
        }

        // Berkas valid
        setFileErrors((prev) => {
            const next = { ...prev };
            delete next[field];
            return next;
        });

        setFiles((prev) => ({
            ...prev,
            [field]: selectedFile,
        }));
    };

    const handleRemoveFile = (field, inputId) => {
        setFiles((prev) => ({ ...prev, [field]: null }));
        const inputElem = document.getElementById(inputId);
        if (inputElem) inputElem.value = "";
    };

    const handleCopyCode = async () => {
        if (!successData?.kode_pendaftaran) return;
        try {
            await navigator.clipboard.writeText(successData.kode_pendaftaran);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch {
            // fallback
        }
    };

    // Handle Submit Pendaftaran
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        // Validasi Dasar
        if (!formData.nama_penerbit.trim()) {
            setError("Nama resmi lembaga / penerbit wajib diisi.");
            return;
        }
        if (!formData.alamat_lengkap.trim()) {
            setError("Alamat kantor lengkap wajib diisi untuk alamat pengiriman fisik.");
            return;
        }
        if (!formData.npwp.trim()) {
            setError("Nomor NPWP wajib diisi.");
            return;
        }
        if (!formData.nama_penanggung_jawab.trim()) {
            setError("Nama penanggung jawab akun wajib diisi.");
            return;
        }
        if (!formData.telepon_penanggung_jawab.trim()) {
            setError("Nomor telepon / WhatsApp penanggung jawab wajib diisi.");
            return;
        }
        if (!formData.email.trim()) {
            setError("Alamat email resmi wajib diisi.");
            return;
        }
        if (!formData.password || formData.password.length < 8) {
            setError("Kata sandi akun minimal 8 karakter dengan kombinasi angka dan huruf.");
            return;
        }

        // Validasi NIB (khusus PERUSAHAAN)
        if (jenisPenerbit === "PERUSAHAAN") {
            if (!formData.nib || formData.nib.trim().length < 13) {
                setError("Nomor Induk Berusaha (NIB) wajib diisi untuk perusahaan (minimal 13 karakter).");
                return;
            }
            if (!files.dokumen_nib) {
                setError("Berkas salinan NIB wajib diunggah untuk badan usaha perusahaan.");
                return;
            }
        }

        // Validasi Berkas Wajib
        if (!files.dokumen_surat_pendaftaran) {
            setError("Surat permohonan pendaftaran resmi wajib diunggah (PDF, maks 500 KB).");
            return;
        }
        if (["PERUSAHAAN", "YAYASAN"].includes(jenisPenerbit) && !files.dokumen_akta_notaris) {
            setError("Salinan Akta Notaris & SK Kemenkumham wajib diunggah (PDF, maks 2 MB).");
            return;
        }
        if (!files.dokumen_profil) {
            setError("Profil instansi / badan usaha penerbit wajib diunggah (PDF, maks 500 KB).");
            return;
        }
        if (!files.dokumen_npwp) {
            setError("Salinan kartu / SKT NPWP wajib diunggah (PDF, maks 500 KB).");
            return;
        }
        if (!files.dokumen_ktp) {
            setError("Salinan KTP pimpinan / penanggung jawab akun wajib diunggah (PDF, maks 500 KB).");
            return;
        }

        // Susun Multipart Form Data
        const payload = new FormData();
        payload.append("nama_penerbit", formData.nama_penerbit.trim());
        payload.append("jenis_penerbit", jenisPenerbit);
        payload.append("alamat_lengkap", formData.alamat_lengkap.trim());
        payload.append("nama_penanggung_jawab", formData.nama_penanggung_jawab.trim());
        payload.append("telepon_penanggung_jawab", formData.telepon_penanggung_jawab.trim());
        payload.append("email", formData.email.trim().toLowerCase());
        payload.append("password", formData.password);
        payload.append("npwp", formData.npwp.trim());

        if (jenisPenerbit === "PERUSAHAAN" && formData.nib) {
            payload.append("nib", formData.nib.trim());
        }

        // Lampirkan Berkas
        if (files.dokumen_surat_pendaftaran) {
            payload.append("dokumen_surat_pendaftaran", files.dokumen_surat_pendaftaran);
        }
        if (files.dokumen_akta_notaris) {
            payload.append("dokumen_akta_notaris", files.dokumen_akta_notaris);
        }
        if (files.dokumen_profil) {
            payload.append("dokumen_profil", files.dokumen_profil);
        }
        if (files.dokumen_npwp) {
            payload.append("dokumen_npwp", files.dokumen_npwp);
        }
        if (files.dokumen_nib) {
            payload.append("dokumen_nib", files.dokumen_nib);
        }
        if (files.dokumen_ktp) {
            payload.append("dokumen_ktp", files.dokumen_ktp);
        }

        setIsSubmitting(true);
        try {
            const res = await publisherRegistrationApi.register(payload);
            if (res?.success && res?.data) {
                setSuccessData(res.data);
            } else {
                throw new Error(res?.message || "Pendaftaran tidak dapat diproses.");
            }
        } catch (err) {
            // Petakan kode kesalahan kontrak ke pesan pengguna yang bersahabat
            const code = err.data?.code || err.code;
            if (code === "DUPLICATE_ACTIVE_REGISTRATION") {
                setError(
                    "NPWP, NIB, atau alamat email ini sudah terdaftar pada permohonan yang aktif. Silakan gunakan menu Cek Status atau hubungi loket LPMQ."
                );
            } else if (code === "FILE_NOT_PDF") {
                setError("Berkas yang Anda unggah bukan format PDF asli yang valid.");
            } else if (code === "FILE_ACTIVE_CONTENT") {
                setError("Berkas PDF mengandung konten aktif (script/eksekusi) yang ditolak sistem keamanan.");
            } else if (code === "FILE_TOO_LARGE") {
                setError("Ukuran berkas melebihi batas maksimal (500 KB atau 2 MB untuk Akta).");
            } else if (code === "DOCUMENT_REQUIRED") {
                setError("Dokumen persyaratan belum lengkap. Silakan periksa kembali berkas wajib di formulir.");
            } else if (code === "RATE_LIMITED") {
                setError("Terlalu banyak permintaan pendaftaran dari jaringan Anda. Silakan tunggu beberapa menit.");
            } else {
                setError(
                    err.message ||
                        "Gagal mengajukan pendaftaran akun penerbit. Periksa kembali kelengkapan formulir Anda."
                );
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-canvas text-ink flex flex-col justify-between animate-page-in">
            {/* TOP NAVIGATION / HEADER */}
            <header className="sticky top-0 z-30 bg-surface/90 backdrop-blur-md border-b border-line shadow-2xs">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
                    {/* Brand Logos */}
                    <div className="flex items-center gap-3">
                        <Link to="/" className="inline-flex items-center gap-3">
                            <img
                                src={kemenagLogo}
                                alt="Kementerian Agama RI"
                                className="h-9 w-auto object-contain"
                            />
                            <div className="h-6 w-[1px] bg-line hidden sm:block" />
                            <img
                                src={lpmqLogo}
                                alt="LPMQ"
                                className="h-8 w-auto object-contain rounded hidden sm:block"
                            />
                            <div className="hidden md:flex flex-col text-left">
                                <span className="text-xs font-bold text-ink leading-tight">
                                    Lajnah Pentashihan Mushaf Al-Qur'an
                                </span>
                                <span className="text-[11px] text-ink-muted leading-tight">
                                    Kementerian Agama Republik Indonesia
                                </span>
                            </div>
                        </Link>
                    </div>

                    {/* Quick Action Navigation */}
                    <div className="flex items-center gap-3 sm:gap-4">
                        <Link
                            to="/cek-status"
                            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-ink-muted hover:text-brand-fg bg-surface-subtle border border-line hover:border-brand-200 transition-all"
                        >
                            <Clock className="w-3.5 h-3.5 text-brand-fg" />
                            <span>Cek Status Pendaftaran</span>
                        </Link>

                        <div className="flex items-center gap-1.5 text-xs text-ink-muted">
                            <span className="hidden md:inline">Sudah punya akun?</span>
                            <Link
                                to="/login"
                                className="font-bold text-brand-fg hover:text-brand-fill-hover underline transition-colors"
                            >
                                Masuk
                            </Link>
                        </div>

                        <Switcher />
                    </div>
                </div>
            </header>

            {/* MAIN CONTENT AREA */}
            <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 flex-1">
                {/* PAGE TITLE BANNER */}
                <div className="mb-6 sm:mb-8 text-center max-w-3xl mx-auto space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 border border-brand-200 text-brand-900 text-xs font-bold tracking-wide">
                        <ShieldCheck className="w-4 h-4 text-brand-700" />
                        <span>Layanan Mandiri Pendaftaran Penerbit Mushaf Al-Qur'an</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
                        Pendaftaran Akun Penerbit
                    </h1>
                    <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
                        Lengkapi identitas badan hukum resmi dan unggah dokumen persyaratan untuk mengajukan akun penerbit mushaf Al-Qur'an di Lajnah Pentashihan Mushaf Al-Qur'an (LPMQ) Kementerian Agama RI.
                    </p>
                </div>

                {/* TAMPILAN SUKSES PENDAFTARAN */}
                {successData ? (
                    <div className="max-w-2xl mx-auto p-6 sm:p-8 rounded-2xl bg-surface border border-brand-200 shadow-sm space-y-5 animate-fadeIn">
                        <div className="w-16 h-16 rounded-full bg-brand-50 text-brand-700 border border-brand-200 flex items-center justify-center mx-auto shadow-2xs">
                            <CheckCircle2 className="w-9 h-9" />
                        </div>

                        <div className="text-center space-y-1.5">
                            <h3 className="text-xl font-extrabold text-ink">
                                Pendaftaran Berhasil Diajukan!
                            </h3>
                            <p className="text-xs sm:text-sm text-ink-muted max-w-md mx-auto leading-relaxed">
                                Permohonan pendaftaran akun penerbit untuk{" "}
                                <strong className="text-ink">
                                    {successData.nama_penerbit}
                                </strong>{" "}
                                telah resmi tercatat di sistem LPMQ Kemenag RI.
                            </p>
                        </div>

                        {/* Card Kode Pendaftaran */}
                        <div className="p-5 rounded-xl bg-surface-subtle border border-brand-200/80 shadow-2xs space-y-2.5 text-center">
                            <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                                Kode Pendaftaran Anda
                            </p>
                            <div className="flex items-center justify-center gap-3">
                                <span
                                    data-testid="success-registration-code"
                                    className="text-2xl sm:text-3xl font-mono font-extrabold text-brand-900 tracking-wider"
                                >
                                    {successData.kode_pendaftaran}
                                </span>
                                <button
                                    type="button"
                                    onClick={handleCopyCode}
                                    className="p-2.5 rounded-lg bg-surface hover:bg-surface-strong border border-line text-ink hover:text-brand-800 transition-colors cursor-pointer"
                                    title="Salin Kode Pendaftaran"
                                    aria-label="Salin Kode Pendaftaran"
                                >
                                    {copied ? (
                                        <Check className="w-5 h-5 text-brand-700" />
                                    ) : (
                                        <Copy className="w-5 h-5" />
                                    )}
                                </button>
                            </div>
                            <p className="text-xs text-ink-muted">
                                {copied ? (
                                    <span className="text-brand-700 font-bold">
                                        Kode pendaftaran berhasil disalin ke clipboard!
                                    </span>
                                ) : (
                                    "Simpan kode pendaftaran ini dengan aman untuk mengecek perkembangan verifikasi secara mandiri."
                                )}
                            </p>
                        </div>

                        <div className="p-4 rounded-xl bg-surface-subtle border border-line text-xs text-ink-muted space-y-2">
                            <p className="font-bold text-ink flex items-center gap-1.5">
                                <Clock className="w-4 h-4 text-brand-700" />
                                <span>Tahapan Selanjutnya:</span>
                            </p>
                            <ul className="list-disc pl-5 space-y-1 leading-relaxed">
                                <li>
                                    Petugas verifikator administrasi LPMQ akan memeriksa kelengkapan dan keabsahan dokumen legalitas Anda.
                                </li>
                                <li>
                                    Notifikasi konfirmasi pendaftaran telah dikirimkan ke alamat email terdaftar:{" "}
                                    <strong className="text-ink">{successData.email}</strong>.
                                </li>
                                <li>
                                    Jika terdapat berkas yang memerlukan revisi, Anda akan menerima email tautan perbaikan dokumen aktif selama 14 hari.
                                </li>
                            </ul>
                        </div>

                        <div className="pt-2 flex flex-col sm:flex-row gap-3">
                            <Link
                                to="/cek-status"
                                className="flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold text-center text-white bg-brand-fill hover:bg-brand-fill-hover transition-colors shadow-2xs"
                            >
                                Cek Status Pendaftaran
                            </Link>
                            <Link
                                to="/login"
                                className="flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold text-center text-ink bg-surface border border-line hover:bg-surface-subtle transition-colors shadow-2xs"
                            >
                                Halaman Masuk (Login)
                            </Link>
                        </div>
                    </div>
                ) : (
                    /* 2-COLUMN LAYOUT: SIDEBAR PANDUAN & FORMULIR UTAMA */
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                        {/* SISI KIRI: PANDUAN LENGKAP PERSYARATAN DOKUMEN */}
                        <aside className="lg:col-span-5 space-y-5 lg:sticky lg:top-24">
                            <div className="p-5 sm:p-6 rounded-2xl bg-surface border border-line shadow-xs space-y-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-brand-fg">
                                        <FileCheck className="w-5 h-5 text-brand-700" />
                                        <h2 className="text-sm sm:text-base font-bold text-ink">
                                            Siapkan hal berikut sebelum mendaftar penerbit
                                        </h2>
                                    </div>
                                    <p className="text-xs text-ink-muted leading-relaxed">
                                        Periksa dan siapkan seluruh dokumen pendaftaran resmi sesuai jenis badan hukum penerbit Anda:
                                    </p>
                                </div>

                                {/* Tabs Pemilihan Panduan Cepat (A, B, C) */}
                                <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-surface-subtle border border-line/70 text-xs">
                                    <button
                                        type="button"
                                        onClick={() => setGuideTab("PERUSAHAAN")}
                                        className={`py-1.5 px-2 rounded-lg font-bold text-center transition-all cursor-pointer ${
                                            guideTab === "PERUSAHAAN"
                                                ? "bg-surface text-brand-900 shadow-2xs border border-line/60"
                                                : "text-ink-muted hover:text-ink"
                                        }`}
                                    >
                                        A. PT / CV
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setGuideTab("LEMBAGA_PEMERINTAH")}
                                        className={`py-1.5 px-2 rounded-lg font-bold text-center transition-all cursor-pointer ${
                                            guideTab === "LEMBAGA_PEMERINTAH"
                                                ? "bg-surface text-brand-900 shadow-2xs border border-line/60"
                                                : "text-ink-muted hover:text-ink"
                                        }`}
                                    >
                                        B. Pemerintah
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setGuideTab("YAYASAN")}
                                        className={`py-1.5 px-2 rounded-lg font-bold text-center transition-all cursor-pointer ${
                                            guideTab === "YAYASAN"
                                                ? "bg-surface text-brand-900 shadow-2xs border border-line/60"
                                                : "text-ink-muted hover:text-ink"
                                        }`}
                                    >
                                        C. Yayasan
                                    </button>
                                </div>

                                {/* Detail Item Persyaratan Sesuai Tab Terpilih */}
                                <div className="p-4 rounded-xl bg-surface-subtle border border-line space-y-3">
                                    <div className="flex items-center justify-between border-b border-line pb-2">
                                        <span className="text-xs font-bold text-ink">
                                            {PERSYARATAN_DOKUMEN[guideTab]?.huruf}. Jika penerbit Anda berupa {PERSYARATAN_DOKUMEN[guideTab]?.label}:
                                        </span>
                                        {guideTab !== jenisPenerbit && (
                                            <button
                                                type="button"
                                                onClick={() => handleJenisChange(guideTab)}
                                                className="text-[11px] font-bold text-brand-fg hover:underline cursor-pointer"
                                            >
                                                Pilih di Formulir
                                            </button>
                                        )}
                                    </div>

                                    <ul className="space-y-2 text-xs text-ink-muted">
                                        {PERSYARATAN_DOKUMEN[guideTab]?.items.map((item, idx) => (
                                            <li key={idx} className="flex items-start gap-2 leading-relaxed">
                                                <span className="w-1.5 h-1.5 rounded-full bg-brand-700 mt-1.5 flex-shrink-0" />
                                                <div className="min-w-0">
                                                    <span className="font-semibold text-ink">{item.nama}</span>.{" "}
                                                    <span>{item.format}</span>{" "}
                                                    {item.linkUrl && (
                                                        <a
                                                            href={item.linkUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-brand-fg font-semibold underline inline-flex items-center gap-0.5 ml-1"
                                                        >
                                                            [{item.linkText}]
                                                            <ExternalLink className="w-2.5 h-2.5 inline" />
                                                        </a>
                                                    )}
                                                    {item.catatan && (
                                                        <span className="block text-[11px] text-brand-900 font-medium mt-0.5">
                                                            {item.catatan}
                                                        </span>
                                                    )}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Link Unduh Template Surat Resmi */}
                                <div className="p-3.5 rounded-xl bg-brand-50/70 border border-brand-200/80 flex items-center justify-between gap-2 text-xs">
                                    <div className="flex items-center gap-2 text-brand-900 font-semibold">
                                        <FileText className="w-4 h-4 text-brand-700 shrink-0" />
                                        <span>Format Surat Permohonan</span>
                                    </div>
                                    <a
                                        href={TEMPLATE_SURAT_URL}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[11px] font-bold text-brand-fg hover:underline inline-flex items-center gap-1"
                                    >
                                        <span>Unduh Berkas</span>
                                        <ExternalLink className="w-3 h-3" />
                                    </a>
                                </div>

                                {/* Keamanan & Ketentuan Hukum */}
                                <div className="pt-2 border-t border-line space-y-2 text-[11px] text-ink-muted">
                                    <div className="flex items-start gap-2">
                                        <Shield className="w-4 h-4 text-brand-700 shrink-0 mt-0.5" />
                                        <p>
                                            <strong>Ketentuan Legalitas:</strong> Sesuai regulasi penjaminan mutu mushaf Al-Qur'an, akun penerbit hanya diberikan kepada badan hukum (PT, CV, Yayasan) atau instansi pemerintah.
                                        </p>
                                    </div>
                                    <div className="flex items-center justify-between pt-1">
                                        <span>Sudah pernah mendaftar?</span>
                                        <Link
                                            to="/cek-status"
                                            className="text-brand-fg font-bold hover:underline"
                                        >
                                            Cek Status Pendaftaran &rarr;
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </aside>

                        {/* SISI KANAN: FORMULIR PENDAFTARAN PENERBIT */}
                        <div className="lg:col-span-7">
                            <form
                                onSubmit={handleSubmit}
                                className="p-5 sm:p-7 rounded-2xl bg-surface border border-line shadow-xs space-y-6"
                            >
                                {/* Alert Error Pesan */}
                                {error && (
                                    <div
                                        role="alert"
                                        className="p-4 rounded-xl bg-civic-dangerSoft border border-civic-dangerLine text-civic-danger text-xs sm:text-sm flex items-start gap-2.5 animate-fadeIn"
                                    >
                                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                        <span className="leading-relaxed">{error}</span>
                                    </div>
                                )}

                                {/* 1. PEMILIHAN JENIS BADAN HUKUM (PT/CV, Yayasan, Lembaga Pemerintah) */}
                                <div className="space-y-2.5">
                                    <label className="block text-xs font-bold text-ink uppercase tracking-wider">
                                        Jenis Penerbit *
                                    </label>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                        {ENTITY_OPTIONS.map((opt) => {
                                            const Icon = opt.icon;
                                            const active = jenisPenerbit === opt.id;
                                            return (
                                                <button
                                                    key={opt.id}
                                                    type="button"
                                                    onClick={() => handleJenisChange(opt.id)}
                                                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                                                        active
                                                            ? "bg-brand-50/70 border-brand-700 ring-2 ring-brand-700/20 shadow-2xs"
                                                            : "bg-surface hover:bg-surface-subtle border-line text-ink-muted"
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <Icon
                                                            className={`w-4 h-4 ${
                                                                active ? "text-brand-800" : "text-ink-muted"
                                                            }`}
                                                        />
                                                        <span
                                                            className={`text-xs font-bold ${
                                                                active ? "text-brand-900" : "text-ink"
                                                            }`}
                                                        >
                                                            {opt.label}
                                                        </span>
                                                    </div>
                                                    <span className="text-[11px] text-ink-muted leading-tight">
                                                        {opt.desc}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* 2. IDENTITAS BADAN HUKUM & KANTOR */}
                                <div className="space-y-4 pt-3 border-t border-line">
                                    <p className="text-xs font-bold uppercase tracking-wider text-brand-fg">
                                        1. Identitas Badan Hukum & Kantor Resmi
                                    </p>

                                    {/* Nama Penerbit */}
                                    <div>
                                        <label htmlFor="nama-penerbit-input" className="block text-xs font-semibold text-ink mb-1">
                                            Nama Resmi Lembaga / Penerbit *
                                        </label>
                                        <input
                                            id="nama-penerbit-input"
                                            type="text"
                                            name="nama_penerbit"
                                            value={formData.nama_penerbit}
                                            onChange={handleTextChange}
                                            placeholder={
                                                jenisPenerbit === "PERUSAHAAN"
                                                    ? "Contoh: PT Pustaka Cahaya Mandiri"
                                                    : jenisPenerbit === "YAYASAN"
                                                    ? "Contoh: Yayasan Al-Furqan Indonesia"
                                                    : "Contoh: Universitas Islam Negeri Syarif Hidayatullah"
                                            }
                                            className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-canvas focus:bg-surface border border-line-strong rounded-xl outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-fg transition-all text-ink placeholder:text-ink-muted"
                                            required
                                        />
                                    </div>

                                    {/* Alamat Kantor Lengkap */}
                                    <div>
                                        <label htmlFor="alamat-lengkap-input" className="block text-xs font-semibold text-ink mb-1">
                                            Alamat Kantor Resmi (Alamat Pengiriman Fisik) *
                                        </label>
                                        <textarea
                                            id="alamat-lengkap-input"
                                            rows={2}
                                            name="alamat_lengkap"
                                            value={formData.alamat_lengkap}
                                            onChange={handleTextChange}
                                            placeholder="Jl. Percetakan Mushaf No. 12, Kel. TMII, Kec. Cipayung, Jakarta Timur, 13560"
                                            className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-canvas focus:bg-surface border border-line-strong rounded-xl outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-fg transition-all text-ink placeholder:text-ink-muted resize-none"
                                            required
                                        />
                                        <p className="text-[11px] text-ink-muted mt-1">
                                            Alamat ini akan digunakan sebagai alamat tujuan pengiriman fisik naskah master dan surat dinas LPMQ.
                                        </p>
                                    </div>

                                    {/* NPWP & NIB */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                        <div>
                                            <label htmlFor="npwp-input" className="block text-xs font-semibold text-ink mb-1">
                                                NPWP Badan Usaha / Instansi *
                                            </label>
                                            <input
                                                id="npwp-input"
                                                type="text"
                                                name="npwp"
                                                value={formData.npwp}
                                                onChange={handleTextChange}
                                                placeholder="01.234.567.8-901.000"
                                                className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-canvas focus:bg-surface border border-line-strong rounded-xl outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-fg transition-all text-ink placeholder:text-ink-muted"
                                                required
                                            />
                                        </div>

                                        {jenisPenerbit === "PERUSAHAAN" ? (
                                            <div>
                                                <label htmlFor="nib-input" className="block text-xs font-semibold text-ink mb-1">
                                                    Nomor Induk Berusaha (NIB) *
                                                </label>
                                                <input
                                                    id="nib-input"
                                                    type="text"
                                                    name="nib"
                                                    value={formData.nib}
                                                    onChange={handleTextChange}
                                                    placeholder="9120001234567"
                                                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-canvas focus:bg-surface border border-line-strong rounded-xl outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-fg transition-all text-ink placeholder:text-ink-muted"
                                                    required
                                                />
                                                <p className="text-[11px] text-ink-muted mt-1">
                                                    Jika memiliki NIB, maka SIUP dan TDP boleh tidak dilampirkan.
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col justify-center text-[11px] text-ink-muted bg-surface-subtle p-3 rounded-xl border border-line/60">
                                                <span>NIB tidak dipersyaratkan untuk jenis {jenisPenerbit === "YAYASAN" ? "Yayasan" : "Lembaga Pemerintah"}.</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* 3. PENANGGUNG JAWAB & AKUN LOGIN */}
                                <div className="space-y-4 pt-3 border-t border-line">
                                    <p className="text-xs font-bold uppercase tracking-wider text-brand-fg">
                                        2. Penanggung Jawab & Kredensial Login
                                    </p>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                        <div>
                                            <label htmlFor="nama-pj-input" className="block text-xs font-semibold text-ink mb-1">
                                                Nama Pimpinan / Penanggung Jawab *
                                            </label>
                                            <input
                                                id="nama-pj-input"
                                                type="text"
                                                name="nama_penanggung_jawab"
                                                value={formData.nama_penanggung_jawab}
                                                onChange={handleTextChange}
                                                placeholder="Ahmad Subagio, S.Pd"
                                                className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-canvas focus:bg-surface border border-line-strong rounded-xl outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-fg transition-all text-ink placeholder:text-ink-muted"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label htmlFor="telepon-pj-input" className="block text-xs font-semibold text-ink mb-1">
                                                Nomor WhatsApp / HP Aktif *
                                            </label>
                                            <input
                                                id="telepon-pj-input"
                                                type="text"
                                                name="telepon_penanggung_jawab"
                                                value={formData.telepon_penanggung_jawab}
                                                onChange={handleTextChange}
                                                placeholder="081234567890"
                                                className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-canvas focus:bg-surface border border-line-strong rounded-xl outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-fg transition-all text-ink placeholder:text-ink-muted"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                        <div>
                                            <label htmlFor="email-input" className="block text-xs font-semibold text-ink mb-1">
                                                Alamat Email Resmi (Untuk Login) *
                                            </label>
                                            <input
                                                id="email-input"
                                                type="email"
                                                name="email"
                                                value={formData.email}
                                                onChange={handleTextChange}
                                                placeholder="sekretariat@pustaka.co.id"
                                                className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-canvas focus:bg-surface border border-line-strong rounded-xl outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-fg transition-all text-ink placeholder:text-ink-muted"
                                                required
                                            />
                                        </div>

                                        <div className="relative">
                                            <label htmlFor="password-input" className="block text-xs font-semibold text-ink mb-1">
                                                Kata Sandi Akun (Min. 8 Karakter) *
                                            </label>
                                            <input
                                                id="password-input"
                                                type={showPassword ? "text" : "password"}
                                                name="password"
                                                value={formData.password}
                                                onChange={handleTextChange}
                                                placeholder="Huruf kapital & angka"
                                                className="w-full pl-3.5 pr-10 py-2.5 text-xs sm:text-sm bg-canvas focus:bg-surface border border-line-strong rounded-xl outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-fg transition-all text-ink placeholder:text-ink-muted"
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute inset-y-0 right-0 top-6 pr-3 flex items-center text-ink-muted hover:text-ink transition-colors cursor-pointer"
                                                aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                                            >
                                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* 4. DOKUMEN PERSYARATAN LEGALITAS */}
                                <div className="space-y-4 pt-3 border-t border-line">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                        <p className="text-xs font-bold uppercase tracking-wider text-brand-fg">
                                            3. Dokumen Legalitas (PDF Saja)
                                        </p>
                                        <a
                                            href={TEMPLATE_SURAT_URL}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-fg hover:underline"
                                        >
                                            <FileText className="w-3.5 h-3.5" />
                                            <span>Unduh Format Surat Permohonan</span>
                                            <ExternalLink className="w-3 h-3" />
                                        </a>
                                    </div>

                                    {/* Callout Ringkasan Dokumen Berdasarkan Jenis */}
                                    <div className="p-3.5 rounded-xl bg-brand-50/60 border border-brand-200/80 text-xs space-y-2">
                                        <div className="flex flex-wrap items-center justify-between gap-1">
                                            <span className="font-bold text-ink">
                                                Dokumen yang harus diunggah ({PERSYARATAN_DOKUMEN[jenisPenerbit]?.label}):
                                            </span>
                                            <a
                                                href="https://tashih.kemenag.go.id/download-materi"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-[11px] text-brand-fg hover:underline inline-flex items-center gap-0.5 font-semibold"
                                            >
                                                [Contoh surat dapat diunduh di sini]
                                                <ExternalLink className="w-2.5 h-2.5 inline" />
                                            </a>
                                        </div>
                                        <p className="text-[11px] text-ink-muted leading-relaxed">
                                            Format berkas wajib <strong>PDF</strong>. Batas ukuran maksimal dokumen adalah <strong>500 KB</strong> (kecuali Akta Notaris maksimal <strong>2 MB</strong>).
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                        {/* 1. Surat Pendaftaran (Semua jenis) */}
                                        <div className="p-3.5 rounded-xl border border-line bg-surface-subtle flex flex-col justify-between space-y-2">
                                            <div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-bold text-ink">
                                                        Surat Permohonan *
                                                    </span>
                                                    <span className="text-[10px] text-ink-muted font-mono">
                                                        Maks 500 KB
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-ink-muted mt-0.5">
                                                    Bertanda tangan pimpinan & berstempel resmi.
                                                </p>
                                            </div>
                                            <input
                                                id="file-surat-pendaftaran"
                                                type="file"
                                                accept=".pdf,application/pdf"
                                                onChange={(e) =>
                                                    handleFileChange("dokumen_surat_pendaftaran", e, MAX_SIZE_DEFAULT)
                                                }
                                                className="text-xs text-ink file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-surface file:text-ink hover:file:bg-line cursor-pointer"
                                            />
                                            {files.dokumen_surat_pendaftaran && (
                                                <div className="flex items-center justify-between text-[11px] text-brand-800 bg-brand-50 px-2 py-1 rounded">
                                                    <span className="truncate">{files.dokumen_surat_pendaftaran.name}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveFile("dokumen_surat_pendaftaran", "file-surat-pendaftaran")}
                                                        className="text-civic-danger hover:underline ml-1 font-semibold"
                                                    >
                                                        Ganti
                                                    </button>
                                                </div>
                                            )}
                                            {fileErrors.dokumen_surat_pendaftaran && (
                                                <p className="text-[11px] text-civic-danger">
                                                    {fileErrors.dokumen_surat_pendaftaran}
                                                </p>
                                            )}
                                        </div>

                                        {/* 2. Akta Notaris (PERUSAHAAN & YAYASAN) */}
                                        {["PERUSAHAAN", "YAYASAN"].includes(jenisPenerbit) && (
                                            <div className="p-3.5 rounded-xl border border-line bg-surface-subtle flex flex-col justify-between space-y-2">
                                                <div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs font-bold text-ink">
                                                            Akta Notaris & SK Kemenkumham *
                                                        </span>
                                                        <span className="text-[10px] text-ink-muted font-mono">
                                                            Maks 2 MB
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] text-ink-muted mt-0.5">
                                                        Akta pendirian / perubahan terakhir badan hukum.
                                                    </p>
                                                </div>
                                                <input
                                                    id="file-akta-notaris"
                                                    type="file"
                                                    accept=".pdf,application/pdf"
                                                    onChange={(e) =>
                                                        handleFileChange("dokumen_akta_notaris", e, MAX_SIZE_AKTA)
                                                    }
                                                    className="text-xs text-ink file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-surface file:text-ink hover:file:bg-line cursor-pointer"
                                                />
                                                {files.dokumen_akta_notaris && (
                                                    <div className="flex items-center justify-between text-[11px] text-brand-800 bg-brand-50 px-2 py-1 rounded">
                                                        <span className="truncate">{files.dokumen_akta_notaris.name}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveFile("dokumen_akta_notaris", "file-akta-notaris")}
                                                            className="text-civic-danger hover:underline ml-1 font-semibold"
                                                        >
                                                            Ganti
                                                        </button>
                                                    </div>
                                                )}
                                                {fileErrors.dokumen_akta_notaris && (
                                                    <p className="text-[11px] text-civic-danger">
                                                        {fileErrors.dokumen_akta_notaris}
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        {/* 3. Profil Lembaga/Perusahaan (Semua jenis) */}
                                        <div className="p-3.5 rounded-xl border border-line bg-surface-subtle flex flex-col justify-between space-y-2">
                                            <div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-bold text-ink">
                                                        Profil Lembaga / Instansi *
                                                    </span>
                                                    <span className="text-[10px] text-ink-muted font-mono">
                                                        Maks 500 KB
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-ink-muted mt-0.5">
                                                    Company profile atau profil resmi lembaga.
                                                </p>
                                            </div>
                                            <input
                                                id="file-profil"
                                                type="file"
                                                accept=".pdf,application/pdf"
                                                onChange={(e) =>
                                                    handleFileChange("dokumen_profil", e, MAX_SIZE_DEFAULT)
                                                }
                                                className="text-xs text-ink file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-surface file:text-ink hover:file:bg-line cursor-pointer"
                                            />
                                            {files.dokumen_profil && (
                                                <div className="flex items-center justify-between text-[11px] text-brand-800 bg-brand-50 px-2 py-1 rounded">
                                                    <span className="truncate">{files.dokumen_profil.name}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveFile("dokumen_profil", "file-profil")}
                                                        className="text-civic-danger hover:underline ml-1 font-semibold"
                                                    >
                                                        Ganti
                                                    </button>
                                                </div>
                                            )}
                                            {fileErrors.dokumen_profil && (
                                                <p className="text-[11px] text-civic-danger">
                                                    {fileErrors.dokumen_profil}
                                                </p>
                                            )}
                                        </div>

                                        {/* 4. NPWP (Semua jenis) */}
                                        <div className="p-3.5 rounded-xl border border-line bg-surface-subtle flex flex-col justify-between space-y-2">
                                            <div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-bold text-ink">
                                                        Salinan NPWP *
                                                    </span>
                                                    <span className="text-[10px] text-ink-muted font-mono">
                                                        Maks 500 KB
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-ink-muted mt-0.5">
                                                    Pindaian kartu / SKT NPWP badan usaha.
                                                </p>
                                            </div>
                                            <input
                                                id="file-npwp"
                                                type="file"
                                                accept=".pdf,application/pdf"
                                                onChange={(e) =>
                                                    handleFileChange("dokumen_npwp", e, MAX_SIZE_DEFAULT)
                                                }
                                                className="text-xs text-ink file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-surface file:text-ink hover:file:bg-line cursor-pointer"
                                            />
                                            {files.dokumen_npwp && (
                                                <div className="flex items-center justify-between text-[11px] text-brand-800 bg-brand-50 px-2 py-1 rounded">
                                                    <span className="truncate">{files.dokumen_npwp.name}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveFile("dokumen_npwp", "file-npwp")}
                                                        className="text-civic-danger hover:underline ml-1 font-semibold"
                                                    >
                                                        Ganti
                                                    </button>
                                                </div>
                                            )}
                                            {fileErrors.dokumen_npwp && (
                                                <p className="text-[11px] text-civic-danger">
                                                    {fileErrors.dokumen_npwp}
                                                </p>
                                            )}
                                        </div>

                                        {/* 5. NIB (Khusus PERUSAHAAN) */}
                                        {jenisPenerbit === "PERUSAHAAN" && (
                                            <div className="p-3.5 rounded-xl border border-line bg-surface-subtle flex flex-col justify-between space-y-2">
                                                <div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs font-bold text-ink">
                                                            Salinan NIB (OSS) *
                                                        </span>
                                                        <span className="text-[10px] text-ink-muted font-mono">
                                                            Maks 500 KB
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] text-ink-muted mt-0.5">
                                                        Nomor Induk Berusaha resmi dari OSS.
                                                    </p>
                                                </div>
                                                <input
                                                    id="file-nib"
                                                    type="file"
                                                    accept=".pdf,application/pdf"
                                                    onChange={(e) =>
                                                        handleFileChange("dokumen_nib", e, MAX_SIZE_DEFAULT)
                                                    }
                                                    className="text-xs text-ink file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-surface file:text-ink hover:file:bg-line cursor-pointer"
                                                />
                                                {files.dokumen_nib && (
                                                    <div className="flex items-center justify-between text-[11px] text-brand-800 bg-brand-50 px-2 py-1 rounded">
                                                        <span className="truncate">{files.dokumen_nib.name}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveFile("dokumen_nib", "file-nib")}
                                                            className="text-civic-danger hover:underline ml-1 font-semibold"
                                                        >
                                                            Ganti
                                                        </button>
                                                    </div>
                                                )}
                                                {fileErrors.dokumen_nib && (
                                                    <p className="text-[11px] text-civic-danger">
                                                        {fileErrors.dokumen_nib}
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        {/* 6. KTP Penanggung Jawab (Semua jenis) */}
                                        <div className="p-3.5 rounded-xl border border-line bg-surface-subtle flex flex-col justify-between space-y-2">
                                            <div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-bold text-ink">
                                                        KTP Pimpinan / Penanggung Jawab *
                                                    </span>
                                                    <span className="text-[10px] text-ink-muted font-mono">
                                                        Maks 500 KB
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-ink-muted mt-0.5">
                                                    Pindaian KTP jelas pimpinan yang tercatat.
                                                </p>
                                            </div>
                                            <input
                                                id="file-ktp"
                                                type="file"
                                                accept=".pdf,application/pdf"
                                                onChange={(e) =>
                                                    handleFileChange("dokumen_ktp", e, MAX_SIZE_DEFAULT)
                                                }
                                                className="text-xs text-ink file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-surface file:text-ink hover:file:bg-line cursor-pointer"
                                            />
                                            {files.dokumen_ktp && (
                                                <div className="flex items-center justify-between text-[11px] text-brand-800 bg-brand-50 px-2 py-1 rounded">
                                                    <span className="truncate">{files.dokumen_ktp.name}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveFile("dokumen_ktp", "file-ktp")}
                                                        className="text-civic-danger hover:underline ml-1 font-semibold"
                                                    >
                                                        Ganti
                                                    </button>
                                                </div>
                                            )}
                                            {fileErrors.dokumen_ktp && (
                                                <p className="text-[11px] text-civic-danger">
                                                    {fileErrors.dokumen_ktp}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* TOMBOL SUBMIT PENDAFTARAN */}
                                <div className="pt-4 border-t border-line space-y-3">
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="w-full py-3.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-brand-fill hover:bg-brand-fill-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                <span>Mengirimkan Permohonan Pendaftaran...</span>
                                            </>
                                        ) : (
                                            <>
                                                <ShieldCheck className="w-4 h-4" />
                                                <span>Ajukan Pendaftaran Akun Penerbit</span>
                                            </>
                                        )}
                                    </button>

                                    <div className="flex items-center justify-center gap-1.5 text-[11px] text-ink-muted text-center">
                                        <Shield className="w-3.5 h-3.5 text-brand-700" />
                                        <span>Data dan berkas legalitas dienkripsi dan diproses secara aman oleh Sekretariat LPMQ.</span>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </main>

            {/* FOOTER */}
            <footer className="mt-8 border-t border-line bg-surface/50 text-xs text-ink-muted py-6">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p>
                        &copy; 2026 Lajnah Pentashihan Mushaf Al-Qur'an (LPMQ) - Kementerian Agama Republik Indonesia.
                    </p>
                    <div className="flex items-center gap-4">
                        <Link to="/cek-status" className="hover:text-ink transition-colors">
                            Cek Status
                        </Link>
                        <span>&bull;</span>
                        <Link to="/login" className="hover:text-ink transition-colors">
                            Masuk
                        </Link>
                        <span>&bull;</span>
                        <a
                            href="https://tashih.kemenag.go.id/download-materi"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-ink transition-colors inline-flex items-center gap-0.5"
                        >
                            <span>Unduh Materi</span>
                            <ExternalLink className="w-3 h-3" />
                        </a>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default RegisterPublisherPage;
