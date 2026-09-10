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
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('lpmq_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [token, setTokenState] = useState(getAuthToken());
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState(null);

  // Sync session on mount with /api/v1/auth/me if token exists
  useEffect(() => {
    const initSession = async () => {
      const activeToken = getAuthToken();
      if (!activeToken) return;

      try {
        const res = await authApi.getMe();
        if (res?.data) {
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
          localStorage.setItem('lpmq_user', JSON.stringify(userObj));
        }
      } catch (err) {
        console.warn('Session check failed or offline, keeping current state:', err.message);
      }
    };

    initSession();
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
        localStorage.setItem('lpmq_user', JSON.stringify(userObj));
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
    localStorage.removeItem('lpmq_user');
    setCurrentUser(null);
  };

  // Quick switch role (untuk simulasi / preset demo langsung)
  const setRole = async (targetRole) => {
    const seed = SEED_ACCOUNTS.find((s) => s.role === targetRole);
    if (seed) {
      // Coba login otomatis via API backend
      try {
        await login(seed.email, 'password123');
      } catch {
        // Fallback jika backend offline / mock mode
        const mockObj = {
          id: `usr-${seed.role.toLowerCase()}`,
          name: seed.label,
          email: seed.email,
          role: seed.role,
          roles: [seed.role],
          publisherName: seed.role === 'ADMIN_PENERBIT' ? 'PT Mushaf Nusantara Mandiri' : null,
          publisherId: seed.role === 'ADMIN_PENERBIT' ? 'pub-01' : null,
        };
        setCurrentUser(mockObj);
        localStorage.setItem('lpmq_user', JSON.stringify(mockObj));
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
        isAuthenticated: !!currentUser,
        isLoading,
        authError,
        login,
        registerPublisher,
        logout,
        setRole,
        availableRoles,
        seedAccounts: SEED_ACCOUNTS,
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
