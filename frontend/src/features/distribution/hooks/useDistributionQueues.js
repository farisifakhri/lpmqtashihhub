import { useEffect, useState } from 'react';
import { registrationApi } from '@/api/registration.api';

export function useDistributionQueues(hubStage) {
  const [waitingDistRegistrations, setWaitingDistRegistrations] = useState([]);
  const [inProgressRegistrations, setInProgressRegistrations] = useState([]);
  const [readyForSttRegistrations, setReadyForSttRegistrations] = useState([]);
  const [distLoading, setDistLoading] = useState(false);

  const fetchDistributionData = async () => {
    setDistLoading(true);
    try {
      const [waitingRes, progressRes, readySttRes, issuedSttRes] = await Promise.all([
        registrationApi.listRegistrations({ status: 'WAITING_DISTRIBUTION' }),
        registrationApi.listRegistrations({ status: 'TASHIH_IN_PROGRESS' }),
        registrationApi.listRegistrations({ status: 'READY_FOR_STT' }),
        registrationApi.listRegistrations({ status: 'STT_ISSUED', limit: 15 }),
      ]);
      if (waitingRes?.data) setWaitingDistRegistrations(Array.isArray(waitingRes.data) ? waitingRes.data : waitingRes.data.items || []);
      if (progressRes?.data) setInProgressRegistrations(Array.isArray(progressRes.data) ? progressRes.data : progressRes.data.items || []);

      const readyItems = Array.isArray(readySttRes?.data) ? readySttRes.data : (readySttRes?.data?.items || []);
      const issuedItems = Array.isArray(issuedSttRes?.data) ? issuedSttRes.data : (issuedSttRes?.data?.items || []);
      const combined = [...readyItems, ...issuedItems];
      const seen = new Set();
      const uniqueStt = combined.filter((item) => {
        if (!item?.id || seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });
      setReadyForSttRegistrations(uniqueStt);
    } catch {
      // Keep the last successful queue while the operator retries.
    } finally {
      setDistLoading(false);
    }
  };

  useEffect(() => {
    fetchDistributionData();
  }, [hubStage]);

  return { waitingDistRegistrations, inProgressRegistrations, readyForSttRegistrations, distLoading, fetchDistributionData };
}
