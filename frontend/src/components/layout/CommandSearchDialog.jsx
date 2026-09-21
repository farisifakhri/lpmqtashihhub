import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import {
  Search,
  FileText,
  CheckSquare,
  CreditCard,
  Award,
  PackageCheck,
  Users,
  Settings,
  X,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { clsx } from 'clsx';

export const CommandSearchDialog = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const role = currentUser?.role || '';
  const roles = currentUser?.roles || [];
  const isPublisher = role === 'ADMIN_PENERBIT' || roles.includes('ADMIN_PENERBIT');
  const isHead = role === 'KEPALA_LPMQ' || roles.includes('KEPALA_LPMQ');
  const isSuperAdmin = role === 'SUPERADMIN' || roles.includes('SUPERADMIN');
  const isVerifikator = role === 'VERIFIKATOR' || roles.includes('VERIFIKATOR');
  const isAdmin = role === 'ADMIN' || roles.includes('ADMIN');
  const isDistributor = role === 'DISTRIBUTOR' || roles.includes('DISTRIBUTOR');

  // Build searchable items based on user role
  const allCommands = isPublisher
    ? [
        { label: 'Beranda Penerbit', desc: 'Kembali ke ringkasan tugas & proses aktif', path: '/publisher', icon: FileText, category: 'Navigasi' },
        { label: 'Buat Pengajuan Naskah Baru', desc: 'Daftarkan naskah mushaf baru ke LPMQ', path: '/publisher/new-registration', icon: Sparkles, category: 'Aksi Cepat' },
        { label: 'Portofolio Pengajuan Saya', desc: 'Pantau status dan tindak lanjuti perbaikan naskah', path: '/publisher/registrations', icon: FileText, category: 'Navigasi' },
        { label: 'Tagihan PNBP & Kode Billing', desc: 'Periksa billing SIMPONI dan unggah bukti bayar', path: '/publisher/billing', icon: CreditCard, category: 'Keuangan' },
        { label: 'Dokumen Resmi & Surat Tanda Tashih', desc: 'Unduh dokumen STT yang telah disahkan', path: '/publisher/documents', icon: Award, category: 'Dokumen' },
      ]
    : [
        { label: 'Pusat Kendali Operasional', desc: 'Dashboard ringkasan tugas hari ini', path: '/internal', icon: FileText, category: 'Navigasi' },
        ...(isHead || isSuperAdmin
          ? [
              { label: 'Penugasan Verifikator', desc: 'Terbitkan Nota Dinas & penugasan verifikator', path: '/internal/verifications?tab=NEED_ASSIGNMENT', icon: CheckSquare, category: 'Kepala LPMQ' },
              { label: 'Persetujuan Draf Verifikasi', desc: 'Tinjau hasil verifikasi berkas & rasm', path: '/internal/verifications?tab=WAITING_APPROVAL', icon: CheckSquare, category: 'Kepala LPMQ' },
              { label: 'Pusat Tanda Tangan Resmi', desc: 'Tandatangani Surat Pemberitahuan & Berita Acara', path: '/internal/signatures', icon: Award, category: 'Kepala LPMQ' },
            ]
          : []),
        ...(isVerifikator || isSuperAdmin
          ? [
              { label: 'Tugas Verifikasi Naskah', desc: 'Periksa kelengkapan berkas & rasm usmani', path: '/internal/verifications', icon: CheckSquare, category: 'Verifikator' },
              { label: 'Verifikasi Pembayaran PNBP', desc: 'Sahkan setoran SIMPONI penerbit', path: '/internal/payments', icon: CreditCard, category: 'Verifikator' },
              { label: 'Tanda Tangan Saya', desc: 'Daftar dokumen menunggu tanda tangan Anda', path: '/internal/signatures', icon: Award, category: 'Verifikator' },
            ]
          : []),
        ...(isAdmin || isSuperAdmin
          ? [
              { label: 'Intake Master Fisik Loket', desc: 'Pencocokan print-out master A4 di loket LPMQ', path: '/internal/master-intake', icon: PackageCheck, category: 'Admin Loket' },
            ]
          : []),
        ...(isDistributor || isSuperAdmin
          ? [
              { label: 'Serah-Terima Master & Distribusi', desc: 'Konfirmasi fisik dan bagi tugas tim sidang', path: '/internal/distributions', icon: Users, category: 'Distributor' },
            ]
          : []),
        ...(isSuperAdmin
          ? [
              { label: 'Konfigurasi Parameter & Layanan', desc: 'Tarif, SLA, kategori mushaf, dan layanan tambahan', path: '/internal/settings', icon: Settings, category: 'Tata Kelola' },
              { label: 'Manajemen Pengguna & Peran', desc: 'Kelola akun internal dan wewenang pengguna', path: '/internal/users', icon: Users, category: 'Tata Kelola' },
            ]
          : []),
      ];

  const filteredCommands = allCommands.filter((cmd) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      cmd.label.toLowerCase().includes(q) ||
      cmd.desc.toLowerCase().includes(q) ||
      cmd.category.toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleSelect = (item) => {
    if (!item) return;
    onClose();
    navigate(item.path);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        handleSelect(filteredCommands[selectedIndex]);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Pencarian Global dan Perintah Cepat"
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 bg-ink/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl bg-surface rounded-2xl shadow-2xl border border-line overflow-hidden animate-slideUp"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-line bg-surface">
          <Search className="w-5 h-5 text-ink-muted mr-3 shrink-0" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ketik perintah, nomor registrasi, atau nama modul..."
            className="w-full bg-transparent text-sm text-ink placeholder:text-ink-muted/70 outline-none"
            aria-label="Cari perintah atau halaman"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 text-ink-muted hover:text-ink mr-2"
              aria-label="Hapus kata kunci"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[11px] font-mono text-ink-muted bg-surface-subtle border border-line rounded">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div ref={listRef} className="max-h-80 overflow-y-auto p-2 space-y-1" role="listbox">
          {filteredCommands.length === 0 ? (
            <div className="py-8 text-center text-xs text-ink-muted">
              Tidak ada perintah atau halaman yang cocok dengan "{query}".
            </div>
          ) : (
            filteredCommands.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.path + item.label}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={clsx(
                    'flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors',
                    isSelected
                      ? 'bg-brand-50 border border-brand-100 text-brand-950'
                      : 'hover:bg-surface-subtle text-ink'
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={clsx(
                        'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border',
                        isSelected
                          ? 'bg-brand-700 text-white border-brand-800'
                          : 'bg-surface-subtle text-ink-muted border-line'
                      )}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold truncate">{item.label}</span>
                        <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-surface-subtle text-ink-muted border border-line/60">
                          {item.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-ink-muted truncate mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                  <ArrowRight
                    className={clsx(
                      'w-4 h-4 ml-2 shrink-0 transition-opacity',
                      isSelected ? 'text-brand-700 opacity-100' : 'opacity-0'
                    )}
                  />
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 border-t border-line bg-surface-subtle/60 text-[11px] text-ink-muted flex items-center justify-between">
          <span>Gunakan panah ↑↓ untuk navigasi, Enter untuk memilih</span>
          <span className="font-mono">Pencarian Cepat</span>
        </div>
      </div>
    </div>
  );
};

export default CommandSearchDialog;

