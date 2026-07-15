import { useState, useEffect, useCallback } from 'react';
import { env } from '@/lib/api';
import axios from 'axios';

export interface ManagerInfo {
  id:           number | null;
  email:        string;
  display_name: string | null;
}

export interface SuperAdminOption {
  id:    number;
  email: string;
  name:  string;
}

interface UseMyManagerResult {
  manager:          ManagerInfo | null;
  superAdmins:      SuperAdminOption[];
  hasActiveManager: boolean;
  loading:          boolean;
  error:            string | null;
  /** Call to force a re-fetch (e.g. after a user profile update) */
  refresh:          () => void;
}

export function useMyManager(): UseMyManagerResult {
  const [manager, setManager] = useState<ManagerInfo | null>(null);
  const [superAdmins, setSuperAdmins] = useState<SuperAdminOption[]>([]);
  const [hasActiveManager, setHasActiveManager] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [tick,    setTick]    = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;

    const fetchManagerOptions = async () => {
      setLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem("token");

        if (!token) {
          throw new Error("No authentication token found");
        }

        const res = await axios.get(
          `${env.runtime}/api/runtime-governance/manager-options`
        );
        const data = res.data;

        if (!cancelled) {
          setHasActiveManager(data.hasActiveManager ?? false);
          
          if (data.hasActiveManager && data.manager) {
            setManager({
              id: null, // We don't need ID for display
              email: data.manager.email,
              display_name: data.manager.name
            });
          } else {
            setManager(null);
          }
          
          setSuperAdmins(data.superAdmins ?? []);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchManagerOptions();

    return () => { cancelled = true; };
  }, [tick]);

  return { manager, superAdmins, hasActiveManager, loading, error, refresh };
}