import { useEffect, useState } from "react";
import { checkExistingRoute53Record } from "@/services/route53Api";

export function useHasActiveDnsRecord(
  hostedZoneId: string,
  recordName: string,
  recordType: string
) {
  const [hasActiveRecord, setHasActiveRecord] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!hostedZoneId || !recordName || !recordType) {
      setHasActiveRecord(false);
      setCheckingExisting(false);
      return;
    }

    const timer = setTimeout(() => {
      let cancelled = false;

      setCheckingExisting(true);

      checkExistingRoute53Record(
        hostedZoneId,
        recordName,
        recordType
      )
        .then((res) => {
          if (!cancelled) {
            setHasActiveRecord(!!res.exists);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setHasActiveRecord(false);
          }
        })
        .finally(() => {
          if (!cancelled) {
            setCheckingExisting(false);
          }
        });

      return () => {
        cancelled = true;
      };
    }, 800);

    return () => clearTimeout(timer);

  }, [hostedZoneId, recordName, recordType, version]);

  const refresh = () => setVersion((v) => v + 1);

  return {
    hasActiveRecord,
    checkingExisting,
    refresh,
  };
}