import { useCallback, useEffect, useState } from "react";
import {
  fetchRoute53QuotaUsage,
  fetchRoute53Records,
  Route53RecordItem,
} from "@/services/route53Api";

/** Loads Route 53 records plus the current DNS-record quota usage. */
export function useRoute53Overview() {
  const [records, setRecords] = useState<Route53RecordItem[]>([]);
  const [usedRecords, setUsedRecords] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRecords = useCallback(async () => {
    try {
      const all = await fetchRoute53Records();
      setRecords(all);
      setError(null);
    } catch {
      setError("Failed to load Route 53 records.");
    }
  }, []);

  const loadQuotaUsage = useCallback(async () => {
    try {
      setUsedRecords(await fetchRoute53QuotaUsage());
    } catch {
      // quota is non-critical for rendering the zone list
    }
  }, []);

  const refresh = useCallback(async () => {
    await Promise.all([loadRecords(), loadQuotaUsage()]);
  }, [loadRecords, loadQuotaUsage]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await refresh();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  return { records, usedRecords, loading, error, refresh, loadQuotaUsage };
}
