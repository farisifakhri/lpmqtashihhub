import React from "react";
import { useAuth } from "@/features/auth/AuthContext";
import { NavLink, Link, useLocation, useNavigate } from "react-router-dom";
import { useAvatar } from "@/context/AvatarContext";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { AvatarPickerModal } from "@/components/ui/AvatarPickerModal";
import { useSidebarBadges, getBadgeCount, formatBadgeCount } from "./useSidebarBadges";
import {
    LayoutDashboard,
    FilePlus,
    FileText,
    CreditCard,
    Award,
    Users,
    Building2,
    CheckSquare,
    UserCheck,
    BookOpen,
    FolderCheck,
    Settings,
    ShieldCheck,
    CheckCircle2,
    PackageCheck,
    Send,
    HelpCircle,
    User,
    Calendar,
    FileSearch,
    PenTool,
    Clock,
    PanelsTopLeft,
    ClipboardList,
    ChevronRight,
    Circle,
    X,
    Sparkles,
    LogOut,
    RefreshCw,
} from "lucide-react";
import { clsx } from "clsx";
import kemenagLogo from "@/assets/kemenag.png";
import lpmqLogo from "@/assets/lpmq.png";

export const Sidebar = ({ isOpen = true, onClose }) => {
    const { currentUser, logout, switchActiveRole } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { avatarId, setAvatarId } = useAvatar();
    const [avatarPickerOpen, setAvatarPickerOpen] = React.useState(false);
    const [openGroups, setOpenGroups] = React.useState({});
    const badgeCounts = useSidebarBadges(currentUser);

    const handleCycleRole = (e) => {
        e?.stopPropagation?.();
        if (!currentUser?.roles || currentUser.roles.length <= 1) return;
        const currentIdx = currentUser.roles.indexOf(currentUser.role);
        const nextIdx = (currentIdx + 1) % currentUser.roles.length;
        const nextRole = currentUser.roles[nextIdx];
        switchActiveRole(nextRole);
        if (nextRole === "PENERBIT" && !location.pathname.startsWith("/publisher")) {
            navigate("/publisher");
        } else if (nextRole !== "PENERBIT" && location.pathname.startsWith("/publisher")) {
            navigate("/internal");
        }
    };

    const handleLogout = () => {
        logout();
        navigate("/login");
    };
    const role = currentUser?.role || "";
    const roles = currentUser?.roles || [];

    const isPublisher =
        role === "PENERBIT" ||
        role === "PUBLISHER" ||
        roles.includes("PENERBIT");

    const isSuperAdmin = role === "SUPERADMIN" || roles.includes("SUPERADMIN");

    const isAdmin =
        role === "ADMIN_INTERNAL" || roles.includes("ADMIN_INTERNAL");

    const isVerifikator =
        role === "VERIFIKATOR" ||
        role === "VERIFICATOR" ||
        roles.includes("VERIFIKATOR");

    const isDistributor =
        role === "DISTRIBUTOR" || roles.includes("DISTRIBUTOR");

    const isPentashih =
        role === "PENTASHIH" ||
        role === "TASHIH_MEMBER" ||
        roles.includes("PENTASHIH");

    const isDokumentator =
        role === "DOKUMENTATOR" ||
        role === "DOCUMENTATOR" ||
        roles.includes("DOKUMENTATOR");

    const isKepala =
        role === "KEPALA_LPMQ" ||
        role === "HEAD_OF_LPMQ" ||
        roles.includes("KEPALA_LPMQ");

    const getRoleBadge = (userRole) => {
        switch (userRole) {
            case "SUPERADMIN":
                return {
                    label: "Superadmin",
                    badgeClass: "bg-surface-subtle text-ink border-line-strong",
                };
            case "ADMIN_INTERNAL":
                return {
                    label: "Helper Admin",
                    badgeClass: "bg-surface-subtle text-ink border-line-strong",
                };
            case "VERIFIKATOR":
            case "VERIFICATOR":
                return {
                    label: "Verifikator",
                    badgeClass: "bg-brand-50 text-brand-800 border-brand-100",
                };
            case "DISTRIBUTOR":
                return {
                    label: "Distributor",
                    badgeClass: "bg-brand-50 text-brand-800 border-brand-100",
                };
            case "PENTASHIH":
            case "TASHIH_MEMBER":
                return {
                    label: "Pentashih",
                    badgeClass: "bg-brand-50 text-brand-800 border-brand-100",
                };
            case "DOKUMENTATOR":
            case "DOCUMENTATOR":
                return {
                    label: "Dokumentator",
                    badgeClass: "bg-brand-50 text-brand-800 border-brand-100",
                };
            case "KEPALA_LPMQ":
            case "HEAD_OF_LPMQ":
                return {
                    label: "Kepala LPMQ",
                    badgeClass:
                        "bg-civic-warningSoft text-civic-warning border-civic-warningLine",
                };
            case "PENERBIT":
            case "PUBLISHER":
                return {
                    label: "Penerbit",
                    badgeClass: "bg-surface-subtle text-ink border-line-strong",
                };
            default:
                return {
                    label: userRole || "Pengguna",
                    badgeClass: "bg-surface-subtle text-ink border-line-strong",
                };
        }
    };

    const roleBadge = getRoleBadge(role);

    // Navigasi Berbasis Peran sesuai Dokumen Bab 6
    const getNavSections = () => {
        // 1. Portal Penerbit
        if (role === "PENERBIT" || role === "PUBLISHER" || (isPublisher && !role)) {
            return [
                {
                    title: "PORTAL PENERBIT",
                    items: [
                        {
                            label: "Beranda",
                            path: "/publisher",
                            icon: (
                                <LayoutDashboard className="w-4 h-4 shrink-0" />
                            ),
                            end: true,
                        },
                        {
                            label: "Permohonan Saya",
                            path: "/publisher/registrations",
                            badgeKey: "publisher_actions",
                            icon: <FileText className="w-4 h-4 shrink-0" />,
                            description: "Portofolio naskah & riwayat",
                        },
                        {
                            label: "Permohonan Tanda Tashih Baru",
                            path: "/publisher/new-registration",
                            icon: <FilePlus className="w-4 h-4 shrink-0" />,
                            description: "Pendaftaran naskah baru",
                        },
                        {
                            label: "Tagihan",
                            path: "/publisher/billing",
                            badgeKey: "publisher_billing",
                            icon: <CreditCard className="w-4 h-4 shrink-0" />,
                            description: "Billing SIMPONI & bukti bayar",
                        },
                        {
                            label: "Arsip Dokumen",
                            path: "/publisher/documents",
                            icon: <Award className="w-4 h-4 shrink-0" />,
                            description: "Semua versi dokumen",
                        },
                    ],
                },
            ];
        }

        // Role Internal: Verifikator (Diutamakan jika peran aktif adalah Verifikator)
        if (role === "VERIFIKATOR" || role === "VERIFICATOR") {
            return getVerifikatorNav();
        }

        // Role Internal: Admin (Helper Admin - Alur Penuh Tanpa Akses Penerbit & TTE Kepala)
        if (role === "ADMIN_INTERNAL" || (isAdmin && !isSuperAdmin && role !== "VERIFIKATOR" && role !== "DISTRIBUTOR" && role !== "PENTASHIH" && role !== "DOKUMENTATOR" && role !== "KEPALA_LPMQ")) {
            return [
                {
                    title: "KENDALI UTAMA",
                    items: [
                        {
                            label: "Kendali Operasional",
                            path: "/internal",
                            icon: (
                                <LayoutDashboard className="w-4 h-4 shrink-0" />
                            ),
                            end: true,
                        },
                    ],
                },
                {
                    title: "ALUR PENTASHIHAN",
                    items: [
                        {
                            label: "1. Pendaftaran Penerbit",
                            path: "/internal/publishers",
                            badgeKey: "publisher_registrations",
                            icon: <Building2 className="w-4 h-4 shrink-0" />,
                            description: "Verifikasi profil & NIP penerbit",
                        },
                        {
                            label: "2. Intake Master Fisik",
                            path: "/internal/master-intake",
                            badgeKey: "master_intake",
                            icon: <PackageCheck className="w-4 h-4 shrink-0" />,
                            description: "Penerimaan master fisik naskah A4",
                            badge: "Loket",
                        },
                        {
                            label: "3. Penugasan Verifikator",
                            path: "/internal/verifications?tab=NEED_ASSIGNMENT",
                            badgeKey: "verification_need_assignment",
                            icon: <UserCheck className="w-4 h-4 shrink-0" />,
                            description: "Disposisi tim verifikator berkas",
                        },
                        {
                            label: "4. Verifikasi Berkas",
                            path: "/internal/verifications?tab=ASSIGNED",
                            badgeKey: "verification_assigned",
                            icon: <CheckSquare className="w-4 h-4 shrink-0" />,
                            description: "Pemeriksaan rasm, waqaf & kelengkapan",
                        },
                        {
                            label: "5. Hasil Verifikasi",
                            path: "/internal/verifications?tab=WAITING_APPROVAL",
                            badgeKey: "verification_waiting_approval",
                            icon: <FileSearch className="w-4 h-4 shrink-0" />,
                            description: "Telaah draf berita acara & penetapan",
                        },
                        {
                            label: "6. Pembayaran PNBP",
                            path: "/internal/payments",
                            badgeKey: "payments_pending_verification",
                            icon: <CreditCard className="w-4 h-4 shrink-0" />,
                            description: "Billing SIMPONI & validasi bayar",
                        },
                        {
                            label: "7. Distribusi Sidang",
                            path: "/internal/distributions",
                            badgeKey: ["handover_pending", "distribution_waiting"],
                            icon: <Users className="w-4 h-4 shrink-0" />,
                            description: "Pembagian tim & serah-terima naskah",
                        },
                        {
                            label: "8. Sidang Pentashihan (Awal)",
                            path: "/internal/tashih?tab=ACTIVE",
                            badgeKey: "tashih_initial",
                            icon: <BookOpen className="w-4 h-4 shrink-0" />,
                            description: "Koreksi lafazh & harakat Juz 1-30",
                        },
                        {
                            label: "9. Tashih Revisi & Dumi",
                            path: "/internal/tashih?tab=REVISION",
                            badgeKey: "tashih_revision",
                            icon: <PenTool className="w-4 h-4 shrink-0" />,
                            description: "Telaah perbaikan & contoh cetak dumi",
                        },
                        {
                            label: "10. Pengesahan & STT",
                            path: "/internal/documents",
                            badgeKey: "stt_ready",
                            icon: <Award className="w-4 h-4 shrink-0" />,
                            description: "Berita acara & Surat Tanda Tashih",
                        },
                        {
                            label: "11. Pengarsipan Naskah",
                            path: "/internal/archive",
                            icon: <FolderCheck className="w-4 h-4 shrink-0" />,
                            description: "Arsip fisik Posdok-Q & digital",
                        },
                    ],
                },
                {
                    title: "TATA KELOLA SISTEM",
                    items: [
                        {
                            label: "Kelola Landing Page",
                            path: "/internal/landing-page",
                            icon: <PanelsTopLeft className="w-4 h-4 shrink-0" />,
                            description: "Konten dan regulasi landing page",
                        },
                    ],
                },
            ];
        }

        // Role Internal: Kepala LPMQ
        if (isKepala && !isSuperAdmin) {
            return [
                {
                    title: "MANAJEMEN & PENGESAHAN",
                    items: [
                        {
                            label: "Kendali Operasional",
                            path: "/internal",
                            icon: (
                                <LayoutDashboard className="w-4 h-4 shrink-0" />
                            ),
                            end: true,
                        },
                        {
                            label: "Persetujuan Verifikasi",
                            path: "/internal/verifications?tab=WAITING_APPROVAL",
                            badgeKey: "verification_waiting_approval",
                            icon: <CheckSquare className="w-4 h-4 shrink-0" />,
                            description: "Telaah draf hasil verifikasi",
                        },
                        {
                            label: "Tanda Tangan",
                            path: "/internal/signatures",
                            badgeKey: "signatures_pending",
                            icon: <PenTool className="w-4 h-4 shrink-0" />,
                            description: "Tanda tangan digital resmi",
                        },
                        {
                            label: "Penetapan STT",
                            path: "/internal/documents",
                            badgeKey: "stt_ready",
                            icon: <Award className="w-4 h-4 shrink-0" />,
                            description: "Penetapan Surat Tanda Tashih",
                        },
                        {
                            label: "Arsip Dokumen",
                            path: "/internal/archive",
                            icon: <FolderCheck className="w-4 h-4 shrink-0" />,
                            description: "Semua versi untuk Posdok-Q",
                        },
                    ],
                },
            ];
        }

        function getVerifikatorNav() {
            return [
            {
                title: "VERIFIKASI BERKAS & RASM",
                    items: [
                        {
                            label: "Kendali Operasional",
                            path: "/internal",
                            icon: (
                                <LayoutDashboard className="w-4 h-4 shrink-0" />
                            ),
                            end: true,
                        },
                        {
                            label: "Tugas Verifikasi",
                            path: "/internal/verifications",
                            badgeKey: "verification_assigned",
                            icon: <CheckSquare className="w-4 h-4 shrink-0" />,
                            description: "Pemeriksaan naskah & draf",
                        },
                        {
                            label: "Tanda Tangan Saya",
                            path: "/internal/signatures",
                            badgeKey: "signatures_pending",
                            icon: <PenTool className="w-4 h-4 shrink-0" />,
                            description: "Berita acara pemeriksaan",
                        },
                        {
                            label: "Siap Dikirim",
                            path: "/internal/verifications?tab=READY_TO_SEND",
                            badgeKey: "verification_ready_to_send",
                            icon: <Send className="w-4 h-4 shrink-0" />,
                            description: "Kirim surat hasil verifikasi",
                        },
                        {
                            label: "Verifikasi Pembayaran",
                            path: "/internal/payments",
                            badgeKey: "payments_pending_verification",
                            icon: <CreditCard className="w-4 h-4 shrink-0" />,
                            description: "Validasi setoran SIMPONI",
                        },
                        {
                            label: "Siap Serah Terima",
                            path: "/internal/verifications?tab=BAST_READY",
                            badgeKey: "verification_bast_ready",
                            icon: <PackageCheck className="w-4 h-4 shrink-0" />,
                            description: "Pembayaran sah, terbitkan BAST",
                        },
                        {
                            label: "Arsip Dokumen",
                            path: "/internal/archive",
                            icon: <FolderCheck className="w-4 h-4 shrink-0" />,
                            description: "Semua versi untuk Posdok-Q",
                        },
                    ],
                },
            ];
        };

        if (isVerifikator && role === "VERIFIKATOR") {
            return getVerifikatorNav();
        }

        // Role Internal: Distributor
        if (isDistributor && !isSuperAdmin) {
            return [
                {
                    title: "DISTRIBUSI SIDANG",
                    items: [
                        {
                            label: "Kendali Operasional",
                            path: "/internal",
                            icon: (
                                <LayoutDashboard className="w-4 h-4 shrink-0" />
                            ),
                            end: true,
                        },
                        {
                            label: "Master Menunggu Diterima",
                            path: "/internal/distributions?stage=HANDOVER",
                            badgeKey: "handover_pending",
                            icon: <PackageCheck className="w-4 h-4 shrink-0" />,
                            description: "Konfirmasi fisik master",
                        },
                        {
                            label: "Distribusi Tim",
                            path: "/internal/distributions?stage=ASSIGNMENT",
                            badgeKey: "distribution_waiting",
                            icon: <Users className="w-4 h-4 shrink-0" />,
                            description: "Bagi tugas anggota sidang",
                        },
                        {
                            label: "Arsip Dokumen",
                            path: "/internal/archive",
                            icon: <FolderCheck className="w-4 h-4 shrink-0" />,
                            description: "Semua versi untuk Posdok-Q",
                        },
                    ],
                },
            ];
        }

        // Role Internal: Pentashih
        if (isPentashih && !isSuperAdmin) {
            return [
                {
                    title: "SIDANG PENTASHIHAN",
                    items: [
                        {
                            label: "Kendali Operasional",
                            path: "/internal",
                            icon: (
                                <LayoutDashboard className="w-4 h-4 shrink-0" />
                            ),
                            end: true,
                        },
                        {
                            label: "Tugas Saya",
                            path: "/internal/tashih",
                            badgeKey: ["tashih_initial", "tashih_revision"],
                            icon: <BookOpen className="w-4 h-4 shrink-0" />,
                            description: "Koreksi lafaz & tanda baca",
                        },
                        {
                            label: "Arsip Dokumen",
                            path: "/internal/archive",
                            icon: <FolderCheck className="w-4 h-4 shrink-0" />,
                            description: "Semua versi untuk Posdok-Q",
                        },
                    ],
                },
            ];
        }

        if (isDokumentator && !isSuperAdmin) {
            return [
                {
                    title: "DOKUMENTASI",
                    items: [
                        {
                            label: "Kendali Operasional",
                            path: "/internal",
                            icon: (
                                <LayoutDashboard className="w-4 h-4 shrink-0" />
                            ),
                            end: true,
                        },
                        {
                            label: "Arsip Dokumen",
                            path: "/internal/archive",
                            icon: <FolderCheck className="w-4 h-4 shrink-0" />,
                            description: "Semua versi untuk Posdok-Q",
                        },
                        {
                            label: "Dokumen Tashih",
                            path: "/internal/documents",
                            badgeKey: "documentation_pending",
                            icon: <FileText className="w-4 h-4 shrink-0" />,
                        },
                    ],
                },
            ];
        }

        // Role: Superadmin (Akses Penuh & Alur Operasional Panjang 1-11)
        return [
            {
                title: "KENDALI UTAMA",
                items: [
                    {
                        label: "Kendali Operasional",
                        path: "/internal",
                        icon: <LayoutDashboard className="w-4 h-4 shrink-0" />,
                        end: true,
                    },
                ],
            },
            {
                title: "ALUR PENTASHIHAN",
                items: [
                    {
                        label: "1. Pendaftaran Penerbit",
                        path: "/internal/publishers",
                        badgeKey: "publisher_registrations",
                        icon: <Building2 className="w-4 h-4 shrink-0" />,
                        description: "Verifikasi profil & NIP penerbit",
                    },
                    {
                        label: "2. Intake Master Fisik",
                        path: "/internal/master-intake",
                        badgeKey: "master_intake",
                        icon: <PackageCheck className="w-4 h-4 shrink-0" />,
                        description: "Penerimaan master fisik naskah A4",
                        badge: "Loket",
                    },
                    {
                        label: "3. Penugasan Verifikator",
                        path: "/internal/verifications?tab=NEED_ASSIGNMENT",
                        badgeKey: "verification_need_assignment",
                        icon: <UserCheck className="w-4 h-4 shrink-0" />,
                        description: "Disposisi tim verifikator berkas",
                    },
                    {
                        label: "4. Verifikasi Berkas",
                        path: "/internal/verifications?tab=ASSIGNED",
                        badgeKey: "verification_assigned",
                        icon: <CheckSquare className="w-4 h-4 shrink-0" />,
                        description: "Pemeriksaan kelengkapan, rasm & waqaf",
                    },
                    {
                        label: "5. Hasil Verifikasi",
                        path: "/internal/verifications?tab=WAITING_APPROVAL",
                        badgeKey: "verification_waiting_approval",
                        icon: <FileSearch className="w-4 h-4 shrink-0" />,
                        description: "Telaah draf berita acara & penetapan",
                    },
                    {
                        label: "6. Pembayaran PNBP",
                        path: "/internal/payments",
                        badgeKey: "payments_pending_verification",
                        icon: <CreditCard className="w-4 h-4 shrink-0" />,
                        description: "Setoran PNBP SIMPONI & validasi bayar",
                    },
                    {
                        label: "7. Distribusi Sidang",
                        path: "/internal/distributions",
                        badgeKey: ["handover_pending", "distribution_waiting"],
                        icon: <Users className="w-4 h-4 shrink-0" />,
                        description: "Pembagian tim & serah-terima naskah",
                    },
                    {
                        label: "8. Sidang Pentashihan (Awal)",
                        path: "/internal/tashih?tab=ACTIVE",
                        badgeKey: "tashih_initial",
                        icon: <BookOpen className="w-4 h-4 shrink-0" />,
                        description: "Koreksi lafazh & harakat Juz 1-30",
                    },
                    {
                        label: "9. Tashih Revisi & Dumi",
                        path: "/internal/tashih?tab=REVISION",
                        badgeKey: "tashih_revision",
                        icon: <PenTool className="w-4 h-4 shrink-0" />,
                        description: "Telaah perbaikan & contoh cetak dumi",
                    },
                    {
                        label: "10. Pengesahan & Terbit STT",
                        path: "/internal/documents",
                        badgeKey: "stt_ready",
                        icon: <Award className="w-4 h-4 shrink-0" />,
                        description: "Berita acara final & Surat Tanda Tashih",
                    },
                    {
                        label: "11. Pengarsipan Naskah",
                        path: "/internal/archive",
                        icon: <FolderCheck className="w-4 h-4 shrink-0" />,
                        description: "Semua versi fisik & digital Posdok-Q",
                    },
                ],
            },
            {
                title: "TATA KELOLA SISTEM",
                items: [
                    {
                        label: "Identitas dan Akses",
                        path: "/internal/users",
                        icon: <Users className="w-4 h-4 shrink-0" />,
                        description: "Akun, peran, dan wewenang",
                    },
                    {
                        label: "Data Induk dan Parameter",
                        path: "/internal/settings",
                        icon: <Settings className="w-4 h-4 shrink-0" />,
                        description: "Kategori, tarif, dan SLA",
                    },
                    {
                        label: "Rotasi Tim Inti",
                        path: "/internal/core-teams",
                        icon: <Users className="w-4 h-4 shrink-0" />,
                        description: "Roster sembilan tim dan giliran berikutnya",
                    },
                    {
                        label: "Kelola Landing Page",
                        path: "/internal/landing-page",
                        icon: <PanelsTopLeft className="w-4 h-4 shrink-0" />,
                        description: "Konten dan regulasi landing page",
                    },
                    {
                        label: "Survei",
                        icon: <ClipboardList className="w-4 h-4 shrink-0" />,
                        children: [
                            { label: "Nama Survei", path: "/internal/surveys?tab=survei" },
                            { label: "Nama Unsur", path: "/internal/surveys?tab=unsur" },
                            { label: "Pertanyaan Survei", path: "/internal/surveys?tab=pertanyaan" },
                            { label: "Pemilihan Survei", path: "/internal/surveys?tab=pemilihan" },
                            { label: "Jawaban Survei", path: "/internal/surveys?tab=jawaban" },
                            { label: "Responden Survei", path: "/internal/surveys?tab=responden" },
                            { label: "Laporan Survei", path: "/internal/surveys?tab=laporan" },
                        ],
                    },
                ],
            },
            {
                title: "PORTAL PENERBIT (SIMULASI)",
                items: [
                    {
                        label: "Dashboard Penerbit",
                        path: "/publisher",
                        icon: <LayoutDashboard className="w-4 h-4 shrink-0" />,
                        description: "Perspektif pemohon naskah",
                    },
                ],
            },
        ];
    };

    const navSections = getNavSections();
    const isCurrentItem = (item, isActive) => {
        const [itemBase, itemQuery] = item.path.split("?");
        if (location.pathname !== itemBase) return false;

        const currentParams = new URLSearchParams(location.search);

        // Kasus khusus untuk modul Verifikasi
        if (itemBase === "/internal/verifications") {
            const currentTab = currentParams.get("tab") || "NEED_ASSIGNMENT";
            const targetParams = new URLSearchParams(itemQuery || "");
            const targetTab = targetParams.get("tab") || "NEED_ASSIGNMENT";
            return currentTab === targetTab;
        }

        // Kasus khusus untuk modul Sidang Pentashihan
        if (itemBase === "/internal/tashih") {
            const currentTab = currentParams.get("tab") || "ACTIVE";
            const targetParams = new URLSearchParams(itemQuery || "");
            const targetTab = targetParams.get("tab") || "ACTIVE";
            return currentTab === targetTab;
        }

        // Kasus umum jika item memiliki query param
        if (itemQuery) {
            const targetParams = new URLSearchParams(itemQuery);
            for (const [key, val] of targetParams.entries()) {
                if (currentParams.get(key) !== val) return false;
            }
            return true;
        }

        // Jika item tidak memiliki query param tapi halaman saat ini memiliki query param
        if (location.search) {
            return false;
        }

        return isActive;
    };

    // Menu bertingkat (mis. Survei): terbuka otomatis bila salah satu sub-menunya sedang dibuka.
    const renderGroup = (group) => {
        const containsCurrent = group.children.some((child) => location.pathname === child.path.split("?")[0]);
        const open = openGroups[group.label] ?? containsCurrent;
        const panelId = `sidebar-group-${group.label.toLowerCase().replace(/\W+/g, "-")}`;
        return (
            <div key={group.label}>
                <button
                    type="button"
                    aria-expanded={open}
                    aria-controls={panelId}
                    onClick={() => setOpenGroups((prev) => ({ ...prev, [group.label]: !open }))}
                    className={clsx(
                        "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors duration-200 lpmq-sidebar-nav-inactive",
                        containsCurrent && "font-bold",
                    )}
                >
                    <span className={clsx("shrink-0", containsCurrent ? "lpmq-sidebar-nav-icon-active" : "lpmq-sidebar-nav-icon-inactive")}>
                        {group.icon}
                    </span>
                    <span className="flex-1 min-w-0 text-left truncate">{group.label}</span>
                    <ChevronRight className={clsx("w-3.5 h-3.5 shrink-0 transition-transform duration-200 motion-reduce:transition-none", open && "rotate-90")} />
                </button>
                {open && (
                    <div id={panelId} className="mt-0.5 space-y-0.5 pl-4">
                        {group.children.map((child) => (
                            <NavLink
                                key={child.path}
                                to={child.path}
                                onClick={() => {
                                    if (window.innerWidth < 1024 && onClose) onClose();
                                }}
                                className={({ isActive }) =>
                                    clsx(
                                        "flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs transition-colors duration-200",
                                        isCurrentItem(child, isActive) ? "lpmq-sidebar-nav-active font-bold shadow-2xs" : "lpmq-sidebar-nav-inactive",
                                    )
                                }
                            >
                                {({ isActive }) => (
                                    <>
                                        <Circle className={clsx("w-2.5 h-2.5 shrink-0", isCurrentItem(child, isActive) && "fill-current")} />
                                        <span className="truncate">{child.label}</span>
                                    </>
                                )}
                            </NavLink>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <>
            {/* Mobile Backdrop Overlay */}
            <div
                className={clsx(
                    "fixed inset-0 bg-ink/40 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-200 ease-out",
                    isOpen ? "opacity-100" : "opacity-0 pointer-events-none",
                )}
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Sidebar Container (260px, modern civic workspace) */}
            <aside
                className={clsx(
                    "fixed lg:static inset-y-0 left-0 z-50 lg:relative lg:z-10",
                    "w-[264px] shrink-0 overflow-hidden lpmq-sidebar border-r lpmq-sidebar-border-r flex flex-col justify-between",
                    "transition-[width,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] shadow-lg lg:shadow-none",
                    isOpen
                        ? "translate-x-0 lg:w-[264px]"
                        : "-translate-x-full lg:translate-x-0 lg:w-0 lg:border-r-0",
                )}
            >
                <div className="flex h-full w-[264px] min-w-[264px] flex-col overflow-hidden">
                    {/* Header Brand */}
                    <div className="px-4 py-3.5 border-b lpmq-sidebar-header flex items-center justify-between">
                        <Link
                            to={isPublisher ? "/publisher" : "/internal"}
                            className="flex items-center gap-2.5 hover:opacity-95 transition-opacity"
                            onClick={() => {
                                if (window.innerWidth < 1024 && onClose)
                                    onClose();
                            }}
                        >
                            <div className="flex items-center gap-1.5 shrink-0">
                                <div className="w-9 h-9 rounded-lg lpmq-sidebar-logo-box border shadow-2xs flex items-center justify-center p-1">
                                    <img
                                        src={kemenagLogo}
                                        alt="Logo Kemenag"
                                        className="h-full w-auto object-contain"
                                    />
                                </div>
                                <div className="w-8 h-8 rounded-lg lpmq-sidebar-logo-box border shadow-2xs flex items-center justify-center p-0.5">
                                    <img
                                        src={lpmqLogo}
                                        alt="Logo LPMQ"
                                        className="h-full w-auto object-contain rounded"
                                    />
                                </div>
                            </div>
                            <div className="min-w-0">
                                <span className="text-xs font-extrabold tracking-wider uppercase lpmq-sidebar-text block leading-tight">
                                    Kemenag RI
                                </span>
                                <span className="text-xs font-black lpmq-sidebar-text block leading-tight truncate">
                                    Sistem Pentashihan
                                </span>
                            </div>
                        </Link>

                        {/* Close Button on Mobile */}
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1.5 rounded-lg lpmq-sidebar-close-btn lg:hidden"
                            aria-label="Tutup Menu"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Navigation Sections */}
                    <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4">
                        {navSections.map((section, idx) => (
                            <div
                                key={idx}
                                className="space-y-1 pt-3 border-t lpmq-sidebar-section-border first:border-t-0 first:pt-0"
                            >
                                <div className="px-2.5 py-1 text-xs font-extrabold uppercase tracking-wider lpmq-sidebar-section-title">
                                    {section.title}
                                </div>
                                <nav className="space-y-0.5">
                                    {section.items.map((item) => {
                                        if (item.children) return renderGroup(item);
                                        const pendingCount = getBadgeCount(badgeCounts, item.badgeKey);
                                        return (
                                        <NavLink
                                            key={item.path + item.label}
                                            to={item.path}
                                            end={item.end}
                                            title={
                                                pendingCount > 0
                                                    ? `${item.description || item.label} — ${pendingCount} menunggu tindakan`
                                                    : item.description || item.label
                                            }
                                            onClick={() => {
                                                if (
                                                    window.innerWidth < 1024 &&
                                                    onClose
                                                )
                                                    onClose();
                                            }}
                                            className={({ isActive }) =>
                                                clsx(
                                                    "flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-[color,background-color,border-color,box-shadow,transform] duration-200 ease-out group hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:transform-none",
                                                    isCurrentItem(
                                                        item,
                                                        isActive,
                                                    )
                                                        ? "lpmq-sidebar-nav-active font-bold shadow-2xs"
                                                        : "lpmq-sidebar-nav-inactive",
                                                )
                                            }
                                        >
                                            {({ isActive }) => (
                                                <>
                                                    <div
                                                        className={clsx(
                                                            "shrink-0 transition-transform duration-200 ease-out group-hover:scale-105 motion-reduce:transition-none motion-reduce:transform-none",
                                                            isCurrentItem(
                                                                item,
                                                                isActive,
                                                            )
                                                                ? "lpmq-sidebar-nav-icon-active"
                                                                : "lpmq-sidebar-nav-icon-inactive",
                                                        )}
                                                    >
                                                        {item.icon}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <span className="block leading-tight truncate">
                                                            {item.label}
                                                        </span>
                                                        {item.description &&
                                                            !isCurrentItem(
                                                                item,
                                                                isActive,
                                                            ) && (
                                                                <span className="hidden group-hover:block text-[11px] lpmq-sidebar-muted truncate mt-0.5 animate-fadeIn">
                                                                    {
                                                                        item.description
                                                                    }
                                                                </span>
                                                            )}
                                                    </div>
                                                    {pendingCount > 0 ? (
                                                        <span
                                                            data-testid="sidebar-pending-badge"
                                                            className="shrink-0 font-extrabold shadow-2xs flex items-center justify-center transition-all bg-civic-danger text-white rounded-full min-w-[20px] h-5 px-1.5 text-[11px] tabular-nums"
                                                        >
                                                            {formatBadgeCount(pendingCount)}
                                                            <span className="sr-only"> menunggu tindakan</span>
                                                        </span>
                                                    ) : item.badge ? (
                                                        <span className="shrink-0 font-extrabold shadow-2xs flex items-center justify-center transition-all px-2 py-0.5 text-[10px] uppercase rounded-full bg-brand-700 text-white">
                                                            {item.badge}
                                                        </span>
                                                    ) : null}
                                                </>
                                            )}
                                        </NavLink>
                                        );
                                    })}
                                </nav>
                            </div>
                        ))}
                    </div>

                    {/* User Profile Card */}
                    <div className="p-2.5 border-t lpmq-sidebar-footer">
                        <div className="p-2.5 rounded-xl border lpmq-sidebar-footer-card flex items-center justify-between gap-2.5 shadow-2xs">
                            <div className="flex items-center gap-2.5 min-w-0 text-left flex-1">
                                <button
                                    type="button"
                                    onClick={() => setAvatarPickerOpen(true)}
                                    className="cursor-pointer shrink-0"
                                    title="Klik untuk mengganti avatar profil"
                                >
                                    <UserAvatar
                                        avatarId={avatarId}
                                        name={currentUser?.name}
                                        role={role}
                                        size="md"
                                        showRoleBadge
                                    />
                                </button>
                                <div className="min-w-0 flex-1">
                                    <button
                                        type="button"
                                        onClick={() => setAvatarPickerOpen(true)}
                                        className="text-xs font-bold lpmq-sidebar-text truncate hover:text-brand-900 dark:hover:text-brand-300 transition-colors text-left block w-full cursor-pointer"
                                        title="Klik untuk mengganti avatar profil"
                                    >
                                        {currentUser?.name || "Pengguna"}
                                    </button>
                                    <div className="text-[10px] lpmq-sidebar-muted truncate leading-tight flex items-center gap-1.5 mt-0.5">
                                        <span>{roleBadge.label}</span>
                                        {currentUser?.roles && currentUser.roles.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={handleCycleRole}
                                                className="px-1.5 py-0.5 rounded-full text-[9px] font-extrabold bg-brand-100 dark:bg-brand-900/60 text-brand-900 dark:text-brand-200 border border-brand-200 dark:border-brand-800 hover:bg-brand-200 cursor-pointer flex items-center gap-0.5"
                                                title="Klik untuk beralih ke peran berikutnya"
                                            >
                                                <span>Ganti ({currentUser.roles.length})</span>
                                                <RefreshCw className="w-2 h-2" />
                                            </button>
                                        )}
                                        <Sparkles className="w-2.5 h-2.5 text-brand-700 opacity-60" />
                                    </div>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleLogout}
                                className="p-1.5 rounded-lg text-ink-muted hover:text-civic-danger hover:bg-civic-dangerSoft transition-colors shrink-0 cursor-pointer"
                                title="Akhiri Sesi / Keluar"
                                aria-label="Keluar"
                            >
                                <LogOut className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Avatar Picker Modal for Sidebar */}
                    <AvatarPickerModal
                        isOpen={avatarPickerOpen}
                        onClose={() => setAvatarPickerOpen(false)}
                        currentAvatarId={avatarId}
                        onSelectAvatar={setAvatarId}
                        userName={currentUser?.name}
                        userRole={role}
                    />
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
