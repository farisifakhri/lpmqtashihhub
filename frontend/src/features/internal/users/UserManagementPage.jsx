import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { userApi } from '@/api/user.api';
import { Button } from '@/components/ui/Button';
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
  { code: 'ADMIN', label: 'Admin Internal', desc: 'Pengelolaan operasional internal & master data' },
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
        return { label: 'Super Admin', className: 'bg-rose-50 text-rose-700 border-rose-200' };
      case 'ADMIN':
        return { label: 'Admin Internal', className: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
      case 'ADMIN_PENERBIT':
        return { label: 'Penerbit', className: 'bg-primary-50 text-primary-800 border-primary-200' };
      case 'VERIFIKATOR':
        return { label: 'Verifikator', className: 'bg-sky-50 text-sky-700 border-sky-200' };
      case 'DISTRIBUTOR':
        return { label: 'Distributor', className: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'PENTASHIH':
        return { label: 'Pentashih', className: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
      case 'DOKUMENTATOR':
        return { label: 'Dokumentator', className: 'bg-slate-100 text-slate-700 border-slate-200' };
      case 'KEPALA_LPMQ':
        return { label: 'Kepala LPMQ', className: 'bg-yellow-50 text-yellow-800 border-yellow-300' };
      default:
        return { label: roleCode, className: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#083224] via-[#0E5139] to-[#0B3F2D] text-white rounded-2xl p-6 sm:p-8 shadow-xl border border-emerald-800/40">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-700/50 border border-emerald-400/30 text-xs font-semibold tracking-wide text-emerald-200 uppercase">
              <ShieldCheck className="w-3.5 h-3.5" />
              Kontrol Administrator & Hak Akses
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-sans">
              Manajemen Pengguna & Penugasan Peran
            </h1>
            <p className="text-sm sm:text-base text-emerald-100/90 max-w-2xl leading-relaxed">
              Kelola seluruh akun pengguna sistem LPMQ. Super Admin dapat menambahkan akun baru,
              mengedit identitas, menonaktifkan pengguna, serta memberikan multi-role tanpa batas.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={openCreateModal}
              className="bg-white text-emerald-900 hover:bg-emerald-50 shadow-md font-semibold text-xs px-4 py-2.5 inline-flex items-center gap-1.5"
            >
              <UserPlus className="w-4 h-4 text-emerald-700" />
              Tambah Pengguna Baru
            </Button>
          </div>
        </div>
      </div>

      {/* Alert Notices */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-emerald-800 text-xs font-medium">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-rose-800 text-xs font-medium">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter & Toolbar */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full md:max-w-md">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama, email, atau NIP..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
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
              className="text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
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
              className="text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
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
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Nama & Identitas</th>
                <th className="px-5 py-3.5">Email Akun</th>
                <th className="px-5 py-3.5">Peran / Role Sistem</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Terdaftar</th>
                <th className="px-5 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
                    Memuat daftar pengguna...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    Tidak ada data pengguna yang sesuai dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const isSelf = currentUser?.id === user.id;

                  return (
                    <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-900 text-sm">{user.name}</div>
                        {user.nip ? (
                          <div className="text-[11px] text-slate-500 font-mono">NIP: {user.nip}</div>
                        ) : user.publisher ? (
                          <div className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {user.publisher.legal_name}
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-400">Tanpa NIP / Non-PNS</div>
                        )}
                      </td>
                      <td className="px-5 py-4 font-mono text-slate-700">{user.email}</td>
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
                            <span className="text-slate-400 italic">Tidak ada role</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        {user.status === 'ACTIVE' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Aktif
                          </span>
                        )}
                        {user.status === 'INACTIVE' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            Nonaktif
                          </span>
                        )}
                        {user.status === 'SUSPENDED' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            Ditangguhkan
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-slate-500 text-[11px]">
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
                            className="text-xs px-2.5 py-1 text-slate-700 hover:text-emerald-700"
                            title="Edit Data Pengguna"
                          >
                            <Edit2 className="w-3.5 h-3.5 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isSelf}
                            onClick={() => setDeletingUser(user)}
                            className="text-xs px-2.5 py-1 text-rose-600 hover:bg-rose-50 hover:border-rose-300 disabled:opacity-40"
                            title={isSelf ? 'Anda tidak dapat menghapus akun sendiri' : 'Hapus / Nonaktifkan'}
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
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 text-xs">
            <p className="text-slate-600">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Tambah Pengguna Baru</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCreate} className="p-6 space-y-4 text-xs">
              {modalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Nama Lengkap & Gelar *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: Dr. H. Ahmad Fauzan, M.Ag"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Email Akun (Login) *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="nama@lpmq.kemenag.go.id"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">NIP Pegawai (Opsional)</label>
                  <input
                    type="text"
                    value={formData.nip}
                    onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                    placeholder="198502022010011002"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Password Awal *</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Minimal 6 karakter"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Status Akun</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  >
                    <option value="ACTIVE">Aktif (ACTIVE)</option>
                    <option value="INACTIVE">Nonaktif (INACTIVE)</option>
                    <option value="SUSPENDED">Ditangguhkan (SUSPENDED)</option>
                  </select>
                </div>
              </div>

              {/* Multi-Role Selector */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-800">
                    Penugasan Peran (Multi-Role Support) *
                  </label>
                  <button
                    type="button"
                    onClick={handleSelectAllRoles}
                    className="text-[11px] font-semibold text-emerald-700 hover:underline inline-flex items-center gap-1"
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
                            ? 'bg-emerald-50/60 border-emerald-500 shadow-2xs'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleRole(r.code)}
                          className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <div>
                          <div className="font-bold text-slate-800 text-xs">{r.label}</div>
                          <div className="text-[10px] text-slate-500">{r.desc}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Optional Publisher Name if role includes ADMIN_PENERBIT */}
              {formData.roles.includes('ADMIN_PENERBIT') && (
                <div className="space-y-1 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <label className="font-semibold text-slate-700">Nama Penerbit / Badan Hukum</label>
                  <input
                    type="text"
                    value={formData.publisherName}
                    onChange={(e) => setFormData({ ...formData, publisherName: e.target.value })}
                    placeholder="Contoh: PT Mushaf Nusantara Mandiri"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
                  />
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
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
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-800 flex items-center justify-center">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Edit Data Pengguna</h3>
                  <p className="text-[11px] text-slate-500 font-mono">ID: {editingUser.id}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 text-xs">
              {modalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Nama Lengkap & Gelar *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Email Akun (Login) *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">NIP Pegawai</label>
                  <input
                    type="text"
                    value={formData.nip}
                    onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">
                    Reset Password (Opsional)
                  </label>
                  <input
                    type="password"
                    minLength={6}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Kosongkan jika tidak diubah"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Status Akun</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  >
                    <option value="ACTIVE">Aktif (ACTIVE)</option>
                    <option value="INACTIVE">Nonaktif (INACTIVE)</option>
                    <option value="SUSPENDED">Ditangguhkan (SUSPENDED)</option>
                  </select>
                </div>
              </div>

              {/* Multi-Role Selector */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-800">
                    Penugasan Peran (Multi-Role Support) *
                  </label>
                  <button
                    type="button"
                    onClick={handleSelectAllRoles}
                    className="text-[11px] font-semibold text-emerald-700 hover:underline inline-flex items-center gap-1"
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
                            ? 'bg-emerald-50/60 border-emerald-500 shadow-2xs'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleRole(r.code)}
                          className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <div>
                          <div className="font-bold text-slate-800 text-xs">{r.label}</div>
                          <div className="text-[10px] text-slate-500">{r.desc}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {formData.roles.includes('ADMIN_PENERBIT') && (
                <div className="space-y-1 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <label className="font-semibold text-slate-700">Nama Penerbit / Badan Hukum</label>
                  <input
                    type="text"
                    value={formData.publisherName}
                    onChange={(e) => setFormData({ ...formData, publisherName: e.target.value })}
                    placeholder="Contoh: PT Mushaf Nusantara Mandiri"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
                  />
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
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
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">Hapus / Nonaktifkan Pengguna</h3>
              <p className="text-xs text-slate-500">
                Apakah Anda yakin ingin menghapus akun{' '}
                <strong className="text-slate-800 font-semibold">{deletingUser.name}</strong> ({deletingUser.email})?
              </p>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs">
              <p className="font-semibold flex items-center gap-1">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Ketentuan Keamanan Data:
              </p>
              <p className="mt-0.5 text-slate-600">
                Jika akun ini memiliki riwayat transaksi atau audit penugasan, sistem akan
                mengubah statusnya menjadi <strong>TIDAK AKTIF</strong> untuk melindungi integritas hukum.
              </p>
            </div>

            {modalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
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
                className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs"
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

