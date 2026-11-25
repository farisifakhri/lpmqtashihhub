import React, { useEffect, useState } from 'react';
import { Mail, KeyRound, AlertCircle, CheckCircle2, ArrowRight, MessageCircle } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { authApi } from '@/api/auth.api';

export const ForgotPasswordModal = ({ isOpen, onClose, initialToken = '' }) => {
  const [step, setStep] = useState(initialToken ? 'RESET' : 'REQUEST'); // 'REQUEST' | 'RESET'
  const [identifier, setIdentifier] = useState('');
  const [method, setMethod] = useState('email');
  const [token, setToken] = useState(initialToken);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!isOpen || !initialToken) return;
    setStep('RESET');
    setToken(initialToken);
    setError('');
    setSuccess('');
  }, [initialToken, isOpen]);

  const handleResetState = () => {
    setStep('REQUEST');
    setIdentifier('');
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

    if (method === 'email' && (!identifier || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier))) {
      setError('Masukkan alamat email yang valid.');
      return;
    }
    if (method === 'whatsapp' && identifier.replace(/\D/g, '').length < 9) {
      setError('Masukkan nomor WhatsApp yang valid.');
      return;
    }

    setLoading(true);
    try {
      const res = method === 'email'
        ? await authApi.forgotPassword(identifier)
        : await authApi.forgotPassword(identifier, method);
      setSuccess(res.message || 'Jika akun terdaftar, petunjuk telah dikirim.');
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
        {success && (
          <div className="space-y-2 animate-fadeIn">
            <div className="p-3.5 rounded-xl bg-civic-successSoft border border-civic-successLine text-civic-success text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
            <p className="text-[11px] text-ink-muted leading-relaxed">
              {method === 'email' ? 'Periksa kotak masuk (inbox) atau folder spam email Anda. ' : 'Periksa WhatsApp pada nomor yang tersimpan di akun Anda. '}
              Jika dalam 10 menit belum menerima petunjuk, silakan{' '}
              <a
                href="https://wa.me/628111997125"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-fg font-semibold hover:underline"
              >
                hubungi Layanan LPMQ via WhatsApp
              </a>.
            </p>
          </div>
        )}

        {step === 'REQUEST' ? (
          <form onSubmit={handleRequestToken} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="forgot-contact" className="block text-xs font-bold text-ink">
                {method === 'email' ? 'Alamat Email Terdaftar' : 'Nomor WhatsApp Terdaftar'} <span className="text-civic-danger">*</span>
              </label>
              <div className="relative">
                <input
                  id="forgot-contact"
                  type={method === 'email' ? 'email' : 'tel'}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={method === 'email' ? 'nama@instansi.go.id atau email penerbit' : '+6281234567890'}
                  required
                  className="w-full pl-9 pr-3.5 py-2.5 text-xs bg-canvas focus:bg-white border border-line-strong rounded-xl outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 transition-all text-ink placeholder:text-ink-muted"
                />
                {method === 'email' ? <Mail className="w-4 h-4 text-ink-muted absolute left-3 top-3 pointer-events-none" /> : <MessageCircle className="w-4 h-4 text-ink-muted absolute left-3 top-3 pointer-events-none" />}
              </div>
              <p className="text-xs text-ink-muted">
                {method === 'email'
                  ? 'Masukkan email yang terdaftar pada akun Anda.'
                  : 'Masukkan nomor WhatsApp yang tersimpan pada akun Anda, misalnya +6281234567890.'}
              </p>
            </div>

            <fieldset className="space-y-2">
              <legend className="block text-xs font-bold text-ink">Kirim kode melalui</legend>
              <div className="grid grid-cols-2 gap-2">
                <label className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-xs ${method === 'email' ? 'border-brand-700 bg-brand-50 text-brand-fg' : 'border-line text-ink-muted'}`}>
                  <input type="radio" name="reset-method" value="email" checked={method === 'email'} onChange={() => setMethod('email')} />
                  <Mail className="h-4 w-4" /> Email
                </label>
                <label className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-xs ${method === 'whatsapp' ? 'border-brand-700 bg-brand-50 text-brand-fg' : 'border-line text-ink-muted'}`}>
                  <input type="radio" name="reset-method" value="whatsapp" checked={method === 'whatsapp'} onChange={() => setMethod('whatsapp')} />
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </label>
              </div>
              <p className="text-xs text-ink-muted">Kode hanya dikirim melalui satu kanal. WhatsApp dikirim ke nomor yang tersimpan pada akun.</p>
            </fieldset>

            {error && (
              <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-civic-dangerLine bg-civic-dangerSoft p-3.5 text-xs text-civic-danger animate-fadeIn">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <div className="flex items-center justify-between pt-2 border-t border-line">
              <button
                type="button"
                onClick={() => setStep('RESET')}
                className="text-xs font-semibold text-brand-fg hover:underline"
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
                Kode Pemulihan <span className="text-civic-danger">*</span>
              </label>
              <input
                id="reset-token"
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 8))}
                placeholder="Masukkan kode 8 digit dari email"
                inputMode="numeric"
                maxLength={8}
                pattern="[0-9]{8}"
                required
                className="w-full px-3 py-2 text-xs font-mono bg-canvas border border-line-strong rounded-xl outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 text-ink"
              />
              <p className="mt-1 text-xs text-ink-muted">Kode berisi 8 digit dan berlaku selama 10 menit.</p>
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

            {error && (
              <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-civic-dangerLine bg-civic-dangerSoft p-3.5 text-xs text-civic-danger animate-fadeIn">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
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

