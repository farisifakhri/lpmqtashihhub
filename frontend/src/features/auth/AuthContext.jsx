import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '@/api/auth.api';
import { setAuthToken, getAuthToken } from '@/api/client';

export const SEED_ACCOUNTS = [
  {
    role: 'ADMIN_PENERBIT',
    label: 'Penerbit Mushaf',
    email: 'penerbit@mushafnusantara.com',
    desc: 'PT Mushaf Nusantara Mandiri (Pemohon)',
    portalPath: '/publisher',
  },
  {
    role: 'SUPERADMIN',
    label: 'Super Admin',
    email: 'admin@lpmq.kemenag.go.id',
    desc: 'Administrator Sistem LPMQ',
    portalPath: '/internal',
  },
  {
    role: 'VERIFIKATOR',
    label: 'Verifikator Naskah',
    email: 'verifikator@lpmq.kemenag.go.id',
    desc: 'Pemeriksa berkas & naskah penanda',
    portalPath: '/internal',
  },
  {
    role: 'DISTRIBUTOR',
    label: 'Distributor Naskah',
    email: 'distributor@lpmq.kemenag.go.id',
    desc: 'Koordinator sidang & penugasan tim',
    portalPath: '/internal',
  },
  {
    role: 'PENTASHIH',
    label: 'Pentashih',
    email: 'pentashih@lpmq.kemenag.go.id',
    desc: 'Anggota pembaca/pentashih lafaz ayat',
    portalPath: '/internal',
  },
  {
    role: 'DOKUMENTATOR',
    label: 'Dokumentator',
    email: 'dokumentator@lpmq.kemenag.go.id',
    desc: 'Pemberkasan eksemplar pasca-STT',
    portalPath: '/internal',
  },
  {
    role: 'KEPALA_LPMQ',
    label: 'Kepala LPMQ',
    email: 'kepala@lpmq.kemenag.go.id',
    desc: 'Penetapan Surat Tanda Tashih & persetujuan',
    portalPath: '/internal',
  },
];

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  // User cache is never an authority for portal access. Only /auth/me or login is.
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setTokenState] = useState(getAuthToken());
  const [isInitializing, setIsInitializing] = useState(Boolean(getAuthToken()));
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState(null);

  // Sync session on mount with /api/v1/auth/me if token exists
  useEffect(() => {
    let cancelled = false;
    const initSession = async () => {
      localStorage.removeItem('lpmq_user');
      const activeToken = getAuthToken();
      if (!activeToken) {
        setIsInitializing(false);
        return;
      }

      try {
        const res = await authApi.getMe();
        if (!cancelled && getAuthToken() === activeToken && res?.data) {
          const u = res.data;
          const userObj = {
            id: u.id,
            name: u.name,
            email: u.email,
            nip: u.nip,
            roles: u.roles || [],
            role: u.roles?.[0] || 'ADMIN_PENERBIT',
            publisherId: u.publisher?.id,
            publisherName: u.publisher?.legal_name,
          };
          setCurrentUser(userObj);
        }
      } catch (err) {
        // Jika token tidak valid / kedaluwarsa (401 / 403), bersihkan sesi lokal
        if (!cancelled && getAuthToken() === activeToken && (err?.status === 401 || err?.status === 403)) {
          console.warn('Sesi tidak valid atau telah kedaluwarsa (401/403). Membersihkan sesi lokal.');
          logout();
        } else if (!cancelled) {
          console.warn('Gagal sinkronisasi sesi dengan server:', err?.message);
        }
      } finally {
        if (!cancelled && getAuthToken() === activeToken) setIsInitializing(false);
      }
    };

    initSession();
    return () => { cancelled = true; };
  }, []);

  const login = async (email, password) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const response = await authApi.login({ email, password });
      if (response.success && response.data) {
        const { token: receivedToken, user: u } = response.data;
        setAuthToken(receivedToken);
        setTokenState(receivedToken);
        setIsInitializing(false);

        const userObj = {
          id: u.id,
          name: u.name,
          email: u.email,
          nip: u.nip,
          roles: u.roles || [],
          role: u.roles?.[0] || 'ADMIN_PENERBIT',
          publisherId: u.publisher?.id || (u.roles?.includes('ADMIN_PENERBIT') ? u.id : null),
          publisherName: u.publisher?.legal_name || (u.roles?.includes('ADMIN_PENERBIT') ? u.name : null),
        };

        setCurrentUser(userObj);
        localStorage.removeItem('lpmq_user');
        return { success: true, user: userObj };
      }
      throw new Error(response.message || 'Login gagal');
    } catch (err) {
      setAuthError(err.message || 'Gagal login ke server');
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  };

  const registerPublisher = async (payload) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const response = await authApi.registerPublisher(payload);
      return response;
    } catch (err) {
      setAuthError(err.message || 'Pendaftaran penerbit gagal');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setAuthToken(null);
    setTokenState(null);
    setIsInitializing(false);
    localStorage.removeItem('lpmq_user');
    setCurrentUser(null);
  };

  // Quick switch role (hanya untuk simulasi development lokal, tidak membuat user mock)
  const setRole = async (targetRole) => {
    if (!import.meta.env.DEV) {
      console.warn('Pergantian role demo dinonaktifkan di luar mode development.');
      return;
    }
    const seed = SEED_ACCOUNTS.find((s) => s.role === targetRole);
    if (seed) {
      try {
        await login(seed.email, 'password123');
      } catch (err) {
        console.error('Gagal berganti ke akun demo:', err.message);
        throw err;
      }
    }
  };

  const availableRoles = [
    'ADMIN_PENERBIT',
    'SUPERADMIN',
    'VERIFIKATOR',
    'DISTRIBUTOR',
    'PENTASHIH',
    'DOKUMENTATOR',
    'KEPALA_LPMQ',
  ];

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        token,
        isAuthenticated: !!currentUser && !isInitializing,
        isInitializing,
        isLoading,
        authError,
        login,
        registerPublisher,
        logout,
        setRole,
        availableRoles,
        seedAccounts: import.meta.env.DEV ? SEED_ACCOUNTS : [],
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
