import type { EksClusterDetail } from "./EksDetails";
import { CopyText, Field } from "./eksShared";

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff} seconds ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  return `${Math.floor(diff / 86400)} days ago`;
}


export function OverviewTab({ cluster }: { cluster: EksClusterDetail | null }) {
  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-lg p-5">
        <h2 className="text-sm font-semibold mb-4">Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-5 text-sm">
          <Field
            label="API server endpoint"
            value={cluster?.endpoint ? <CopyText text={cluster.endpoint} /> : "—"}
          />
          <Field
            label="OpenID Connect provider URL"
            value={cluster?.oidc_issuer ? <CopyText text={cluster.oidc_issuer} /> : "—"}
          />
          <Field label="Created" value={cluster?.created_at ? <CopyText text={timeAgo(cluster.created_at)} /> : "—"} />
          <Field
            label="Certificate authority"
            value={
              <textarea
                readOnly
                value={cluster?.certificate_authority ?? "—"}
                className="w-full h-20 text-xs font-mono bg-muted/40 border border-border rounded p-2 resize-none"
              />
            }
          />
          <Field
            label="Cluster IAM role ARN"
            value={
              <span className="inline-flex items-start gap-1.5">
                <CopyText text={cluster?.cluster_iam_role_arn ?? "—"} />
              </span>
            }
          />
          <div className="space-y-5">
            <Field
              label="Cluster ARN"
              value={<CopyText text={cluster?.cluster_arn ?? "—"} />} 
            />
            <Field label="Platform version" value={cluster?.platform_version} />
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold">EKS Auto Mode</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          EKS automates routine cluster tasks for compute, storage, and
          networking to meet application compute needs.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 text-sm">
          <Field label="EKS Auto Mode" value="Enabled" />
          <Field
            label="Node IAM role"
            value={
              <span className="inline-flex items-start gap-1.5">
                <CopyText text={cluster?.node_iam_role_arn ?? "—"} />
                
              </span>
            }
          />
        </div>
      </div>
    </div>
  );
}
