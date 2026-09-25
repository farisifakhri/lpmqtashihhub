import React, { useEffect, useState } from 'react';
import apiClient from '@/api/client';
import { userApi } from '@/api/user.api';

const fields = [
  ['verifier_id', 'VERIFIKATOR', 'Verifikator'],
  ['distributor_id', 'DISTRIBUTOR', 'Distributor'],
  ['documenter_id', 'DOKUMENTATOR', 'Dokumentator'],
];
const emptyTeams = () => Array.from({ length: 9 }, (_, index) => ({
  team_number: index + 1, verifier_id: '', distributor_id: '', documenter_id: '',
}));

export function CoreTeamPage() {
  const [config, setConfig] = useState(null);
  const [teams, setTeams] = useState(emptyTeams);
  const [users, setUsers] = useState({});
  const [nextNumber, setNextNumber] = useState(1);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const reload = async () => {
    const response = await apiClient('/core-teams');
    setConfig(response.data);
    setNextNumber(response.data.next_team_number);
    if (response.data.rosters?.length === 9) {
      setTeams(response.data.rosters.map(row => ({
        team_number: row.team_number,
        verifier_id: row.verifier_id,
        distributor_id: row.distributor_id,
        documenter_id: row.documenter_id,
      })));
    }
  };

  useEffect(() => {
    Promise.all([
      reload(),
      ...fields.map(async ([, role]) => {
        const result = await userApi.listUsers({ role, status: 'ACTIVE', limit: 100 });
        return [role, result.data.items || []];
      }),
    ]).then(([, ...lists]) => setUsers(Object.fromEntries(lists)))
      .catch(err => setError(err.message || 'Gagal memuat pengaturan tim.'));
  }, []);

  const updateTeam = (index, field, value) => setTeams(current => current.map((team, i) =>
    i === index ? { ...team, [field]: value } : team));

  const save = async (path, body) => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await apiClient(path, { method: 'PUT', body });
      await reload();
      setReason('');
      setMessage('Perubahan tim inti berhasil disimpan dan diaudit.');
    } catch (err) {
      setError(err.message || 'Gagal menyimpan perubahan.');
    } finally { setBusy(false); }
  };

  return <main className="max-w-6xl mx-auto p-6 space-y-6">
    <div>
      <h1 className="text-2xl font-bold">Rotasi tim inti</h1>
      <p className="text-sm text-ink-muted">Tim baru berlaku untuk pengajuan berikutnya. Tim yang sudah melekat pada pengajuan tetap sama.</p>
    </div>
    {error && <p role="alert" className="text-civic-danger">{error}</p>}
    {message && <p role="status" className="text-brand-700">{message}</p>}
    <section className="border rounded-xl p-4 space-y-3">
      <h2 className="font-semibold">Nomor tim berikutnya</h2>
      <p className="text-sm">Versi roster: {config?.active_version || '—'} · Nomor saat ini: {config?.next_team_number || '—'}</p>
      <div className="flex gap-3 items-center">
        <select aria-label="Nomor tim berikutnya" value={nextNumber} onChange={event => setNextNumber(Number(event.target.value))} className="border rounded p-2">
          {Array.from({ length: 9 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}
        </select>
        <button type="button" disabled={busy || !config || reason.trim().length < 5} onClick={() => save('/core-teams/next', { next_team_number: nextNumber, reason: reason.trim() })} className="bg-brand-700 text-white rounded px-4 py-2 disabled:opacity-50">Simpan nomor</button>
      </div>
    </section>
    <section className="border rounded-xl p-4 space-y-3">
      <h2 className="font-semibold">Sembilan tim inti</h2>
      <p className="text-sm text-ink-muted">Cocokkan setiap nama pada daftar tim resmi dengan akun aktif. Menyimpan membuat versi roster baru.</p>
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr><th className="text-left p-2">Tim</th>{fields.map(([, , label]) => <th key={label} className="text-left p-2">{label}</th>)}</tr></thead>
        <tbody>{teams.map((team, index) => <tr key={team.team_number} className="border-t"><td className="p-2">{team.team_number}</td>{fields.map(([field, role, label]) =>
          <td key={field} className="p-2"><select aria-label={`${label} tim ${team.team_number}`} value={team[field]} onChange={event => updateTeam(index, field, event.target.value)} className="border rounded p-2 w-full min-w-44"><option value="">Pilih akun aktif</option>{(users[role] || []).map(account => <option key={account.id} value={account.id}>{account.name}</option>)}</select></td>
        )}</tr>)}</tbody></table></div>
      <label className="block text-sm font-medium">Alasan perubahan
        <textarea value={reason} onChange={event => setReason(event.target.value)} maxLength={1000} className="block border rounded p-2 w-full mt-1" />
      </label>
      <button type="button" disabled={busy || reason.trim().length < 5 || teams.some(team => fields.some(([field]) => !team[field]))} onClick={() => save('/core-teams/roster', { teams, reason: reason.trim() })} className="bg-brand-700 text-white rounded px-4 py-2 disabled:opacity-50">Simpan versi roster</button>
    </section>
  </main>;
}

export default CoreTeamPage;
