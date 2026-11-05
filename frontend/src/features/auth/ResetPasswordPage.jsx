import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { KeyRound, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { authApi } from '@/api/auth.api';

export const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || searchParams.get('resetToken') || '';
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!token) {
      setError('Token reset tidak ditemukan. Minta tautan pemulihan yang baru.');
      return;
    }
    if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setError('Kata sandi harus minimal 8 karakter dan mengandung huruf kapital serta angka.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    setLoading(true);
    try {
      const result = await authApi.resetPassword({ token, new_password: newPassword });
      setSuccess(result.message || 'Kata sandi berhasil diperbarui. Silakan masuk dengan kata sandi baru.');
      setNewPassword('');
      setConfirmPassword('');
    } catch (requestError) {
      setError(requestError.message || 'Tautan reset tidak valid atau sudah kedaluwarsa.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-canvas flex items-center justify-center p-4">
      <section className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-700/10 text-brand-fg">
          <KeyRound className="h-5 w-5" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-bold text-ink">Atur ulang kata sandi</h1>
        <p className="mt-2 text-sm text-ink-muted">Buat kata sandi baru untuk akun LPMQ Anda.</p>

        {error && (
          <div role="alert" className="mt-5 flex gap-2 rounded-xl border border-civic-dangerLine bg-civic-dangerSoft p-3 text-sm text-civic-danger">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div role="status" className="mt-5 flex gap-2 rounded-xl border border-civic-successLine bg-civic-successSoft p-3 text-sm text-civic-success">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{success}</span>
          </div>
        )}

        {success ? (
          <div className="mt-6 space-y-4">
            <Button type="button" variant="primary" className="w-full" onClick={() => navigate('/login', { replace: true })}>
              Kembali ke Login
            </Button>
          </div>
        ) : token ? (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="new-password" className="mb-1.5 block text-sm font-semibold text-ink">Kata sandi baru</label>
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                required
                className="w-full rounded-lg border border-line-strong bg-canvas px-3 py-2.5 text-sm text-ink outline-none focus:border-brand-700 focus:ring-2 focus:ring-brand-700/20"
              />
              <p className="mt-1 text-xs text-ink-muted">Minimal 8 karakter, satu huruf kapital, dan satu angka.</p>
            </div>
            <div>
              <label htmlFor="confirm-password" className="mb-1.5 block text-sm font-semibold text-ink">Konfirmasi kata sandi</label>
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                className="w-full rounded-lg border border-line-strong bg-canvas px-3 py-2.5 text-sm text-ink outline-none focus:border-brand-700 focus:ring-2 focus:ring-brand-700/20"
              />
            </div>
            <Button type="submit" variant="primary" disabled={loading || Boolean(success)} className="w-full">
              {loading ? 'Menyimpan...' : 'Simpan kata sandi baru'}
            </Button>
          </form>
        ) : (
          <div className="mt-5 space-y-3">
            <p className="text-sm text-ink-muted">Tautan tidak memuat token reset. Minta email pemulihan yang baru.</p>
            <Link to="/login" className="inline-flex font-semibold text-brand-fg hover:underline">Ke halaman login untuk meminta tautan baru</Link>
          </div>
        )}

        <div className="mt-6 border-t border-line pt-4 text-center text-sm">
          <Link to="/login" className="font-semibold text-brand-fg hover:underline">Kembali ke halaman masuk</Link>
        </div>
      </section>
    </main>
  );
};

export default ResetPasswordPage;
