import React, { useState } from 'react';
import { Mail, KeyRound, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { authApi } from '@/api/auth.api';

export const ForgotPasswordModal = ({ isOpen, onClose }) => {
  const [step, setStep] = useState('REQUEST'); // 'REQUEST' | 'RESET'
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleResetState = () => {
    setStep('REQUEST');
    setEmail('');
    setToken('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setSuccess('');
    onClose();
  };

  const handleRequestToken = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Masukkan alamat email yang valid.');
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.forgotPassword(email);
      setSuccess(res.message || 'Instruksi reset kata sandi telah diproses.');
      if (res.resetToken) {
        setToken(res.resetToken);
        setStep('RESET');
      }
    } catch (err) {
      setError(err.message || 'Gagal memproses permohonan pemulihan kata sandi.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!token.trim()) {
      setError('Token reset kata sandi wajib diisi.');
      return;
    }

    if (newPassword.length < 8) {
      setError('Kata sandi baru minimal 8 karakter.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.resetPassword({ token: token.trim(), new_password: newPassword });
      setSuccess(res.message || 'Kata sandi berhasil diperbarui.');
      setTimeout(() => {
        handleResetState();
      }, 2000);
    } catch (err) {
      setError(err.message || 'Gagal mengatur ulang kata sandi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleResetState}
      title="Pemulihan Kata Sandi Akun"
      description="Layanan mandiri pemulihan kata sandi untuk akun penerbit dan petugas internal LPMQ."
      size="md"
    >
      <div className="space-y-4">
        {error && (
          <div className="p-3.5 rounded-xl bg-civic-dangerSoft border border-civic-dangerLine text-civic-danger text-xs flex items-start gap-2.5 animate-fadeIn">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3.5 rounded-xl bg-civic-successSoft border border-civic-successLine text-civic-success text-xs flex items-start gap-2.5 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        {step === 'REQUEST' ? (
          <form onSubmit={handleRequestToken} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="forgot-email" className="block text-xs font-bold text-ink">
                Alamat Email Terdaftar <span className="text-civic-danger">*</span>
              </label>
              <div className="relative">
                <input
                  id="forgot-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@instansi.go.id atau email penerbit"
                  required
                  className="w-full pl-9 pr-3.5 py-2.5 text-xs bg-canvas focus:bg-white border border-line-strong rounded-xl outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 transition-all text-ink placeholder:text-ink-muted"
                />
                <Mail className="w-4 h-4 text-ink-muted absolute left-3 top-3 pointer-events-none" />
              </div>
              <p className="text-xs text-ink-muted">
                Masukkan email yang digunakan saat pendaftaran. Sistem akan memverifikasi dan menyiapkan akses pembaruan sandi.
              </p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-line">
              <button
                type="button"
                onClick={() => setStep('RESET')}
                className="text-xs font-semibold text-brand-700 hover:underline"
              >
                Sudah memiliki token reset?
              </button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={loading}
                icon={<ArrowRight className="w-3.5 h-3.5" />}
                className="text-xs font-bold"
              >
                {loading ? 'Memproses...' : 'Kirim Permohonan'}
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-3.5">
            <div className="space-y-1">
              <label htmlFor="reset-token" className="block text-xs font-bold text-ink">
                Token / Kode Pemulihan <span className="text-civic-danger">*</span>
              </label>
              <input
                id="reset-token"
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Tempelkan token pemulihan di sini"
                required
                className="w-full px-3 py-2 text-xs font-mono bg-canvas border border-line-strong rounded-xl outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 text-ink"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="reset-new-password" className="block text-xs font-bold text-ink">
                Kata Sandi Baru <span className="text-civic-danger">*</span>
              </label>
              <div className="relative">
                <input
                  id="reset-new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimal 8 karakter"
                  required
                  className="w-full pl-9 pr-3.5 py-2 text-xs bg-canvas focus:bg-white border border-line-strong rounded-xl outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 text-ink"
                />
                <KeyRound className="w-4 h-4 text-ink-muted absolute left-3 top-2.5 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="reset-confirm-password" className="block text-xs font-bold text-ink">
                Ulangi Kata Sandi Baru <span className="text-civic-danger">*</span>
              </label>
              <input
                id="reset-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ketik ulang kata sandi baru"
                required
                className="w-full px-3 py-2 text-xs bg-canvas focus:bg-white border border-line-strong rounded-xl outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 text-ink"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-line">
              <button
                type="button"
                onClick={() => setStep('REQUEST')}
                className="text-xs font-semibold text-ink-muted hover:text-ink hover:underline"
              >
                Kembali
              </button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={loading}
                className="text-xs font-bold"
              >
                {loading ? 'Menyimpan...' : 'Perbarui Kata Sandi'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};

export default ForgotPasswordModal;

