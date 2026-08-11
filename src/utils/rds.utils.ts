/**
 * rds.utils.ts
 * Pure helpers, types and normalizers for the RDS feature.
 * Keep all data shaping here — components stay presentational.
 */

import { toast } from 'sonner';
import type { RdsClusterApi, RdsInstanceApi } from '@/services/rdsService';

// ── Types ───────────────────────────────────────────────────────────────────
export type RdsEngine =
  | 'Aurora MySQL'
  | 'Aurora PostgreSQL'
  | 'MySQL'
  | 'PostgreSQL'
  | 'MariaDB'
  | 'Oracle'
  | 'SQL Server';

export type RdsRole = 'Regional cluster' | 'Writer instance' | 'Reader instance' | 'Standalone';

export type RdsStatus = 'Available' | 'Creating' | 'Deleting' | 'Stopped' | 'Modifying';

export type RdsRow = {
  id: string;
  requestId: string;
  dbIdentifier: string;
  status: RdsStatus;
  role: RdsRole;
  engine: RdsEngine;
  engineVersion: string;
  upgradeRollout: string;
  region: string;
  size: string;
  created: string;
  isCluster: boolean;
  clusterId?: string;
};

export type PsqlPlatform = 'macos' | 'linux' | 'windows';

export type RdsConnectivityData = {
  endpoint: string;
  internetAccessGateway: string;
  iamAuthentication: string;
  databaseName: string;
  masterUsername: string;
  port: number;
  availabilityZone: string;
  subnets: string[];
  certificateAuthority: string;
  certificateAuthorityDate: string;
};

export type RdsEndpoint = { name: string; status: string; type: string; port: number };

export const RDS_TABLE_COLUMNS = [
  'Request ID',
  'DB Identifier',
  'Status',
  'Role',
  'Engine',
  'Upgrade Rollout',
  'Region',
  'Size',
  'Created',
  'Actions',
];

// ── Formatting ──────────────────────────────────────────────────────────────
export function formatRdsDate(date: Date): string {
  const day = date.getDate().toString().padStart(2, '0');
  const month = date.toLocaleString('en-US', { month: 'short' });
  return `${day} ${month} ${date.getFullYear()}`;
}

/** Renders an ACU value with its approximate memory footprint. */
export function formatAcu(value: string | number): string {
  const acu = typeof value === 'number' ? value : parseFloat(value) || 0;
  const gib = acu === 0 ? 0 : Math.round(acu * 2);
  return `${acu} ACU (${gib} GiB)`;
}

export function formatIdleTime(seconds?: number): string {
  if (!seconds) return '—';
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}:00`;
}

export function copyToClipboard(text: string, label: string): void {
  navigator.clipboard.writeText(text);
  toast.success(`${label} copied`);
}

// ── Normalizers ─────────────────────────────────────────────────────────────
export function normaliseEngine(engine: string): RdsEngine {
  const e = engine.toLowerCase();
  if (e.includes('aurora') && e.includes('mysql')) return 'Aurora MySQL';
  if (e.includes('aurora') && e.includes('postgres')) return 'Aurora PostgreSQL';
  if (e.includes('mysql')) return 'MySQL';
  if (e.includes('postgres')) return 'PostgreSQL';
  if (e.includes('mariadb')) return 'MariaDB';
  if (e.includes('oracle')) return 'Oracle';
  if (e.includes('sqlserver') || e.includes('sql server')) return 'SQL Server';
  return 'PostgreSQL';
}

export function normaliseStatus(status: string): RdsStatus {
  const s = status.toLowerCase();
  if (s === 'available') return 'Available';
  if (s === 'creating' || s === 'provisioning') return 'Creating';
  if (s === 'deleting' || s === 'destroying') return 'Deleting';
  if (s === 'stopped') return 'Stopped';
  if (s === 'modifying') return 'Modifying';
  if (s === 'deleted' || s === 'destroyed' || s === 'failed') return 'Deleting';
  return 'Available';
}

/** Flattens a cluster API record into one cluster row plus its instance rows. */
export function clusterToRows(cluster: RdsClusterApi): RdsRow[] {
  const clusterRow: RdsRow = {
    id: cluster.request_id,
    requestId: cluster.request_id,
    dbIdentifier: cluster.cluster_identifier,
    status: normaliseStatus(cluster.cluster_status),
    role: 'Regional cluster',
    engine: normaliseEngine(cluster.engine),
    engineVersion: cluster.engine_version,
    upgradeRollout: cluster.upgrade_rollout_order ?? '—',
    region: cluster.region,
    size: `${cluster.instances.length} ${cluster.instances.length === 1 ? 'Instance' : 'Instances'}`,
    created: cluster.cluster_created_at ? formatRdsDate(new Date(cluster.cluster_created_at)) : '—',
    isCluster: true,
  };

  const instanceRows: RdsRow[] = cluster.instances.map((inst) => ({
    id: `${cluster.request_id}__${inst.instance_identifier}`,
    requestId: cluster.request_id,
    dbIdentifier: inst.instance_identifier,
    status: normaliseStatus(inst.status),
    role: inst.instance_role === 'WRITER' ? 'Writer instance' : 'Reader instance',
    engine: normaliseEngine(cluster.engine),
    engineVersion: inst.engine_version ?? cluster.engine_version,
    upgradeRollout: inst.upgrade_rollout_order ?? '—',
    region: inst.availability_zone ?? cluster.region,
    size: inst.instance_class,
    created: inst.created_at ? formatRdsDate(new Date(inst.created_at)) : '—',
    isCluster: false,
    clusterId: cluster.request_id,
  }));

  return [clusterRow, ...instanceRows];
}

export function matchesRdsQuery(row: RdsRow, query: string): boolean {
  if (!query) return true;
  return [row.dbIdentifier, row.engine, row.region, row.status].some((v) =>
    v?.toLowerCase().includes(query),
  );
}

// ── Detail-page shaping ─────────────────────────────────────────────────────
export function buildConnectivityData(
  cluster: RdsClusterApi,
  instance: RdsInstanceApi | null,
): RdsConnectivityData {
  const primaryInstance = cluster.instances?.[0] ?? null;

  if (instance) {
    return {
      endpoint: instance.endpoint ?? '',
      internetAccessGateway: instance.publicly_accessible ? 'Public' : 'Private',
      iamAuthentication: cluster.iam_auth_enabled ? 'Enabled' : 'Disabled',
      databaseName: cluster.database_name ?? '',
      masterUsername: cluster.master_username ?? '',
      port: instance.port ?? cluster.port ?? 5432,
      availabilityZone: instance.availability_zone ?? '—',
      subnets: Array.isArray(instance.subnets_json) ? (instance.subnets_json as unknown as string[]) : [],
      certificateAuthority: instance.ca_certificate_identifier ?? '',
      certificateAuthorityDate: instance.ca_certificate_expiry ?? '',
    };
  }

  return {
    endpoint: cluster.endpoint ?? '',
    internetAccessGateway: primaryInstance?.publicly_accessible ? 'Public' : 'Private',
    iamAuthentication: cluster.iam_auth_enabled ? 'Enabled' : 'Disabled',
    databaseName: cluster.database_name ?? '',
    masterUsername: cluster.master_username ?? '',
    port: cluster.port ?? 5432,
    availabilityZone: primaryInstance?.availability_zone ?? '—',
    subnets: primaryInstance?.availability_zone ? [primaryInstance.availability_zone] : [],
    certificateAuthority: primaryInstance?.ca_certificate_identifier ?? '',
    certificateAuthorityDate: (cluster.created_at as string) ?? '',
  };
}

export function buildClusterEndpoints(cluster: RdsClusterApi): RdsEndpoint[] {
  return [
    { name: cluster.endpoint ?? '', status: 'Available', type: 'Writer', port: cluster.port ?? 5432 },
    { name: cluster.reader_endpoint ?? '', status: 'Available', type: 'Reader', port: cluster.port ?? 5432 },
  ].filter((ep) => ep.name);
}

/** Placeholder IAM auth token shown in the "Get token" dialog. */
export function buildMockAuthToken(data: Pick<RdsConnectivityData, 'endpoint' | 'port' | 'masterUsername'>): string {
  return `${data.endpoint}:${data.port}/?Action=connect&DBUser=${data.masterUsername}&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAIOSFODNN7EXAMPLE&X-Amz-Date=20260707T000000Z&X-Amz-Expires=900&X-Amz-SignedHeaders=host&X-Amz-Signature=abcdef1234567890abcdef1234567890abcdef12`;
}

export type ConnectionStep = { label: string; code: string };

export function getConnectionSteps(params: {
  platform: PsqlPlatform;
  endpoint: string;
  masterUsername: string;
  databaseName: string;
  port: number;
  secretArn: string;
  region: string;
}): ConnectionStep[] {
  const { platform, endpoint, masterUsername, databaseName, port, secretArn, region } = params;

  const downloadCert: ConnectionStep = {
    label: 'Download SSL certificate',
    code: 'curl -o global-bundle.pem https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem',
  };

  if (platform === 'windows') {
    return [
      downloadCert,
      {
        label: 'Connect using psql',
        code: `psql "host=${endpoint} port=${port} dbname=${databaseName} user=${masterUsername} sslmode=verify-full sslrootcert=./global-bundle.pem password=$( ($s = aws secretsmanager get-secret-value --secret-id ${secretArn} --region ${region} | ConvertFrom-Json).SecretString | ConvertFrom-Json | Select-Object -ExpandProperty password )"`,
      },
    ];
  }

  // macOS and Linux share the same snippet
  return [
    downloadCert,
    { label: 'Set host variable', code: `export RDSHOST="${endpoint}"` },
    {
      label: 'Connect using psql',
      code: `psql "host=$RDSHOST port=${port} dbname=${databaseName} user=${masterUsername} sslmode=verify-full sslrootcert=./global-bundle.pem password=$(aws secretsmanager get-secret-value --secret-id '${secretArn}' --region ${region} --query SecretString --output text | jq -r '.password')"`,
    },
  ];
}
