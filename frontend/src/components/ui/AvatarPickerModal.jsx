import React from 'react';
import { X, Check } from 'lucide-react';
import {
  AVATAR_OPTIONS,
  UserAvatar,
} from './UserAvatar';
import { clsx } from 'clsx';

export function AvatarPickerModal({
  isOpen,
  onClose,
  currentAvatarId,
  onSelectAvatar,
  userName = '',
  userRole = '',
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-surface rounded-2xl border border-line shadow-2xl w-full max-w-lg overflow-hidden animate-scaleUp">
        {/* Header Modal */}
        <div className="px-5 py-4 border-b border-line flex items-center justify-between bg-surface-subtle">
          <div>
            <h3 className="text-base font-bold text-ink">Pilih Avatar Profil Islami</h3>
            <p className="text-xs text-ink-muted">
              Pilih karakter ilustrasi santun & berwibawa khas LPMQ Kemenag RI
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-surface transition-colors cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Pilihan 0: Inisial Bintang Rub el Hizb (Default) */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-2.5">
              Simbol Resmi Al-Qur'an
            </div>
            <button
              type="button"
              onClick={() => {
                onSelectAvatar(null);
                onClose();
              }}
              className={clsx(
                'w-full p-3 rounded-xl border flex items-center gap-3.5 transition-all text-left cursor-pointer',
                !currentAvatarId
                  ? 'border-brand-700 bg-brand-50/50 dark:bg-brand-950/40 shadow-xs'
                  : 'border-line hover:border-line-strong hover:bg-surface-subtle'
              )}
            >
              <UserAvatar avatarId={null} name={userName} role={userRole} size="lg" showRoleBadge />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-ink flex items-center gap-2">
                  Rub el Hizb (۞) Monogram
                  {!currentAvatarId && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-700 text-white font-semibold">
                      Aktif
                    </span>
                  )}
                </div>
                <div className="text-xs text-ink-muted">
                  Bintang 8 sudut penanda mushaf dengan inisial nama Anda
                </div>
              </div>
              {!currentAvatarId && <Check className="w-5 h-5 text-brand-700 shrink-0" />}
            </button>
          </div>

          {/* Bagian Pria */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-2.5">
              Karakter Laki-Laki
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {AVATAR_OPTIONS.filter((opt) => opt.gender === 'male').map((opt) => {
                const isSelected = currentAvatarId === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      onSelectAvatar(opt.id);
                      onClose();
                    }}
                    className={clsx(
                      'p-3 rounded-xl border flex flex-col items-center text-center gap-2 transition-all cursor-pointer group',
                      isSelected
                        ? 'border-brand-700 bg-brand-50/50 dark:bg-brand-950/40 shadow-xs'
                        : 'border-line hover:border-line-strong hover:bg-surface-subtle'
                    )}
                  >
                    <div className="relative">
                      <UserAvatar avatarId={opt.id} name={userName} role={userRole} size="xl" showRoleBadge />
                      {isSelected && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-brand-700 text-white flex items-center justify-center shadow-xs">
                          <Check className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-bold text-ink leading-tight">{opt.label}</div>
                    <div className="text-[11px] text-ink-muted leading-tight">{opt.description}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bagian Wanita */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-2.5">
              Karakter Perempuan
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {AVATAR_OPTIONS.filter((opt) => opt.gender === 'female').map((opt) => {
                const isSelected = currentAvatarId === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      onSelectAvatar(opt.id);
                      onClose();
                    }}
                    className={clsx(
                      'p-3 rounded-xl border flex flex-col items-center text-center gap-2 transition-all cursor-pointer group',
                      isSelected
                        ? 'border-brand-700 bg-brand-50/50 dark:bg-brand-950/40 shadow-xs'
                        : 'border-line hover:border-line-strong hover:bg-surface-subtle'
                    )}
                  >
                    <div className="relative">
                      <UserAvatar avatarId={opt.id} name={userName} role={userRole} size="xl" showRoleBadge />
                      {isSelected && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-brand-700 text-white flex items-center justify-center shadow-xs">
                          <Check className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-bold text-ink leading-tight">{opt.label}</div>
                    <div className="text-[11px] text-ink-muted leading-tight">{opt.description}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Modal */}
        <div className="px-5 py-3 border-t border-line bg-surface-subtle flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold rounded-lg border border-line hover:bg-surface text-ink transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

export default AvatarPickerModal;

