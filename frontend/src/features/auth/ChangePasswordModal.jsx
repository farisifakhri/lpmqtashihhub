import React, { useState } from 'react';
import { KeyRound, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { authApi } from '@/api/auth.api';

export const ChangePasswordModal = ({ isOpen, onClose }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleClose = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setSuccess('');
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!currentPassword) {
      setError('Kata sandi saat ini wajib diisi.');
      return;
    }

    if (newPassword.length < 8) {
      setError('Kata sandi baru minimal 8 karakter.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Konfirmasi kata sandi baru tidak cocok.');
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setSuccess(res.message || 'Kata sandi berhasil diubah.');
      setTimeout(() => {
        handleClose();
      }, 1800);
    } catch (err) {
      setError(err.message || 'Gagal mengubah kata sandi. Pastikan kata sandi lama benar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Ubah Kata Sandi Akun"
      description="Perbarui kata sandi akun Anda untuk menjaga keamanan akses sistem LPMQ."
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-civic-dangerSoft border border-civic-dangerLine text-civic-danger text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 rounded-xl bg-civic-successSoft border border-civic-successLine text-civic-success text-xs flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        <div className="space-y-1">
          <label htmlFor="current-password" className="block text-xs font-bold text-ink">
            Kata Sandi Saat Ini <span className="text-civic-danger">*</span>
          </label>
          <input
            id="current-password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            className="w-full px-3 py-2 text-xs bg-canvas border border-line-strong rounded-xl outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 text-ink"
            placeholder="Masukkan kata sandi lama"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="change-new-password" className="block text-xs font-bold text-ink">
            Kata Sandi Baru <span className="text-civic-danger">*</span>
          </label>
          <input
            id="change-new-password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            className="w-full px-3 py-2 text-xs bg-canvas border border-line-strong rounded-xl outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 text-ink"
            placeholder="Minimal 8 karakter"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="change-confirm-password" className="block text-xs font-bold text-ink">
            Ulangi Kata Sandi Baru <span className="text-civic-danger">*</span>
          </label>
          <input
            id="change-confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="w-full px-3 py-2 text-xs bg-canvas border border-line-strong rounded-xl outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 text-ink"
            placeholder="Ketik ulang kata sandi baru"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClose}
            disabled={loading}
            className="text-xs"
          >
            Batal
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={loading}
            icon={<KeyRound className="w-3.5 h-3.5" />}
            className="text-xs font-bold"
          >
            {loading ? 'Menyimpan...' : 'Simpan Kata Sandi'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default ChangePasswordModal;

