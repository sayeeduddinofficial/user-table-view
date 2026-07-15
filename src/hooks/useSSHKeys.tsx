import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useLogin';
import { isBefore } from 'date-fns';
import { fetchMySSHKeysApi, SSHKey } from '@/services/sshKeyApi';

interface UseSSHKeysResult {
  keys: SSHKey[];
  loading: boolean;
  loadError: boolean;
  refetch: () => Promise<void>;
}

export function useSSHKeys(): UseSSHKeysResult {
  const { user } = useAuth();
  const [keys, setKeys] = useState<SSHKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!user) {
      setKeys([]);
      setLoadError(false);
      setLoading(false);
      return;
    }

    void fetchActiveKeys();
  }, [user]);

  const fetchActiveKeys = async () => {
    if (!user) return;
    try {
  const  data= await fetchMySSHKeysApi();
      const activeKeys = (data || []).filter((key) => !isBefore(new Date(key.expires_at), new Date()));
      setKeys(activeKeys);
    } catch (error) {
      console.error('Failed to fetch SSH keys:', error);
      setLoadError(true);
      setKeys([]);
    } finally {
      setLoading(false);
    }
  };

  return { keys, loading, refetch: fetchActiveKeys, loadError };
}
