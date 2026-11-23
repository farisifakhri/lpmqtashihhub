import { useEffect, useRef, useState } from 'react';
import { tashihApi } from '@/api/tashih.api';

export function useAssignments(activeTab, page) {
  const [assignments, setAssignments] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const requestId = useRef(0);

  const fetchAssignments = async () => {
    const request = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit: 100 };
      if (activeTab && activeTab !== 'ALL') {
        params.status = activeTab;
      }
      const res = await tashihApi.getMyAssignments(params);
      const items = Array.isArray(res?.data) ? res.data : [];
      if (request !== requestId.current) return;
      setAssignments(items);
      setHasMore(items.length === 100);
    } catch (err) {
      if (request === requestId.current) {
        setError(err.message || 'Gagal memuat tugas sidang pentashihan.');
        setHasMore(false);
      }
    } finally {
      if (request === requestId.current) setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
    return () => { requestId.current += 1; };
  }, [activeTab, page]);

  return { assignments, hasMore, loading, error, fetchAssignments };
}
