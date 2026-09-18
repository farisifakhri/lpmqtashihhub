import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, Unlock, X, Building2, Phone, MapPin, AlertCircle, CheckCircle2, Save } from 'lucide-react';
import { publisherApi } from '@/api/publisher.api';
import { Button } from '@/components/ui/Button';

export const PublisherProfileModal = ({ isOpen, onClose }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    legal_name: '',
    entity_type: 'PT',
    address: '',
    phone: '',
  });

  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    setLoading(true);
    setError('');
    setSuccess('');

    publisherApi
      .getMyProfile()
      .then((res) => {
        if (active && res.data) {
          setProfile(res.data);
          setFormData({
            legal_name: res.data.legal_name || '',
            entity_type: res.data.entity_type || 'PT',
            address: res.data.address || '',
            phone: res.data.phone || '',
          });
        }
      })
      .catch((err) => {
        if (active) setError(err.message || 'Gagal memuat profil penerbit.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const canEdit = Boolean(profile?.profile_edit_allowed);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canEdit) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const res = await publisherApi.updateMyProfile(formData);
      setSuccess('Profil penerbit berhasil diperbarui.');
      setProfile(res.data);
    } catch (err) {
      setError(err.message || 'Gagal memperbarui profil.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Profil Badan Usaha Penerbit</h3>
              <p className="text-[11px] text-slate-500">Informasi identitas hukum penerbit terdaftar</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Banner Status Kunci Profil */}
          {!canEdit ? (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs space-y-1.5 flex items-start gap-3">
              <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Akses Mengubah Data Terkunci</span>
                <p className="text-[11px] leading-relaxed text-amber-800">
                  Profil penerbit dikunci secara permanen untuk menjaga keaslian identitas hukum surat negara. Penerbit tidak diberikan akses mengganti data kecuali telah diberikan izin resmi oleh Kepala LPMQ / Administrator.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs flex items-start gap-3">
              <Unlock className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Akses Ubah Data Dibuka oleh Petinggi</span>
                <p className="text-[11px] text-emerald-800">
                  Izin khusus telah diberikan untuk memperbarui data badan usaha Anda.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{success}</span>
            </div>
          )}

          {loading ? (
            <div className="py-8 text-center text-xs text-slate-500">Memuat profil penerbit…</div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nama Badan Hukum / Penerbit
                </label>
                <input
                  type="text"
                  disabled={!canEdit || saving}
                  value={formData.legal_name}
                  onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-xs focus:ring-2 focus:ring-emerald-700/20 disabled:bg-slate-100 disabled:text-slate-600 disabled:cursor-not-allowed font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Bentuk Usaha</label>
                  <select
                    disabled={!canEdit || saving}
                    value={formData.entity_type}
                    onChange={(e) => setFormData({ ...formData, entity_type: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-xs focus:ring-2 focus:ring-emerald-700/20 disabled:bg-slate-100 disabled:text-slate-600 disabled:cursor-not-allowed"
                  >
                    <option value="PT">PT (Perseroan Terbatas)</option>
                    <option value="CV">CV (Persekutuan Komanditer)</option>
                    <option value="YAYASAN">Yayasan</option>
                    <option value="PERORANGAN">Perorangan</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nomor Telepon / WA</label>
                  <input
                    type="text"
                    disabled={!canEdit || saving}
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-xs focus:ring-2 focus:ring-emerald-700/20 disabled:bg-slate-100 disabled:text-slate-600 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Alamat Kantor Resmi</label>
                <textarea
                  rows={2}
                  disabled={!canEdit || saving}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-xs focus:ring-2 focus:ring-emerald-700/20 disabled:bg-slate-100 disabled:text-slate-600 disabled:cursor-not-allowed"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs">
                  Tutup
                </Button>
                {canEdit && (
                  <Button type="submit" variant="primary" size="sm" disabled={saving} className="text-xs font-bold">
                    <Save className="w-3.5 h-3.5 mr-1" />
                    {saving ? 'Menyimpan…' : 'Simpan Perubahan'}
                  </Button>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default PublisherProfileModal;

