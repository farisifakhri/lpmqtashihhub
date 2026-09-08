import React, { createContext, useContext, useState } from 'react';

const DEFAULT_USERS_BY_ROLE = {
  PUBLISHER: {
    id: 'usr-pub-01',
    name: 'Ahmad Fauzi',
    email: 'fauzi@penerbitmushaf.co.id',
    role: 'PUBLISHER',
    publisherId: 'pub-01',
    publisherName: 'PT Penerbit Al-Huda Nusantara',
  },
  ADMIN: {
    id: 'usr-adm-01',
    name: 'Siti Rahmawati, S.Kom',
    email: 'admin.lpmq@kemenag.go.id',
    nip: '198805122014022001',
    role: 'ADMIN',
  },
  VERIFICATOR: {
    id: 'usr-ver-01',
    name: 'Drs. H. M. Sholihin, M.Ag',
    email: 'verifikator.lpmq@kemenag.go.id',
    nip: '197509152003121002',
    role: 'VERIFICATOR',
  },
  DISTRIBUTOR: {
    id: 'usr-dis-01',
    name: 'Rahmat Hidayat, M.Si',
    email: 'distributor.lpmq@kemenag.go.id',
    nip: '198203112008011015',
    role: 'DISTRIBUTOR',
  },
  TASHIH_MEMBER: {
    id: 'usr-tsh-01',
    name: 'K.H. Dr. Lukman Hakim, MA',
    email: 'pentashih.lpmq@kemenag.go.id',
    nip: '197108201998031003',
    role: 'TASHIH_MEMBER',
  },
  TASHIH_LEADER: {
    id: 'usr-tsh-ldr-01',
    name: 'Prof. Dr. KH. Muchlis M. Hanafi, MA',
    email: 'ketua.kelompok@kemenag.go.id',
    nip: '196806121995031002',
    role: 'TASHIH_LEADER',
  },
  DOCUMENTATOR: {
    id: 'usr-doc-01',
    name: 'Nurul Aini, S.Sos',
    email: 'dokumentator.lpmq@kemenag.go.id',
    nip: '199011042018012002',
    role: 'DOCUMENTATOR',
  },
  HEAD_OF_LPMQ: {
    id: 'usr-head-01',
    name: 'Dr. H. Abdul Aziz Sidqi, M.Ag',
    email: 'kepala.lpmq@kemenag.go.id',
    nip: '197404102000031001',
    role: 'HEAD_OF_LPMQ',
  },
};

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const [currentRole, setCurrentRole] = useState('PUBLISHER');

  const setRole = (role) => {
    setCurrentRole(role);
  };

  const currentUser = DEFAULT_USERS_BY_ROLE[currentRole];
  const availableRoles = [
    'PUBLISHER',
    'ADMIN',
    'VERIFICATOR',
    'DISTRIBUTOR',
    'TASHIH_LEADER',
    'HEAD_OF_LPMQ',
  ];

  return (
    <AuthContext.Provider value={{ currentUser, setRole, availableRoles }}>
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
