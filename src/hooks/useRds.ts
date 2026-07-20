import { useEffect, useState } from 'react';
import { useDialog } from '@/components/ui/dialog-context';
import {
  fetchRdsClusters,
  fetchRdsCluster,
  provisionRds,
  deleteRdsCluster,
   deleteRdsInstance,
  type RdsClusterApi,
  type ProvisionRdsRequest,
} from '@/services/rdsService';

export function useRdsClusters() {
  const { alert } = useDialog();
  const [clusters, setClusters] = useState<RdsClusterApi[]>([]);
  const [loading, setLoading] = useState(true);

  const loadClusters = async () => {
    try {
      const data = await fetchRdsClusters();
      setClusters(data);
    } catch (error) {
      console.error('Failed to load RDS clusters', error);
      alert({ title: 'Unable to load RDS clusters', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadClusters();
  }, []);

  const refresh = async () => {
    setLoading(true);
    await loadClusters();
  };

  return { clusters, loading, refresh };
}

export function useRdsCluster(requestId?: string) {
  const { alert } = useDialog();
  const [cluster, setCluster] = useState<RdsClusterApi | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!requestId) {
      setCluster(null);
      setLoading(false);
      return;
    }
    let mounted = true;

    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchRdsCluster(requestId);
        if (mounted) setCluster(data);
      } catch (error) {
        console.error('Failed to load RDS cluster', error);
        alert({ title: 'Unable to load RDS details', severity: 'error' });
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();

    return () => {
      mounted = false;
    };
  }, [requestId, alert]);

  return { cluster, loading };
}

export function useProvisionRds() {
  const { alert } = useDialog();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const provision = async (payload: ProvisionRdsRequest) => {
    setIsSubmitting(true);
    try {
      const result = await provisionRds(payload);
      alert({ title: 'RDS provisioning started', description: result.requestId, severity: 'success' });
      return result.requestId;
    } catch (error) {
      console.error('Failed to provision RDS', error);
      alert({ title: error instanceof Error ? error.message : 'Unable to provision RDS', severity: 'error' });
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  return { provision, isSubmitting };
}

export function useDeleteRdsCluster() {
  const { alert } = useDialog();
  const [isDeleting, setIsDeleting] = useState(false);

  const remove = async (requestId: string) => {
    setIsDeleting(true);
    try {
      await deleteRdsCluster(requestId);
      alert({ title: 'RDS deletion started', severity: 'success' });
      return true;
    } catch (error) {
      console.error('Failed to delete RDS cluster', error);
      alert({ title: 'Unable to delete RDS cluster', severity: 'error' });
      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  return { remove, isDeleting };
} 

export function useDeleteRdsInstance() {
  const { alert } = useDialog();
  const [isDeleting, setIsDeleting] = useState(false);

  const remove = async (requestId: string, instanceIdentifier: string) => {
    setIsDeleting(true);
    try {
      await deleteRdsInstance(requestId, instanceIdentifier);
      alert({ title: 'Instance deletion started', severity: 'success' });
      return true;
    } catch (error) {
      console.error('Failed to delete RDS instance', error);
      alert({ title: 'Unable to delete RDS instance', severity: 'error' });
      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  return { remove, isDeleting };
}
