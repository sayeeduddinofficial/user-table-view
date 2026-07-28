import { useEffect, useState, useCallback } from "react";
import serviceLimits from "@/config/serviceLimits";
import { fetchVpcListApi } from "@/services/vpcService";
import { fetchBucketsApi } from "@/services/bucketService";
import { fetchRdsClusters } from "@/services/rdsService";
import { useAuth } from "@/hooks/useLogin";
import { env } from "@/lib/env";
import { getPendingVpc } from "@/components/vpc/pendingVpc";

type AvailabilityEntry = { count: number; reached: boolean; limit?: number };

async function fetchEksCountForUser(userId: number): Promise<number> {
  const token = localStorage.getItem("token");
  const res = await fetch(`${env.eksClusterService}/eks/`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) return 0;
  const data = await res.json();

  const clusters = data?.data?.clusters;

  if (!Array.isArray(clusters)) return 0;

  return clusters.filter(
    (c: any) =>
      Number(c.created_by) === Number(userId) && ["PENDING", "PROVISIONING", "ACTIVE", "TERMINATING"].includes(c.status),
  ).length;
}

export function useResourceAvailability() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState<Record<string, AvailabilityEntry>>({});

  const fetchCounts = useCallback(async () => {
    setLoading(true);
    try {
      if (!user) {
        setAvailable({});
        return;
      }

      const [vpcs, buckets, eksCount, rdsClusters] = await Promise.all([
        fetchVpcListApi().catch(() => []),
        fetchBucketsApi().catch(() => []),
        fetchEksCountForUser(user.id).catch(() => 0),
        fetchRdsClusters().catch(() => []),
      ]);

      const completedVpcCount = Array.isArray(vpcs) ? vpcs.filter((v: any) => v.userId === user.id).length : 0;
      const hasPendingVpc = !!getPendingVpc(user.id);
      const vpcCount = completedVpcCount + (hasPendingVpc ? 1 : 0);
      const s3Count = Array.isArray(buckets)
        ? buckets.filter((b) => Number(b.user_id) === Number(user.id)).length
        : 0;

      const rdsCount = Array.isArray(rdsClusters)? rdsClusters.filter((c) => Number(c.user_id) === Number(user.id)).length: 0;

      setAvailable({
        vpc: { count: vpcCount, reached: vpcCount >= (serviceLimits.vpc ?? Infinity), limit: serviceLimits.vpc },
        s3: { count: s3Count, reached: s3Count >= (serviceLimits.s3 ?? Infinity), limit: serviceLimits.s3 },
        eks: {
          count: eksCount,
          reached: eksCount >= (serviceLimits.eks ?? Infinity),
          limit: serviceLimits.eks,
        },
        rds: { count: rdsCount, reached: rdsCount >= (serviceLimits.rds ?? Infinity), limit: serviceLimits.rds },
      });
    } catch (err) {
      console.error("useResourceAvailability: failed to fetch counts", err);
      setAvailable({});
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void fetchCounts();
  }, [fetchCounts]);

  return { loading, available, limits: serviceLimits, refetch: fetchCounts };
}