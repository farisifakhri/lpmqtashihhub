import { ApiError, getAuthToken } from './client';

const base = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '/api/v1';
const errorMessage = async response => {
  const data = await response.json().catch(() => null);
  return data?.message || data?.error?.message || 'Berkas belum dapat diproses. Silakan coba kembali.';
};
export const fileApi = {
  upload: async file => {
    const response = await fetch(`${base}/uploads`, { method: 'POST', headers: { 'Content-Type': file.type, Authorization: `Bearer ${getAuthToken()}` }, body: file });
    if (!response.ok) throw new ApiError(await errorMessage(response), response.status);
    return (await response.json()).data;
  },
  viewPrivateFile: async (id) => {
    const response = await fetch(`${base}/uploads/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${getAuthToken()}` },
    });
    if (!response.ok) throw new ApiError(await errorMessage(response), response.status);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return url;
  },
  downloadPrivateFile: async (id, filename = 'dokumen') => {
    const response = await fetch(`${base}/uploads/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${getAuthToken()}` },
    });
    if (!response.ok) throw new ApiError(await errorMessage(response), response.status);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.replace(/[\\/:*?"<>|]/g, '-');
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
  downloadDocument: async (id, filename = 'Surat-Tanda-Tashih.pdf') => {
    const response = await fetch(`${base}/official-documents/${encodeURIComponent(id)}/pdf`, { headers: { Authorization: `Bearer ${getAuthToken()}` } });
    if (!response.ok) throw new ApiError(await errorMessage(response), response.status);
    if (!response.headers.get('content-type')?.includes('application/pdf')) throw new Error('Server tidak mengembalikan PDF resmi. Silakan hubungi pengelola layanan.');
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement('a');
    link.href = url; link.download = filename.replace(/[\\/:*?"<>|]/g, '-');
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
};
