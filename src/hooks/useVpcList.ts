import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useDialog } from "@/components/ui/dialog-context";
import { useAppStore } from "@/store/appStore";
import {
  fetchVpcListApi,
  fetchVpcDetailsApi,
  ApiError,
} from "@/services/vpcService";
import { getPendingVpc, clearPendingVpc } from "@/components/vpc/pendingVpc";

type Tab = "vpcs" | "encryption";

export function useVpcList() {
  const vpcs = useAppStore((s) => s.vpcs);
  const setVpcs = useAppStore((s) => s.setVpcs);
  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get("tab") as Tab) || "vpcs";

  const [tab, setTab] = useState<Tab>(initialTab);
  const [query, setQuery] = useState("");
  const [encQuery, setEncQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { alert } = useDialog();

  const loadVpcs = useCallback(async (showLoader = true) => {
    if (showLoader) {
      setLoading(true);
    }

    try {
      const list = await fetchVpcListApi();
      setVpcs(list);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to load VPCs";
      alert({ title: msg, severity: "error" });
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  }, [setVpcs, alert]);

  useEffect(() => {
    loadVpcs();
  }, [loadVpcs]);

  useEffect(() => {
    const paramTab = searchParams.get("tab");
    if (paramTab === "encryption" || paramTab === "vpcs") setTab(paramTab);
  }, [searchParams]);

  const filtered = useMemo(
    () =>
      vpcs.filter(
        (v: any) =>
          !query ||
          (v.name ?? "").toLowerCase().includes(query.toLowerCase()) ||
          (v.id ?? "").toLowerCase().includes(query.toLowerCase()) ||
          String(v.cidr ?? "").toLowerCase().includes(query.toLowerCase()) ||
          String(v.region ?? "").toLowerCase().includes(query.toLowerCase()),
      ),
    [vpcs, query],
  );

  const allChecked = filtered.length > 0 && selected.length === filtered.length;
  const toggleAll = () =>
    setSelected(allChecked ? [] : filtered.map((v: any) => v.id));
  const toggleOne = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const clearSelection = useCallback(() => { setSelected([]); }, []);

  // Track pending VPC per user (list GET does not return VPCs still in provisioning state).
  const currentUser = useAppStore((s) => s.currentUser);
  const [pendingCount, setPendingCount] = useState<number>(() => (getPendingVpc(currentUser?.id) ? 1 : 0));

  useEffect(() => {
    const pending = getPendingVpc(currentUser?.id);
    if (!pending) {
      setPendingCount(0);
      return;
    }

    const showedUp = vpcs.some((v: any) => String(v.id) === String(pending.requestId));

    if (showedUp) {
      if (currentUser?.id) {
        clearPendingVpc(currentUser.id);
      }
      setPendingCount(0);
      return;
    }

    setPendingCount(1);
  }, [vpcs, currentUser?.id]);

  useEffect(() => {
    const pending = getPendingVpc(currentUser?.id);
    if (!currentUser?.id || !pending) return;

    let cancelled = false;

    void (async () => {
      try {
        const details = await fetchVpcDetailsApi(pending.requestId);
        const status = String(details?.status ?? "").toUpperCase();

        if (
          !cancelled &&
          [
            "SUCCESS",
            "FAILED",
            "DESTROYING",
            "DESTROYED",
            "RETRYING_TERMINATE",
          ].includes(status)
        ) {
          clearPendingVpc(currentUser.id);
          setPendingCount(0);
          void loadVpcs();
        }
      } catch (err) {
        if (!cancelled && err instanceof ApiError && err.status === 404) {
          clearPendingVpc(currentUser.id);
          setPendingCount(0);
          void loadVpcs();
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentUser?.id]);

  useEffect(() => {
    if (!currentUser?.id || pendingCount === 0) return;

    const interval = window.setInterval(() => {
      void loadVpcs(false);
    }, 15_000);

    return () => window.clearInterval(interval);
  }, [currentUser?.id, pendingCount, loadVpcs]);

  return {
    tab,
    setTab,
    query,
    setQuery,
    encQuery,
    setEncQuery,
    allVpcs: vpcs,
    filtered,
    selected,
    allChecked,
    toggleAll,
    toggleOne,
    clearSelection,
    howItWorksOpen,
    setHowItWorksOpen,
    loading,
    hasPending: pendingCount > 0,
    pendingCount,
    refresh: loadVpcs,
  };
}
