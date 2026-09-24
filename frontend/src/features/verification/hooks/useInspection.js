import { useEffect, useState } from 'react';
import { verificationApi } from '@/api/verification.api';

export function useInspection(id, onLoaded) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await verificationApi.getAssignmentDetail(id);
      if (res?.data) {
        setDetail(res.data);
        await onLoaded(res.data);
      }
    } catch (err) {
      setError(err.message || 'Gagal memuat detail pemeriksaan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  return { detail, loading, error, setError, fetchDetail };
}
