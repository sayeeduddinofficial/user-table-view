import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { env } from '@/lib/env';

interface UnifiedDashboardData {
  costTrend: Array<{
    date: string;
    cost: number;
  }>;
  usageTrends: Array<{
    date: string;
    active_count: number;
    created_count: number;
    terminated_count: number;
  }>;
  activeVMs: Array<{
    date: string;
    active_count: number;
  }>;
  operations: Array<{
    date: string;
    started_count: number;
    stopped_count: number;
  }>;
  costByUser: Array<{
    user_id: number;
    user_email: string;
    user_name: string;
    total_cost: number;
  }>;
  costByRegion: Array<{
    region: string;
    total_cost: number;
  }>;
  costByInstanceType: Array<{
    instance_type: string;
    total_cost: number;
  }>;
  serviceCostTrend: Array<{
  month: string;
  service_name: string;
  total_cost: number;
}>;
}

interface UseUnifiedDashboardOptions {
  startDate: Date;
  endDate: Date;
  userIds?: number[];
  instanceTypes?: string[];
  regions?: string[];
  services?: string[];
}

export function useUnifiedDashboard(options: UseUnifiedDashboardOptions) {
  const [data, setData] = useState<UnifiedDashboardData>({
    costTrend: [],
    usageTrends: [],
    activeVMs: [],
    operations: [],
    costByUser: [],
    costByRegion: [],
    costByInstanceType: [],
    serviceCostTrend: []
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

        const params = new URLSearchParams();
        params.append('startDate', format(options.startDate, 'yyyy-MM-dd'));
        params.append('endDate', format(options.endDate, 'yyyy-MM-dd'));

        if (options.userIds && options.userIds.length > 0) {
          options.userIds.forEach(id => params.append('userId', id.toString()));
        }

        if (options.instanceTypes && options.instanceTypes.length > 0) {
          options.instanceTypes.forEach(type => params.append('instanceType', type));
        }

        if (options.regions && options.regions.length > 0) {
          options.regions.forEach(region => params.append('region', region));
        }

        if (options.services && options.services.length > 0) {
          options.services.forEach(service => params.append('service', service));
        }

        const API_BASE = env.vmRequest;
        const url = `${API_BASE}/api/leadership-billing/unified-data?${params.toString()}`;

        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch unified dashboard data: ${response.statusText}`);
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error('[useUnifiedDashboard] Error:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [
    format(options.startDate, 'yyyy-MM-dd'),
    format(options.endDate, 'yyyy-MM-dd'),
    JSON.stringify(options.userIds),
    JSON.stringify(options.instanceTypes),
    JSON.stringify(options.regions),
    JSON.stringify(options.services)
  ]);

  return { data, loading, error };
}
