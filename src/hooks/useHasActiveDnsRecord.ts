// src/hooks/useHasActiveDnsRecord.ts
import { useEffect, useState } from "react";
import { checkExistingRoute53Record } from "@/services/route53Api";

export function useHasActiveDnsRecord(hostedZoneId: string) {
  const [hasActiveRecord, setHasActiveRecord] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(true);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!hostedZoneId) {
      setHasActiveRecord(false);
      setCheckingExisting(false);
      return;
    }

    let cancelled = false;
    setCheckingExisting(true);

    checkExistingRoute53Record(hostedZoneId)
      .then((res) => { if (!cancelled) setHasActiveRecord(!!res.exists); })
      .catch(() => { if (!cancelled) setHasActiveRecord(false); }) // fail open
      .finally(() => { if (!cancelled) setCheckingExisting(false); });

    return () => { cancelled = true; };
  }, [hostedZoneId, version]);

  const refresh = () => setVersion((v) => v + 1);

  return { hasActiveRecord, checkingExisting, refresh };
}