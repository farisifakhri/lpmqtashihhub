import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { userApi } from '@/api/user.api';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  Users,
  UserPlus,
  Search,
  RefreshCw,
  Edit2,
  Trash2,
  Shield,
  ShieldCheck,
  Building2,
  Key,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  AlertCircle,
  X,
  Sparkles,
  Lock,
  Mail,
  UserCheck,
  Filter,
} from 'lucide-react';

export const ROLE_OPTIONS = [
  { code: 'SUPERADMIN', label: 'Super Admin', desc: 'Akses penuh ke konfigurasi dan seluruh alur' },
  { code: 'HELPER_ADMIN', label: 'Helper Admin', desc: 'Baca pengajuan, pantau progres, dan tetapkan tim pentashih' },
  { code: 'ADMIN_PENERBIT', label: 'Penerbit (Pemohon)', desc: 'Pengajuan naskah dan pemantauan billing' },
  { code: 'VERIFIKATOR', label: 'Verifikator Naskah', desc: 'Pemeriksaan berkas digital dan master fisik' },
  { code: 'DISTRIBUTOR', label: 'Distributor Sidang', desc: 'Penugasan tim pentashih dan tanda terima' },
  { code: 'PENTASHIH', label: 'Pentashih', desc: 'Penelaahan lafazh, ayat, rasm, dan harakat' },
  { code: 'DOKUMENTATOR', label: 'Dokumentator', desc: 'Pemberkasan eksemplar pasca-STT' },
  { code: 'KEPALA_LPMQ', label: 'Kepala LPMQ', desc: 'Nota dinas penugasan dan pengesahan STT' },
];

export const UserManagementPage = () => {
  const { currentUser } = useAuth();

  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState(null);

  // Form State for Create / Edit
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    whatsappNumber: '',
    nip: '',
    password: '',
    status: 'ACTIVE',
    roles: ['VERIFIKATOR'],
    publisherName: '',
  });

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
      };
      if (search.trim()) params.search = search.trim();
      if (roleFilter) params.role = roleFilter;
      if (statusFilter) params.status = statusFilter;

      const res = await userApi.listUsers(params);
      if (res?.data) {
        setUsers(res.data.items || []);
        if (res.data.pagination) setPagination(res.data.pagination);
      }
    } catch (err) {
      setError(err.message || 'Gagal memuat data pengguna.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [pagination.page, roleFilter, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchUsers();
  };

  const openCreateModal = () => {
    setFormData({
      name: '',
      email: '',
      whatsappNumber: '',
      nip: '',
      password: '',
      status: 'ACTIVE',
      roles: ['VERIFIKATOR'],
      publisherName: '',
    });
    setModalError(null);
    setShowCreateModal(true);
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name || '',
      email: user.email || '',
      whatsappNumber: user.whatsapp_number || '',
      nip: user.nip || '',
      password: '', // blank unless resetting
      status: user.status || 'ACTIVE',
      roles: Array.isArray(user.roles) ? [...user.roles] : [],
      publisherName: user.publisher?.legal_name || '',
    });
    setModalError(null);
  };

  const handleToggleRole = (roleCode) => {
    setFormData((prev) => {
      const currentRoles = prev.roles;
      if (currentRoles.includes(roleCode)) {
        if (currentRoles.length === 1) return prev; // keep at least 1 role
        return { ...prev, roles: currentRoles.filter((r) => r !== roleCode) };
      }
      return { ...prev, roles: [...currentRoles, roleCode] };
    });
  };

  const handleSelectAllRoles = () => {
    const allCodes = ROLE_OPTIONS.map((r) => r.code);
    if (formData.roles.length === allCodes.length) {
      setFormData((prev) => ({ ...prev, roles: ['VERIFIKATOR'] }));
    } else {
      setFormData((prev) => ({ ...prev, roles: allCodes }));
    }
  };

  const handleSaveCreate = async (e) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError(null);
    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        whatsapp_number: formData.whatsappNumber.trim() || null,
        password: formData.password,
        nip: formData.nip?.trim() || null,
        status: formData.status,
        roles: formData.roles,
      };
      if (formData.roles.includes('ADMIN_PENERBIT') && formData.publisherName.trim()) {
        payload.publisher = {
          legal_name: formData.publisherName.trim(),
        };
      }
      await userApi.createUser(payload);
      setShowCreateModal(false);
      setSuccessMessage('Pengguna baru berhasil ditambahkan.');
      fetchUsers();
    } catch (err) {
      setModalError(err.message || 'Gagal menambahkan pengguna.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError(null);
    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        whatsapp_number: formData.whatsappNumber.trim() || null,
        nip: formData.nip?.trim() || null,
        status: formData.status,
        roles: formData.roles,
      };
      if (formData.password?.trim()) {
        payload.password = formData.password.trim();
      }
      if (formData.roles.includes('ADMIN_PENERBIT') && formData.publisherName?.trim()) {
        payload.publisher = {
          legal_name: formData.publisherName.trim(),
        };
      }
      await userApi.updateUser(editingUser.id, payload);
      setEditingUser(null);
      setSuccessMessage('Data pengguna berhasil diperbarui.');
      fetchUsers();
    } catch (err) {
      setModalError(err.message || 'Gagal memperbarui pengguna.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingUser) return;
    setModalLoading(true);
    setModalError(null);
    try {
      const res = await userApi.deleteUser(deletingUser.id);
      setDeletingUser(null);
      setSuccessMessage(res?.data?.message || 'Pengguna berhasil dihapus / dinonaktifkan.');
      fetchUsers();
    } catch (err) {
      setModalError(err.message || 'Gagal menghapus pengguna.');
    } finally {
      setModalLoading(false);
    }
  };

  // Helper Badge
  const getRoleBadge = (roleCode) => {
    switch (roleCode) {
      case 'SUPERADMIN':
        return { label: 'Super Admin', className: 'bg-civic-dangerSoft text-civic-danger border-civic-dangerLine' };
      case 'HELPER_ADMIN':
        return { label: 'Helper Admin', className: 'bg-civic-infoSoft text-civic-info border-civic-infoLine' };
      case 'ADMIN_PENERBIT':
        return { label: 'Penerbit', className: 'bg-brand-50 text-brand-800 border-brand-100' };
      case 'VERIFIKATOR':
        return { label: 'Verifikator', className: 'bg-civic-infoSoft text-civic-info border-civic-infoLine' };
      case 'DISTRIBUTOR':
        return { label: 'Distributor', className: 'bg-civic-warningSoft text-civic-warning border-civic-warningLine' };
      case 'PENTASHIH':
        return { label: 'Pentashih', className: 'bg-brand-50 text-brand-800 border-brand-100' };
      case 'DOKUMENTATOR':
        return { label: 'Dokumentator', className: 'bg-surface-subtle text-ink border-line' };
      case 'KEPALA_LPMQ':
        return { label: 'Kepala LPMQ', className: 'bg-civic-warningSoft text-civic-warning border-civic-warningLine' };
      default:
        return { label: roleCode, className: 'bg-surface-subtle text-ink border-line' };
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#083224] via-[#0E5139] to-[#0B3F2D] text-white rounded-2xl p-6 sm:p-8 shadow-xl border border-brand-800/40">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-72 h-72 bg-brand-700/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-700/50 border border-brand-700/30 text-xs font-semibold tracking-wide text-brand-100 uppercase">
              <ShieldCheck className="w-3.5 h-3.5" />
              Kontrol Administrator & Hak Akses
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-sans">
              Manajemen Pengguna & Penugasan Peran
            </h1>
            <p className="text-sm sm:text-base text-brand-100/90 max-w-2xl leading-relaxed">
              Kelola seluruh akun pengguna sistem LPMQ. Super Admin dapat menambahkan akun baru,
              mengedit identitas, menonaktifkan pengguna, serta memberikan multi-role tanpa batas.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={openCreateModal}
              className="bg-white text-brand-900 hover:bg-brand-50 shadow-md font-semibold text-xs px-4 py-2.5 inline-flex items-center gap-1.5"
            >
              <UserPlus className="w-4 h-4 text-brand-700" />
              Tambah Pengguna Baru
            </Button>
          </div>
        </div>
      </div>

      {/* Alert Notices */}
      {successMessage && (
        <div className="p-4 bg-brand-50 border border-brand-100 rounded-xl flex items-center justify-between text-brand-800 text-xs font-medium">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-brand-700 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-ink-muted hover:text-ink-muted">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-civic-dangerSoft border border-civic-dangerLine rounded-xl flex items-center justify-between text-civic-danger text-xs font-medium">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-civic-danger flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-ink-muted hover:text-ink-muted">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter & Toolbar */}
      <div className="bg-white rounded-xl shadow-xs border border-line p-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full md:max-w-md">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama, email, atau NIP..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-line-strong focus:outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700"
              />
            </div>
            <Button type="submit" variant="secondary" className="text-xs px-3 py-2">
              Cari
            </Button>
          </form>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Filter Role */}
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="text-xs px-3 py-2 rounded-lg border border-line-strong bg-white focus:outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700"
            >
              <option value="">Semua Peran (Role)</option>
              {ROLE_OPTIONS.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.label}
                </option>
              ))}
            </select>

            {/* Filter Status */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="text-xs px-3 py-2 rounded-lg border border-line-strong bg-white focus:outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700"
            >
              <option value="">Semua Status</option>
              <option value="ACTIVE">Aktif (ACTIVE)</option>
              <option value="INACTIVE">Nonaktif (INACTIVE)</option>
              <option value="SUSPENDED">Ditangguhkan (SUSPENDED)</option>
            </select>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchUsers}
              disabled={loading}
              className="text-xs py-2"
              title="Segarkan Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-line shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-canvas border-b border-line text-ink-muted uppercase font-semibold tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Nama & Identitas</th>
                <th className="px-5 py-3.5">Email Akun</th>
                <th className="px-5 py-3.5">Peran / Role Sistem</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Terdaftar</th>
                <th className="px-5 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {loading && users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-ink-muted">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-brand-700 mb-2" />
                    Memuat daftar pengguna...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-5">
                    <EmptyState title="Pengguna tidak ditemukan" description="Tidak ada data pengguna yang sesuai dengan filter pencarian." />
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const isSelf = currentUser?.id === user.id;

                  return (
                    <tr key={user.id} className="hover:bg-canvas/70 transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-bold text-ink text-sm">{user.name}</div>
                        {user.nip ? (
                          <div className="text-[11px] text-ink-muted font-mono">NIP: {user.nip}</div>
                        ) : user.publisher ? (
                          <div className="text-[11px] text-brand-700 font-medium flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {user.publisher.legal_name}
                          </div>
                        ) : (
                          <div className="text-[11px] text-ink-muted">Tanpa NIP / Non-PNS</div>
                        )}
                      </td>
                      <td className="px-5 py-4 font-mono text-ink">{user.email}</td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {user.roles && user.roles.length > 0 ? (
                            user.roles.map((rCode) => {
                              const badge = getRoleBadge(rCode);
                              return (
                                <span
                                  key={rCode}
                                  className={`px-2 py-0.5 rounded-md border text-[11px] font-semibold ${badge.className}`}
                                >
                                  {badge.label}
                                </span>
                              );
                            })
                          ) : (
                            <span className="text-ink-muted italic">Tidak ada role</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        {user.status === 'ACTIVE' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-800 border border-brand-100">
                            <span className="w-1.5 h-1.5 rounded-full bg-brand-700" />
                            Aktif
                          </span>
                        )}
                        {user.status === 'INACTIVE' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-surface-subtle text-ink border border-line">
                            <span className="w-1.5 h-1.5 rounded-full bg-line-strong" />
                            Nonaktif
                          </span>
                        )}
                        {user.status === 'SUSPENDED' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-civic-dangerSoft text-civic-danger border border-civic-dangerLine">
                            <span className="w-1.5 h-1.5 rounded-full bg-civic-danger" />
                            Ditangguhkan
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-ink-muted text-[11px]">
                        {new Date(user.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditModal(user)}
                            className="text-xs px-2.5 py-1 text-ink hover:text-brand-700"
                            title="Edit Data Pengguna"
                          >
                            <Edit2 className="w-3.5 h-3.5 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isSelf || user.status === 'INACTIVE'}
                            onClick={() => setDeletingUser(user)}
                            className="text-xs px-2.5 py-1 text-civic-danger hover:bg-civic-dangerSoft hover:border-civic-dangerLine disabled:opacity-40"
                            title={isSelf ? 'Anda tidak dapat menghapus akun sendiri' : user.status === 'INACTIVE' ? 'Akun sudah nonaktif' : 'Hapus / Nonaktifkan'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-line text-xs">
            <p className="text-ink-muted">
              Menampilkan halaman <span className="font-semibold">{pagination.page}</span> dari{' '}
              <span className="font-semibold">{pagination.totalPages}</span> (Total {pagination.total} pengguna)
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                className="text-xs"
              >
                Sebelumnya
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                className="text-xs"
              >
                Selanjutnya
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Tambah Pengguna */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-line max-w-xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-line flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-brand-100 text-brand-800 flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-ink">Tambah Pengguna Baru</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-ink-muted hover:text-ink-muted rounded-lg p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCreate} className="p-6 space-y-4 text-xs">
              {modalError && (
                <div className="p-3 bg-civic-dangerSoft border border-civic-dangerLine rounded-lg text-civic-danger flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="font-semibold text-ink">Nama Lengkap & Gelar *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: Dr. H. Ahmad Fauzan, M.Ag"
                  className="w-full px-3 py-2 rounded-lg border border-line-strong focus:outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-ink">Email Akun (Login) *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="nama@lpmq.kemenag.go.id"
                    className="w-full px-3 py-2 rounded-lg border border-line-strong focus:outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-ink">NIP Pegawai (Opsional)</label>
                  <input
                    type="text"
                    value={formData.nip}
                    onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                    placeholder="198502022010011002"
                    className="w-full px-3 py-2 rounded-lg border border-line-strong focus:outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-ink">WhatsApp Petugas (Opsional, +62...)</label>
                <input type="tel" value={formData.whatsappNumber} onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })} placeholder="Belum diisi / belum diverifikasi" className="w-full px-3 py-2 rounded-lg border border-line-strong" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-ink">Password Awal *</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Minimal 6 karakter"
                    className="w-full px-3 py-2 rounded-lg border border-line-strong focus:outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-ink">Status Akun</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-line-strong bg-white focus:outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700"
                  >
                    <option value="ACTIVE">Aktif (ACTIVE)</option>
                    <option value="INACTIVE">Nonaktif (INACTIVE)</option>
                    <option value="SUSPENDED">Ditangguhkan (SUSPENDED)</option>
                  </select>
                </div>
              </div>

              {/* Multi-Role Selector */}
              <div className="space-y-2 pt-2 border-t border-line">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-ink">
                    Penugasan Peran (Multi-Role Support) *
                  </label>
                  <button
                    type="button"
                    onClick={handleSelectAllRoles}
                    className="text-[11px] font-semibold text-brand-700 hover:underline inline-flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    {formData.roles.length === ROLE_OPTIONS.length
                      ? 'Reset Pilihan'
                      : 'Pilih Semua Role (Akses Penuh)'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ROLE_OPTIONS.map((r) => {
                    const isChecked = formData.roles.includes(r.code);
                    return (
                      <label
                        key={r.code}
                        className={`p-2.5 rounded-lg border flex items-start gap-2.5 cursor-pointer transition-all ${
                          isChecked
                            ? 'bg-brand-50/60 border-brand-700 shadow-2xs'
                            : 'bg-white border-line hover:border-line-strong'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleRole(r.code)}
                          className="mt-0.5 rounded text-brand-700 focus:ring-brand-700"
                        />
                        <div>
                          <div className="font-bold text-ink text-xs">{r.label}</div>
                          <div className="text-[10px] text-ink-muted">{r.desc}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Optional Publisher Name if role includes ADMIN_PENERBIT */}
              {formData.roles.includes('ADMIN_PENERBIT') && (
                <div className="space-y-1 p-3 bg-canvas rounded-lg border border-line">
                  <label className="font-semibold text-ink">Nama Penerbit / Badan Hukum</label>
                  <input
                    type="text"
                    value={formData.publisherName}
                    onChange={(e) => setFormData({ ...formData, publisherName: e.target.value })}
                    placeholder="Contoh: PT Mushaf Nusantara Mandiri"
                    className="w-full px-3 py-1.5 rounded-lg border border-line-strong bg-white"
                  />
                </div>
              )}

              <div className="pt-4 border-t border-line flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                  disabled={modalLoading}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={modalLoading}
                  className="bg-brand-700 hover:bg-brand-800 text-white font-semibold"
                >
                  {modalLoading ? 'Menyimpan...' : 'Simpan Pengguna'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Pengguna */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-line max-w-xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-line flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-civic-infoSoft text-civic-info flex items-center justify-center">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-ink">Edit Data Pengguna</h3>
                  <p className="text-[11px] text-ink-muted font-mono">ID: {editingUser.id}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="text-ink-muted hover:text-ink-muted rounded-lg p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 text-xs">
              {modalError && (
                <div className="p-3 bg-civic-dangerSoft border border-civic-dangerLine rounded-lg text-civic-danger flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="font-semibold text-ink">Nama Lengkap & Gelar *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-line-strong focus:outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-ink">Email Akun (Login) *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-line-strong focus:outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-ink">NIP Pegawai</label>
                  <input
                    type="text"
                    value={formData.nip}
                    onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-line-strong focus:outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-ink">WhatsApp Petugas (Opsional, +62...)</label>
                <input type="tel" value={formData.whatsappNumber} onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })} placeholder="Belum diisi / belum diverifikasi" className="w-full px-3 py-2 rounded-lg border border-line-strong" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-ink">
                    Reset Password (Opsional)
                  </label>
                  <input
                    type="password"
                    minLength={6}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Kosongkan jika tidak diubah"
                    className="w-full px-3 py-2 rounded-lg border border-line-strong focus:outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-ink">Status Akun</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-line-strong bg-white focus:outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700"
                  >
                    <option value="ACTIVE">Aktif (ACTIVE)</option>
                    <option value="INACTIVE">Nonaktif (INACTIVE)</option>
                    <option value="SUSPENDED">Ditangguhkan (SUSPENDED)</option>
                  </select>
                </div>
              </div>

              {/* Multi-Role Selector */}
              <div className="space-y-2 pt-2 border-t border-line">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-ink">
                    Penugasan Peran (Multi-Role Support) *
                  </label>
                  <button
                    type="button"
                    onClick={handleSelectAllRoles}
                    className="text-[11px] font-semibold text-brand-700 hover:underline inline-flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    {formData.roles.length === ROLE_OPTIONS.length
                      ? 'Reset Pilihan'
                      : 'Pilih Semua Role (Akses Penuh)'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ROLE_OPTIONS.map((r) => {
                    const isChecked = formData.roles.includes(r.code);
                    return (
                      <label
                        key={r.code}
                        className={`p-2.5 rounded-lg border flex items-start gap-2.5 cursor-pointer transition-all ${
                          isChecked
                            ? 'bg-brand-50/60 border-brand-700 shadow-2xs'
                            : 'bg-white border-line hover:border-line-strong'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleRole(r.code)}
                          className="mt-0.5 rounded text-brand-700 focus:ring-brand-700"
                        />
                        <div>
                          <div className="font-bold text-ink text-xs">{r.label}</div>
                          <div className="text-[10px] text-ink-muted">{r.desc}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {formData.roles.includes('ADMIN_PENERBIT') && (
                <div className="space-y-1 p-3 bg-canvas rounded-lg border border-line">
                  <label className="font-semibold text-ink">Nama Penerbit / Badan Hukum</label>
                  <input
                    type="text"
                    value={formData.publisherName}
                    onChange={(e) => setFormData({ ...formData, publisherName: e.target.value })}
                    placeholder="Contoh: PT Mushaf Nusantara Mandiri"
                    className="w-full px-3 py-1.5 rounded-lg border border-line-strong bg-white"
                  />
                </div>
              )}

              <div className="pt-4 border-t border-line flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingUser(null)}
                  disabled={modalLoading}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={modalLoading}
                  className="bg-brand-700 hover:bg-brand-800 text-white font-semibold"
                >
                  {modalLoading ? 'Menyimpan...' : 'Perbarui Pengguna'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-line max-w-md w-full p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-civic-dangerSoft text-civic-danger flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-ink">Hapus / Nonaktifkan Pengguna</h3>
              <p className="text-xs text-ink-muted">
                Apakah Anda yakin ingin menghapus akun{' '}
                <strong className="text-ink font-semibold">{deletingUser.name}</strong> ({deletingUser.email})?
              </p>
            </div>

            <div className="p-3 bg-civic-warningSoft border border-civic-warningLine rounded-lg text-civic-warning text-xs">
              <p className="font-semibold flex items-center gap-1">
                <AlertTriangle className="w-4 h-4 text-civic-warning" />
                Ketentuan Keamanan Data:
              </p>
              <p className="mt-0.5 text-ink-muted">
                Jika akun ini memiliki riwayat transaksi atau audit penugasan, sistem akan
                mengubah statusnya menjadi <strong>TIDAK AKTIF</strong> untuk melindungi integritas hukum.
              </p>
            </div>

            {modalError && (
              <div className="p-3 bg-civic-dangerSoft border border-civic-dangerLine rounded-lg text-civic-danger text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setDeletingUser(null)}
                disabled={modalLoading}
                className="text-xs"
              >
                Batal
              </Button>
              <Button
                onClick={handleConfirmDelete}
                disabled={modalLoading}
                className="bg-civic-danger hover:bg-civic-danger text-white font-semibold text-xs"
              >
                {modalLoading ? 'Memproses...' : 'Ya, Hapus / Nonaktifkan'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementPage;

