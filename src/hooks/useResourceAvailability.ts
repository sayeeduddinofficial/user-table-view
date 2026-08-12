import { useState, useCallback } from "react";
import serviceLimits from "@/config/serviceLimits";
import { fetchVpcListApi } from "@/services/vpcService";
import { fetchBucketsApi } from "@/services/bucketService";
import { fetchRdsClusters } from "@/services/rdsService";
import { fetchRoute53Records } from "@/services/route53Api";
import { lbApi } from "@/services/lbApi";
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
  const [loading, setLoading] = useState(false);
  const [available, setAvailable] = useState<Record<string, AvailabilityEntry>>({});;

  const fetchCounts = useCallback(async () => {
    setLoading(true);
    try {
      if (!user) {
        setAvailable({});
        return;
      }

      const [vpcs, buckets, eksCount, rdsClusters, route53Records, lbResponse] = await Promise.all([
        fetchVpcListApi().catch(() => []),
        fetchBucketsApi().catch(() => []),
        fetchEksCountForUser(user.id).catch(() => 0),
        fetchRdsClusters().catch(() => []),
        fetchRoute53Records().catch(() => []),
        lbApi.list().catch(() => ({ data: [] } as { data: any[] })),
      ]);

      const completedVpcCount = Array.isArray(vpcs) ? vpcs.filter((v: any) => v.userId === user.id).length : 0;
      const hasPendingVpc = !!getPendingVpc(user.id);
      const vpcCount = completedVpcCount + (hasPendingVpc ? 1 : 0);
      const s3Count = Array.isArray(buckets)
        ? buckets.filter((b) => Number(b.user_id) === Number(user.id)).length
        : 0;

      const rdsCount = Array.isArray(rdsClusters)? rdsClusters.filter((c) => Number(c.user_id) === Number(user.id)).length: 0;

      const route53Count = Array.isArray(route53Records)
        ? route53Records.filter((r) => Number(r.user_id) === Number(user.id) && r.status !== "deleted").length
        : 0;

      const loadBalancers = Array.isArray((lbResponse as any)?.data) ? (lbResponse as any).data : [];
      const lbCount = loadBalancers.filter((lb: any) => Number(lb.user_id) === Number(user.id)).length;

      const vpcLimit = user.maxVpcs ?? serviceLimits.vpc ?? Infinity;
      const s3Limit = user.maxBuckets ?? serviceLimits.s3 ?? Infinity;
      const lbLimit = user.maxLoadBalancers ?? serviceLimits.lb ?? Infinity;
      const rdsLimit = user.maxRdsClusters ?? serviceLimits.rds ?? Infinity;
      const eksLimit = user.maxEksClusters ?? serviceLimits.eks ?? Infinity;
      const route53Limit = user.maxDnsRecords ?? serviceLimits.route53 ?? Infinity;

      setAvailable({
        vpc: { count: vpcCount, reached: vpcCount >= vpcLimit, limit: vpcLimit },
        s3: { count: s3Count, reached: s3Count >= s3Limit, limit: s3Limit },
        lb: { count: lbCount, reached: lbCount >= lbLimit, limit: lbLimit },
        eks: {
          count: eksCount,
          reached: eksCount >= eksLimit,
          limit: eksLimit,
        },
        rds: { count: rdsCount, reached: rdsCount >= rdsLimit, limit: rdsLimit },
        route53: { count: route53Count, reached: route53Count >= route53Limit, limit: route53Limit },
      });
    } catch (err) {
      console.error("useResourceAvailability: failed to fetch counts", err);
      setAvailable({});
    } finally {
      setLoading(false);
    }
  }, [user]);

  // No auto-fetch on mount — callers invoke refetch() explicitly when needed
  return { loading, available, limits: serviceLimits, refetch: fetchCounts };
}