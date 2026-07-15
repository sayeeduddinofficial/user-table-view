import { useState, useEffect } from 'react';
import { env } from '@/lib/env';

interface KPIData {
  runningVMs: {
    today: number;
    last7Days: Array<{ date: string; count: number }>;
  };
  launchedVMs: {
    today: number;
    last7Days: Array<{ date: string; count: number }>;
  };
  totalVMs: {
    today: number;
    last7Days: Array<{ date: string; count: number }>;
  };
  activeUsers: number;
}

export function useKPIData() {
  const [data, setData] = useState<KPIData>({
    runningVMs: { today: 0, last7Days: [] },
    launchedVMs: { today: 0, last7Days: [] },
    totalVMs: { today: 0, last7Days: [] },
    activeUsers: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No authentication token found');
        }

        const API_BASE = env.vmRequest;
        const url = `${API_BASE}/api/leadership-billing/kpi-data`;

        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch KPI data: ${response.statusText}`);
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error('[useKPIData] Error:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch KPI data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  return { data, loading, error };
}
