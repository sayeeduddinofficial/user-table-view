/**
 * rdsTypes.ts
 * Shared RDS view-model types. Keep API shapes in `@/services/rdsService`.
 */

export type RdsEngine =
  | "Aurora MySQL"
  | "Aurora PostgreSQL"
  | "MySQL"
  | "PostgreSQL"
  | "MariaDB"
  | "Oracle"
  | "SQL Server";

export type RdsRole = "Regional cluster" | "Writer instance" | "Reader instance" | "Standalone";

export type RdsStatus =
  | "Available"
  | "Creating"
  | "Deleting"
  | "Stopped"
  | "Modifying"
  | "Provisioning"
  | "Terminating"
  | "Terminated";

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

export type RdsDetailTab = "connectivity" | "configuration";

export type RdsConnectUsing = "code" | "endpoints";