import { useEffect, useState } from 'react';
import { registrationApi } from '@/api/registration.api';

export function useDistributionQueues(hubStage) {
  const [waitingDistRegistrations, setWaitingDistRegistrations] = useState([]);
  const [inProgressRegistrations, setInProgressRegistrations] = useState([]);
  const [distLoading, setDistLoading] = useState(false);

  const fetchDistributionData = async () => {
    setDistLoading(true);
    try {
      const [waitingRes, progressRes] = await Promise.all([
        registrationApi.listRegistrations({ status: 'WAITING_DISTRIBUTION' }),
        registrationApi.listRegistrations({ status: 'TASHIH_IN_PROGRESS' }),
      ]);
      if (waitingRes?.data) setWaitingDistRegistrations(waitingRes.data);
      if (progressRes?.data) setInProgressRegistrations(progressRes.data);
    } catch {
      // Keep the last successful queue while the operator retries.
    } finally {
      setDistLoading(false);
    }
  };

  useEffect(() => {
    fetchDistributionData();
  }, [hubStage]);

  return { waitingDistRegistrations, inProgressRegistrations, distLoading, fetchDistributionData };
}
