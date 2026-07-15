import { useEffect, useState, useCallback } from "react";
import serviceLimits from "@/config/serviceLimits";
import { fetchVpcListApi } from "@/services/vpcService";
import { fetchBucketsApi } from "@/services/bucketService";
import { useAuth } from "@/hooks/useLogin";

type AvailabilityEntry = { count: number; reached: boolean; limit?: number };

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

      const [vpcs, buckets] = await Promise.all([
        fetchVpcListApi().catch(() => []),
        fetchBucketsApi().catch(() => []),
      ]);

      const vpcCount = Array.isArray(vpcs) ? vpcs.filter((v: any) => v.userId === user.id).length : 0;
      const s3Count = Array.isArray(buckets)
        ? buckets.filter((b) => Number(b.user_id) === Number(user.id)).length
        : 0;

      setAvailable({
        vpc: { count: vpcCount, reached: vpcCount >= (serviceLimits.vpc ?? Infinity), limit: serviceLimits.vpc },
        s3: { count: s3Count, reached: s3Count >= (serviceLimits.s3 ?? Infinity), limit: serviceLimits.s3 },
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
