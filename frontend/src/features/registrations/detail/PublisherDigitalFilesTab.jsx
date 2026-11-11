import React, { useMemo, useState } from "react";
import {
    FileText,
    Eye,
    Download,
    Upload,
    Send,
    PackageCheck,
    CheckCircle2,
    AlertCircle,
    ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { fileApi } from "@/api/file.api";
import {
    SuratPermohonanTemplateModal,
    buildSuratPermohonanDocHtml,
    downloadWordDoc,
} from "../components/SuratPermohonanTemplateModal";

const FILE_TYPES = {
    SURAT_PERMOHONAN: "Surat Permohonan Naskah Tashih",
    COVER: "Sampul / Cover",
    SAMPLE_PAGE_1_5: "Sampel Halaman 1–5",
    DUMMY: "Dumi Perbaikan",
    MASTER_COMPLETED: "Master Lengkap Perbaikan",
    FOREIGN_TASHIH_CERTIFICATE: "Bukti Tashih Lembaga Asal",
};

export function PublisherDigitalFilesTab({
    data,
    editable,
    revision,
    requiredFiles,
    submitError,
    type,
    setType,
    file,
    setFile,
    busy,
    upload,
    onSubmitRegistration,
    setPreviewFile,
    handleTabChange,
}) {
    const [showTemplateModal, setShowTemplateModal] = useState(false);

    let parsedMeta = data?.foreign_metadata || {};
    if (typeof parsedMeta === "string") {
        try {
            parsedMeta = JSON.parse(parsedMeta);
        } catch {
            parsedMeta = {};
        }
    }

    const templateData = {
        namaPenerbit:
            data?.publisher?.legal_name ||
            data?.publisher?.brand_name ||
            data?.publisher?.name ||
            parsedMeta?.nama_penerbit ||
            "........................................",
        idPenerbit:
            data?.publisher?.nip ||
            data?.publisher_id?.slice(0, 8) ||
            "....................",
        namaMushaf:
            data?.title ||
            parsedMeta?.nama_mushaf ||
            "........................................",
        penanggungJawab:
            parsedMeta?.penanggung_jawab_produk ||
            "........................................",
        materi: Array.isArray(parsedMeta?.materi_tambahan)
            ? parsedMeta.materi_tambahan.join(", ")
            : "",
        sizes: parsedMeta?.sizes || [],
        namaPercetakan:
            parsedMeta?.nama_percetakan ||
            "........................................",
        nomorSurat:
            parsedMeta?.nomor_surat_permohonan || "......................",
    };

    const handleDownloadTemplate = () => {
        const docHtml = buildSuratPermohonanDocHtml(templateData);
        const filename = `Format-Surat-Permohonan-Tanda-Tashih-${(data?.title || "Mushaf").replace(/[^a-zA-Z0-9_-]/g, "_")}.doc`;
        downloadWordDoc(filename, docHtml);
    };

    // Filter hanya versi terkini untuk setiap tipe naskah agar tidak muncul berkas ganda (U-08)
    const displayManuscripts = useMemo(() => {
        const list = Array.isArray(data?.manuscript_files)
            ? [...data.manuscript_files]
            : [];
        let metadata = data?.foreign_metadata || {};
        if (typeof metadata === "string") {
            try {
                metadata = JSON.parse(metadata);
            } catch {
                metadata = {};
            }
        }

        const permohonanId =
            data?.surat_permohonan_file_id ||
            metadata?.surat_permohonan_file_id ||
            data?.mushaf_details?.surat_permohonan_file_id;

        // Pastikan dokumen Surat Permohonan Naskah Tashih selalu muncul di daftar Berkas Naskah Digital
        const existingPermohonan = list.find((m) => m.type === "SURAT_PERMOHONAN");
        if (!existingPermohonan) {
            list.unshift({
                id: "surat-permohonan-entry",
                type: "SURAT_PERMOHONAN",
                file_id: permohonanId || null,
                version: 1,
            });
        } else if (!existingPermohonan.file_id && permohonanId) {
            existingPermohonan.file_id = permohonanId;
        }

        const buktiTashihId =
            metadata?.bukti_tashih_file_id ||
            data?.bukti_tashih_file_id ||
            data?.mushaf_details?.bukti_tashih_file_id;
        if (
            buktiTashihId &&
            !list.some((m) => m.type === "FOREIGN_TASHIH_CERTIFICATE")
        ) {
            list.push({
                id: "bukti-tashih-entry",
                type: "FOREIGN_TASHIH_CERTIFICATE",
                file_id: buktiTashihId,
                version: 1,
            });
        }
        const map = new Map();
        list.forEach((item) => {
            const existing = map.get(item.type);
            if (
                !existing ||
                Number(item.version || 0) >= Number(existing.version || 0)
            ) {
                map.set(item.type, item);
            }
        });

        const preferredOrder = [
            "SURAT_PERMOHONAN",
            "COVER",
            "SAMPLE_PAGE_1_5",
            "DUMMY",
            "MASTER_COMPLETED",
            "FOREIGN_TASHIH_CERTIFICATE",
        ];

        const allItems = Array.from(map.values());
        allItems.sort((a, b) => {
            const idxA = preferredOrder.indexOf(a.type);
            const idxB = preferredOrder.indexOf(b.type);
            return (idxA !== -1 ? idxA : 99) - (idxB !== -1 ? idxB : 99);
        });

        return allItems;
    }, [
        data?.manuscript_files,
        data?.foreign_metadata,
        data?.surat_permohonan_file_id,
        data?.mushaf_details,
    ]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-6 items-start">
            {/* Kolom Kiri: Berkas Digital yang Tersimpan */}
            <div className="space-y-6">
                <section className="rounded-2xl border border-line bg-surface p-5 space-y-4 shadow-2xs">
                    <div className="border-b border-line pb-3">
                        <h2 className="font-bold text-ink text-sm flex items-center gap-2">
                            <FileText className="w-4 h-4 text-brand-800" />
                            Berkas naskah digital
                        </h2>
                        <p className="text-xs text-ink-muted mt-0.5 leading-relaxed">
                            Surat permohonan naskah tashih, sampul, dan sampel halaman 1–5
                            yang diverifikasi oleh LPMQ Kemenag RI (PDF, PNG, atau JPEG maksimal 10 MB).
                        </p>
                    </div>

                    {/* Format Baku Surat Permohonan Naskah Tashih Quick Action */}
                    <div className="rounded-xl border border-brand-200 bg-brand-50/60 p-3.5 space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-brand-800 shrink-0" />
                                <span className="text-xs font-bold text-ink">
                                    Format Baku Surat Permohonan Naskah Tashih
                                </span>
                                <span className="text-[10px] font-semibold text-brand-800 bg-brand-100 px-1.5 py-0.5 rounded border border-brand-200">
                                    Resmi Kemenag
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowTemplateModal(true)}
                                    className="inline-flex items-center gap-1 text-xs font-bold text-brand-800 hover:text-brand-900 bg-white px-2.5 py-1.5 rounded-lg border border-brand-200 shadow-2xs hover:bg-brand-50 transition-colors cursor-pointer"
                                >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>Lihat Format</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={handleDownloadTemplate}
                                    className="inline-flex items-center gap-1 text-xs font-semibold text-ink-muted hover:text-ink bg-white px-2.5 py-1.5 rounded-lg border border-line shadow-2xs hover:bg-surface-subtle transition-colors cursor-pointer"
                                    title="Unduh draf format surat permohonan (.doc) Microsoft Word"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>Unduh (.doc)</span>
                                </button>
                            </div>
                        </div>
                        <p className="text-[11px] text-ink-muted leading-relaxed">
                            Format baku resmi surat permohonan tanda tashih dari penerbit yang diajukan ke Kepala LPMQ.
                        </p>
                    </div>

                    {displayManuscripts.length ? (
                        <ul className="space-y-2.5">
                            {displayManuscripts.map((item) => (
                                <li
                                    key={item.id}
                                    className="flex justify-between items-center gap-3 rounded-xl bg-canvas border border-line p-3 text-xs text-ink hover:border-brand-200 transition-colors"
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="w-8 h-8 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center shrink-0">
                                            <FileText className="w-4 h-4 text-brand-700" />
                                        </div>
                                        <div className="min-w-0">
                                            <span className="font-semibold text-ink block truncate">
                                                {FILE_TYPES[item.type] || item.type}
                                            </span>
                                            {item.type === "SURAT_PERMOHONAN" && (
                                                <span className="text-[10px] text-ink-muted block">
                                                    Surat permohonan resmi bertanda tangan pimpinan penerbit
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        {item.file_id ? (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setPreviewFile({
                                                            id: item.file_id,
                                                            name: `${FILE_TYPES[item.type] || item.type}.pdf`,
                                                        })
                                                    }
                                                    className="inline-flex items-center gap-1 text-xs text-brand-800 hover:text-brand-900 font-semibold px-2 py-1 hover:bg-brand-50 rounded-lg cursor-pointer transition-colors"
                                                    title="Lihat Berkas"
                                                >
                                                    <Eye className="w-3.5 h-3.5" />
                                                    <span>Pratinjau</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        fileApi.downloadPrivateFile(
                                                            item.file_id,
                                                            `${(FILE_TYPES[item.type] || item.type).replace(/[^a-zA-Z0-9_-]/g, "_")}-${data?.registration_no || "LPMQ"}.pdf`
                                                        )
                                                    }
                                                    className="inline-flex items-center gap-1 text-xs text-ink-muted hover:text-ink font-semibold px-2 py-1 hover:bg-surface-subtle rounded-lg cursor-pointer transition-colors"
                                                    title="Unduh Berkas"
                                                >
                                                    <Download className="w-3.5 h-3.5" />
                                                    <span>Unduh</span>
                                                </button>
                                            </>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <span className="text-[11px] font-semibold text-civic-warning bg-civic-warningSoft border border-civic-warningLine px-2 py-0.5 rounded-md">
                                                    Belum diunggah
                                                </span>
                                                {item.type === "SURAT_PERMOHONAN" && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowTemplateModal(true)}
                                                        className="inline-flex items-center gap-1 text-xs text-brand-800 hover:text-brand-900 font-semibold px-2 py-1 hover:bg-brand-50 rounded-lg cursor-pointer transition-colors border border-brand-200 bg-white"
                                                        title="Lihat format surat permohonan"
                                                    >
                                                        <FileText className="w-3.5 h-3.5" />
                                                        <span>Format Surat</span>
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="p-6 text-center rounded-xl border border-dashed border-line bg-canvas">
                            <p className="text-xs text-ink-muted">
                                Belum ada berkas naskah digital yang diunggah.
                            </p>
                        </div>
                    )}

                    {/* Form Unggah Tambahan: Hanya muncul saat permohonan dalam tahap perbaikan / revisi (U-07 & U-08) */}
                    {revision ? (
                        <form
                            onSubmit={upload}
                            className="space-y-3.5 border-t border-line pt-4"
                        >
                            <p className="text-xs font-bold text-ink">
                                Unggah Berkas Perbaikan
                            </p>

                            <div>
                                <label
                                    htmlFor="publisher-file-type"
                                    className="block text-xs font-bold text-ink mb-1"
                                >
                                    Jenis berkas
                                </label>
                                <select
                                    id="publisher-file-type"
                                    value={type}
                                    disabled={busy}
                                    onChange={(event) =>
                                        setType(event.target.value)
                                    }
                                    className="w-full rounded-lg border border-line-strong p-2 text-xs bg-canvas font-medium focus:bg-surface focus:ring-2 focus:ring-brand-700/20"
                                >
                                    {Object.entries(FILE_TYPES).map(
                                        ([key, label]) => (
                                            <option key={key} value={key}>
                                                {label}
                                            </option>
                                        ),
                                    )}
                                </select>
                            </div>

                            <div>
                                <label
                                    htmlFor="publisher-manuscript-file"
                                    className="block text-xs font-bold text-ink mb-1"
                                >
                                    Pilih berkas naskah
                                </label>
                                <input
                                    id="publisher-manuscript-file"
                                    type="file"
                                    accept="application/pdf,image/png,image/jpeg"
                                    disabled={busy}
                                    onChange={(event) =>
                                        setFile(event.target.files?.[0] || null)
                                    }
                                    className="w-full text-xs file:rounded-lg file:border-0 file:bg-brand-50 file:p-2 file:text-brand-900 file:font-bold file:mr-3 border border-line rounded-lg bg-canvas"
                                />
                            </div>

                            <Button
                                type="submit"
                                disabled={busy || !file}
                                size="sm"
                                className="text-xs"
                            >
                                <Upload className="h-3.5 w-3.5 mr-1.5" />
                                {busy ? "Memproses…" : "Unggah versi baru"}
                            </Button>
                        </form>
                    ) : (
                        <p className="text-xs text-ink-muted italic pt-1">
                            Berkas digital naskah telah tersimpan resmi dan
                            terkunci selama proses verifikasi berlangsung.
                        </p>
                    )}
                </section>
            </div>

            {/* Kolom Kanan: Panduan Berkas & Langkah Tindak Lanjut */}
            <div className="space-y-6">
                {revision ? (
                    <section className="rounded-2xl border border-line bg-surface p-5 space-y-3.5 shadow-2xs">
                        <h2 className="font-bold text-ink text-sm flex items-center gap-2">
                            <Send className="w-4 h-4 text-brand-800" />
                            Ajukan Ulang Perbaikan
                        </h2>
                        <p className="text-xs text-ink-muted leading-relaxed">
                            Setelah berkas perbaikan diunggah, klik tombol di
                            bawah untuk mengajukan kembali ke tim verifikator
                            LPMQ.
                        </p>
                        {!requiredFiles && (
                            <p className="text-xs text-civic-warning font-semibold bg-civic-warningSoft p-2.5 rounded-lg border border-civic-warningLine">
                                Lengkapi surat permohonan naskah tashih, sampul, dan sampel halaman 1–5 terlebih
                                dahulu.
                            </p>
                        )}
                        {submitError && (
                            <div
                                role="alert"
                                className="flex items-start gap-2 rounded-lg border border-civic-dangerLine bg-civic-dangerSoft p-3 text-xs font-semibold text-civic-danger"
                            >
                                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                                <span>{submitError}</span>
                            </div>
                        )}
                        <Button
                            disabled={busy || !requiredFiles}
                            onClick={onSubmitRegistration}
                            className="text-xs w-full sm:w-auto font-bold"
                        >
                            <Send className="h-3.5 w-3.5 mr-1.5" />
                            Ajukan ulang perbaikan
                        </Button>
                    </section>
                ) : (
                    <section className="rounded-2xl border border-brand-200 bg-brand-50/50 p-5 space-y-3.5 shadow-2xs">
                        <div className="flex items-center gap-2 text-brand-900 font-bold text-sm">
                            <CheckCircle2 className="w-4 h-4 text-brand-700" />
                            <span>Permohonan Terdaftar Resmi</span>
                        </div>
                        <p className="text-xs text-ink-muted leading-relaxed">
                            Seluruh berkas naskah digital awal telah diterima
                            sistem LPMQ. Langkah berikutnya adalah menyerahkan
                            master fisik naskah (30 jilid A4) ke Kantor LPMQ
                            TMII.
                        </p>
                        <div className="pt-1">
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={() => {
                                    handleTabChange("dokumen", "physical");
                                    setTimeout(() => {
                                        const el = document.getElementById(
                                            "section-physical-master",
                                        );
                                        if (el)
                                            el.scrollIntoView({
                                                behavior: "smooth",
                                            });
                                    }, 50);
                                }}
                                className="text-xs font-bold inline-flex items-center gap-1.5"
                            >
                                <span>Lihat Penyerahan Berkas Fisik</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                            </Button>
                        </div>
                    </section>
                )}
            </div>

            {/* Modal Format Baku Surat Permohonan */}
            {showTemplateModal && (
                <SuratPermohonanTemplateModal
                    isOpen={showTemplateModal}
                    onClose={() => setShowTemplateModal(false)}
                    templateData={templateData}
                />
            )}
        </div>
    );
}
