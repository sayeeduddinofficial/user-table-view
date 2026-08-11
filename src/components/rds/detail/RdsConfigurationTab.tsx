/**
 * RdsConfigurationTab.tsx
 * "Configuration" tab for a cluster or a single instance.
 */

import { ConfigField, CopyableArn, SectionHeading } from '@/components/rds/rdsShared';
import type { RdsClusterApi, RdsInstanceApi } from '@/services/rdsService';
import { formatIdleTime } from '@/utils/rds.utils';

const DEFAULT_PARAMETER_GROUP = 'default.aurora-postgresql17';

interface RdsConfigurationTabProps {
  cluster: RdsClusterApi;
  instance: RdsInstanceApi | null;
  engineVersion: string;
}

export function RdsConfigurationTab({ cluster, instance, engineVersion }: RdsConfigurationTabProps) {
  const isInstance = !!instance;

  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <h2 className="text-base font-semibold mb-5">{isInstance ? 'Instance' : 'Database'}</h2>
      <div className={`grid gap-0 divide-x divide-border ${isInstance ? 'grid-cols-4' : 'grid-cols-5'}`}>
        <div className="pr-6">
          <SectionHeading>Configuration</SectionHeading>
          <div className="space-y-4">
            {instance ? (
              <InstanceConfigurationFields instance={instance} engineVersion={engineVersion} />
            ) : (
              <ClusterConfigurationFields cluster={cluster} engineVersion={engineVersion} />
            )}
          </div>
        </div>

        <div className="px-6">
          {instance ? (
            <InstanceCapacityFields cluster={cluster} instance={instance} />
          ) : (
            <ClusterCapacityFields cluster={cluster} />
          )}
        </div>

        <div className="px-6">
          {instance ? <InstanceStorageFields cluster={cluster} /> : <ClusterAuthenticationFields cluster={cluster} />}
        </div>

        {!isInstance && (
          <div className="px-6">
            <SectionHeading>Encryption</SectionHeading>
            <div className="space-y-4">
              <ConfigField label="Encryption" value={cluster.encryption_enabled ? 'Enabled' : 'Disabled'} />
              <ConfigField
                label="Encryption key"
                value={
                  cluster.kms_key_id ? (
                    <span className="text-primary text-xs">{String(cluster.kms_key_id)}</span>
                  ) : (
                    'AWS owned KMS key'
                  )
                }
              />
            </div>
          </div>
        )}

        <div className="pl-6">
          <SectionHeading>Monitoring</SectionHeading>
          <div className="space-y-4">
            <ConfigField label="Monitoring type" value="Database Insights - Standard" />
            <ConfigField label="Performance Insights" value="Disabled" />
            <ConfigField label="Enhanced Monitoring" value="Disabled" />
          </div>
        </div>
      </div>
    </div>
  );
}

function InstanceConfigurationFields({
  instance,
  engineVersion,
}: {
  instance: RdsInstanceApi;
  engineVersion: string;
}) {
  return (
    <>
      <ConfigField label="DB instance ID" value={instance.instance_identifier} />
      <ConfigField label="Engine version" value={engineVersion} />
      <ConfigField label="RDS Extended Support" value="Enabled" />
      <ConfigField label="DB name" value="—" />
      <ConfigField
        label="Option groups"
        value={<span className="text-primary text-xs">{DEFAULT_PARAMETER_GROUP}</span>}
      />
      <ConfigField label="Amazon Resource Name (ARN)" value={<CopyableArn arn={instance.instance_arn} />} />
      <ConfigField label="Resource ID" value={instance.resource_id ?? '—'} />
      <ConfigField
        label="Created time"
        value={instance.created_at ? new Date(instance.created_at).toLocaleString() : '—'}
      />
      <ConfigField label="DB instance parameter group" value={<ParameterGroupInSync />} />
      <ConfigField label="DB cluster parameter group" value={<ParameterGroupInSync />} />
      <ConfigField label="Architecture settings" value="Non-multitenant architecture" />
    </>
  );
}

function ParameterGroupInSync() {
  return (
    <span className="text-primary text-xs">
      {DEFAULT_PARAMETER_GROUP} <span className="text-emerald-400">✓ In sync</span>
    </span>
  );
}

function ClusterConfigurationFields({
  cluster,
  engineVersion,
}: {
  cluster: RdsClusterApi;
  engineVersion: string;
}) {
  return (
    <>
      <ConfigField label="DB cluster role" value="Regional cluster" />
      <ConfigField label="Engine version" value={engineVersion} />
      <ConfigField label="RDS Extended Support" value="Enabled" />
      <ConfigField label="Resource ID" value={(cluster.resource_id as string) ?? '—'} />
      <ConfigField label="Cluster storage configuration" value="Aurora Standard" />
      <ConfigField label="Amazon Resource Name (ARN)" value={<CopyableArn arn={cluster.cluster_arn} />} />
      <ConfigField label="Network type" value="—" />
    </>
  );
}

function InstanceCapacityFields({
  cluster,
  instance,
}: {
  cluster: RdsClusterApi;
  instance: RdsInstanceApi;
}) {
  return (
    <>
      <SectionHeading>Instance configuration</SectionHeading>
      <div className="space-y-4">
        <ConfigField
          label="Instance type"
          value={instance.instance_class === 'db.serverless' ? 'Aurora serverless' : instance.instance_class}
        />
        <ConfigField label="Minimum capacity" value={`${cluster.min_acu ?? 0} ACUs`} />
        <ConfigField label="Maximum capacity" value={`${cluster.max_acu ?? 8} ACUs`} />
        <ConfigField label="Platform version" value="4" />
        <ConfigField
          label="Allowed DB Cluster idle time before pausing"
          value={formatIdleTime(cluster.auto_pause_seconds)}
        />
      </div>
      <p className="text-xs font-semibold text-foreground mt-6 mb-4">Availability</p>
      <div className="space-y-4">
        <ConfigField label="Failover priority" value={String(instance.failover_priority ?? 1)} />
      </div>
    </>
  );
}

function ClusterCapacityFields({ cluster }: { cluster: RdsClusterApi }) {
  return (
    <>
      <SectionHeading>Capacity type</SectionHeading>
      <div className="space-y-4">
        <ConfigField
          label=""
          value={cluster.engine_mode === 'provisioned' ? 'Provisioned' : (cluster.engine_mode ?? 'Provisioned')}
        />
        <ConfigField
          label="Local read replica write forwarding"
          value={<span className="inline-flex items-center gap-1 text-muted-foreground">⊘ Disabled</span>}
        />
        <ConfigField label="DB cluster ID" value={cluster.cluster_identifier} />
        <ConfigField
          label="DB cluster parameter group"
          value={<span className="text-primary text-xs">{cluster.parameter_group ?? DEFAULT_PARAMETER_GROUP}</span>}
        />
        <ConfigField label="Deletion protection" value="Disabled" />
        <ConfigField label="Limitless Database" value="Disabled" />
      </div>
    </>
  );
}

function InstanceStorageFields({ cluster }: { cluster: RdsClusterApi }) {
  return (
    <>
      <SectionHeading>Primary storage</SectionHeading>
      <div className="space-y-4">
        <ConfigField label="Encryption key" value="AWS owned KMS key" />
        <ConfigField label="Storage type" value={cluster.storage_type ?? 'aurora'} />
      </div>
    </>
  );
}

function ClusterAuthenticationFields({ cluster }: { cluster: RdsClusterApi }) {
  return (
    <>
      <SectionHeading>Authentication</SectionHeading>
      <div className="space-y-4">
        <ConfigField
          label="IAM DB authentication"
          value={<span className="text-primary text-sm">{cluster.iam_auth_enabled ? 'Enabled' : 'Disabled'}</span>}
        />
        <ConfigField
          label="Kerberos authentication"
          value={<span className="text-muted-foreground text-sm">Not enabled</span>}
        />
        <ConfigField
          label="Master username"
          value={<span className="text-primary text-sm">{cluster.master_username ?? '—'}</span>}
        />
      </div>
      <p className="text-xs font-semibold text-foreground mt-6 mb-4">Availability</p>
      <div className="space-y-4">
        <ConfigField label="Multi-AZ" value="No" />
      </div>
    </>
  );
}
