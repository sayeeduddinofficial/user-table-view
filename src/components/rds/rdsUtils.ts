/**
 * rdsUtils.ts
 * Pure helpers for mapping RDS API payloads into table rows.
 */

import type { RdsClusterApi } from "@/services/rdsService";
import type { RdsEngine, RdsRow, RdsStatus } from "@/components/rds/rdsTypes";

export function formatRdsDate(date: Date): string {
  const day = date.getDate().toString().padStart(2, "0");
  const month = date.toLocaleString("en-US", { month: "short" });
  return `${day} ${month} ${date.getFullYear()}`;
}

export function normaliseEngine(engine: string): RdsEngine {
  const e = (engine ?? "").toLowerCase();
  if (e.includes("aurora") && e.includes("mysql")) return "Aurora MySQL";
  if (e.includes("aurora") && e.includes("postgres")) return "Aurora PostgreSQL";
  if (e.includes("mysql")) return "MySQL";
  if (e.includes("postgres")) return "PostgreSQL";
  if (e.includes("mariadb")) return "MariaDB";
  if (e.includes("oracle")) return "Oracle";
  if (e.includes("sqlserver") || e.includes("sql server")) return "SQL Server";
  return "PostgreSQL";
}

export function normaliseStatus(status: string): RdsStatus {
  const s = (status ?? "").toLowerCase();
  if (s === "available") return "Available";
  if (s === "creating" || s === "provisioning") return "Provisioning";
  if (s === "deleting" || s === "destroying") return "Terminating";
  if (s === "stopped") return "Stopped";
  if (s === "modifying") return "Modifying";
  if (s === "deleted" || s === "destroyed") return "Terminated";
  return "Available";
}

export function isProvisioningStatus(status: string): boolean {
  const s = (status ?? "").toLowerCase();
  return s === "provisioning" || s === "creating";
}

export function clusterToRows(cluster: RdsClusterApi): RdsRow[] {
  const instanceCount = cluster.instances?.length ?? 0;

  const clusterRow: RdsRow = {
    id: cluster.request_id,
    requestId: cluster.request_id,
    dbIdentifier: cluster.cluster_identifier,
    status: normaliseStatus(cluster.cluster_status),
    role: "Regional cluster",
    engine: normaliseEngine(cluster.engine),
    engineVersion: cluster.engine_version,
    upgradeRollout: cluster.upgrade_rollout_order ?? "—",
    region: cluster.region,
    size: `${instanceCount} ${instanceCount === 1 ? "Instance" : "Instances"}`,
    created: cluster.cluster_created_at ? formatRdsDate(new Date(cluster.cluster_created_at)) : "—",
    isCluster: true,
  };

  const instanceRows: RdsRow[] = (cluster.instances ?? []).map((inst) => ({
    id: `${cluster.request_id}__${inst.instance_identifier}`,
    requestId: cluster.request_id,
    dbIdentifier: inst.instance_identifier,
    status: normaliseStatus(inst.status),
    role: inst.instance_role === "WRITER" ? "Writer instance" : "Reader instance",
    engine: normaliseEngine(cluster.engine),
    engineVersion: inst.engine_version ?? cluster.engine_version,
    upgradeRollout: inst.upgrade_rollout_order ?? "—",
    region: inst.availability_zone ?? cluster.region,
    size: inst.instance_class,
    created: inst.created_at ? formatRdsDate(new Date(inst.created_at)) : "—",
    isCluster: false,
    clusterId: cluster.request_id,
  }));

  return [clusterRow, ...instanceRows];
}