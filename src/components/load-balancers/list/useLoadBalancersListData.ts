/**
 * useLoadBalancersListData.ts
 * Data-fetching, polling and derived-state logic for the Load Balancers list page.
 */

import { useEffect, useMemo, useState } from "react";
import { lbApi, type LbItem, type ExistingLbItem, type ProvisioningLbItem } from "@/services/lbApi";
import { getLbStatusColor, getLbStatusLabel, formatLbDate } from "@/components/load-balancers/lbShared";
import type { LbRow } from "./LbMainTable";

export function useLoadBalancersListData(userId: number | string | undefined) {
  const normalizedUserId = userId === undefined || userId === null ? NaN : Number(userId);

  const [lbs, setLbs] = useState<LbItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState("");
  const [provisioningAlb, setProvisioningAlb] = useState<ProvisioningLbItem | null>(null);
  const [provisioningNlb, setProvisioningNlb] = useState<ProvisioningLbItem | null>(null);
  const [existingLbs, setExistingLbs] = useState<ExistingLbItem[]>([]);
  const [checkingProvisioning, setCheckingProvisioning] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(false);

  const fetchLbs = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const res = await lbApi.list();
      const data = Array.isArray((res as any)?.data)
        ? (res as any).data
        : Array.isArray(res)
          ? res
          : [];
      setLbs(data);
    } catch {
      console.error("Failed to fetch load balancers");
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => { fetchLbs(true); }, []);

  useEffect(() => {
    if (!Number.isFinite(normalizedUserId)) return;
    setCheckingProvisioning(true);
    Promise.all([
      lbApi.checkProvisioning(normalizedUserId, "application").catch(() => ({ exists: false, loadBalancer: null })),
      lbApi.checkProvisioning(normalizedUserId, "network").catch(() => ({ exists: false, loadBalancer: null })),
    ])
      .then(([albRes, nlbRes]) => {
        setProvisioningAlb(albRes.loadBalancer ?? null);
        setProvisioningNlb(nlbRes.loadBalancer ?? null);
      })
      .finally(() => setCheckingProvisioning(false));
  }, [normalizedUserId]);

  useEffect(() => {
    const hasPendingLb = Boolean(
      provisioningAlb || provisioningNlb || lbs.some((lb) => ["pending", "provisioning", "creating"].includes(String(lb.status || "").toLowerCase()))
    );

    if (!Number.isFinite(normalizedUserId) || !hasPendingLb) return;

    const interval = window.setInterval(() => {
      void fetchLbs(false);
      Promise.all([
        lbApi.checkProvisioning(normalizedUserId, "application").catch(() => ({ exists: false, loadBalancer: null })),
        lbApi.checkProvisioning(normalizedUserId, "network").catch(() => ({ exists: false, loadBalancer: null })),
      ])
        .then(([albRes, nlbRes]) => {
          setProvisioningAlb(albRes.loadBalancer ?? null);
          setProvisioningNlb(nlbRes.loadBalancer ?? null);
        });
    }, 10000);

    return () => window.clearInterval(interval);
  }, [normalizedUserId, provisioningAlb, provisioningNlb, lbs]);

  const firstRegion = lbs[0]?.region;
  useEffect(() => {
    if (!userId || !firstRegion) return;
    setCheckingExisting(true);
    lbApi.checkExisting(firstRegion)
      .then((res) => setExistingLbs(res.loadBalancers ?? []))
      .catch(() => setExistingLbs([]))
      .finally(() => setCheckingExisting(false));
  }, [userId, firstRegion]);

  const rows: LbRow[] = useMemo(() =>
    lbs.filter((lb) => lb.status === "completed").map((lb) => ({
      id: lb.id,
      requestId: lb.request_id ?? "-",
      name: lb.name,
      state: getLbStatusLabel(lb.status),
      statusColor: getLbStatusColor(lb.status),
      type: lb.type === "application" ? "ALB" : lb.type === "network" ? "NLB" : lb.type.toUpperCase(),
      scheme: lb.scheme,
      ipType: lb.ip_address_type,
      vpcId: lb.vpc_id,
      vpc: lb.vpc_id,
      subnets: lb.subnets.map((s) => s.subnet_id).join(", ") || "-",
      region: lb.region,
      azs: lb.subnets.map((s) => s.availability_zone).join(", ") || "-",
      securityGroups: (lb.security_group_ids ?? []).join(", ") || "-",
      dnsName: "-",
      arn: "-",
      dateCreated: formatLbDate(lb.created_at),
      created: formatLbDate(lb.created_at),
    })), [lbs]
  );

  const filtered = useMemo(() => {
    const g = globalFilter.trim().toLowerCase();
    return rows.filter((r) => {
      if (g && !Object.values(r).some((v) => String(v).toLowerCase().includes(g))) return false;
      return true;
    });
  }, [rows, globalFilter]);

  return {
    lbs,
    setLbs,
    loading,
    globalFilter,
    setGlobalFilter,
    provisioningAlb,
    provisioningNlb,
    existingLbs,
    checkingProvisioning,
    checkingExisting,
    fetchLbs,
    rows,
    sorted: filtered,
  };
}
