import { CLUSTER } from "./eksData";
import { CopyText, Field } from "./eksShared";

export function OverviewTab() {
  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-lg p-5">
        <h2 className="text-sm font-semibold mb-4">Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-5 text-sm">
          <Field
            label="API server endpoint"
            value={<CopyText text={CLUSTER.apiServerEndpoint} />}
          />
          <Field
            label="OpenID Connect provider URL"
            value={<CopyText text={CLUSTER.oidcProviderUrl} />}
          />
          <Field label="Created" value={<CopyText text={CLUSTER.created} />} />
          <Field
            label="Certificate authority"
            value={
              <textarea
                readOnly
                value={CLUSTER.certificateAuthority}
                className="w-full h-20 text-xs font-mono bg-muted/40 border border-border rounded p-2 resize-none"
              />
            }
          />
          <Field
            label="Cluster IAM role ARN"
            value={
              <span className="inline-flex items-start gap-1.5">
                <CopyText text={CLUSTER.clusterIamRoleArn} />
                <a
                  className="text-primary hover:underline whitespace-nowrap"
                  href="#"
                >
                  View in IAM
                </a>
              </span>
            }
          />
          <div className="space-y-5">
            <Field
              label="Cluster ARN"
              value={<CopyText text={CLUSTER.clusterArn} />}
            />
            <Field label="Platform version" value={CLUSTER.platformVersion} />
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
                <CopyText text={CLUSTER.nodeIamRole} />
                <a
                  className="text-primary hover:underline whitespace-nowrap"
                  href="#"
                >
                  View in IAM
                </a>
              </span>
            }
          />
        </div>
      </div>
    </div>
  );
}
