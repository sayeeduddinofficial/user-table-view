import { CopyText, EMPTY_VALUE, Field } from "./eksShared";
import { timeAgo } from "./eksUtils";
import type { EksClusterDetail } from "./eksTypes";

function CopyableField({ label, value }: { label: string; value?: string | null }) {
  return (
    <Field label={label} value={value ? <CopyText text={value} /> : EMPTY_VALUE} />
  );
}

export function OverviewTab({ cluster }: { cluster: EksClusterDetail | null }) {
  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-lg p-5">
        <h2 className="text-sm font-semibold mb-4">Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-5 text-sm">
          <CopyableField label="API server endpoint" value={cluster?.endpoint} />
          <CopyableField
            label="OpenID Connect provider URL"
            value={cluster?.oidc_issuer}
          />
          <CopyableField
            label="Created"
            value={cluster?.created_at ? timeAgo(cluster.created_at) : null}
          />
          <Field
            label="Certificate authority"
            value={
              <textarea
                readOnly
                aria-label="Certificate authority"
                value={cluster?.certificate_authority ?? EMPTY_VALUE}
                className="w-full h-20 text-xs font-mono bg-muted/40 border border-border rounded p-2 resize-none"
              />
            }
          />
          <CopyableField
            label="Cluster IAM role ARN"
            value={cluster?.cluster_iam_role_arn}
          />
          <div className="space-y-5">
            <CopyableField label="Cluster ARN" value={cluster?.cluster_arn} />
            <Field label="Platform version" value={cluster?.platform_version} />
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-5">
        <h2 className="text-sm font-semibold mb-2">EKS Auto Mode</h2>
        <p className="text-sm text-muted-foreground mb-4">
          EKS automates routine cluster tasks for compute, storage, and networking to
          meet application compute needs.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 text-sm">
          <Field label="EKS Auto Mode" value="Enabled" />
          <CopyableField label="Node IAM role" value={cluster?.node_iam_role_arn} />
        </div>
      </div>
    </div>
  );
}