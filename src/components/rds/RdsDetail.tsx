import { Header } from "@/components/layout/Header";
import { useParams, Link } from "react-router-dom";
import { ChevronRight, Copy, CheckCircle2, Info } from "lucide-react";
import { useRdsCluster } from "@/hooks/useRds";
import { useState } from "react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type DetailTab = "connectivity" | "configuration";
type ConnectUsing = "code" | "endpoints";

export function RdsDetail() {
  const { requestId, instanceIdentifier } = useParams<{ requestId: string; instanceIdentifier?: string }>();
  const { cluster, loading } = useRdsCluster(requestId);
  const [tab, setTab] = useState<DetailTab>("connectivity");
  const [connectUsing, setConnectUsing] = useState<ConnectUsing>("code");
  const [psqlPlatform, setPsqlPlatform] = useState<"macos" | "linux" | "windows">("macos");
  // const [connectTo, setConnectTo] = useState("Writer");
  const [showTokenDialog, setShowTokenDialog] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center text-muted-foreground">Loading RDS details...</div>
      </div>
    );
  }

  if (!cluster) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Database not found</p>
          <Link to="/aws/rds" className="text-primary hover:underline mt-2 inline-block">Back to RDS</Link>
        </div>
      </div>
    );
  }

  const isInstance = !!instanceIdentifier;
  const instance = isInstance
    ? cluster.instances.find((i) => i.instance_identifier === instanceIdentifier) ?? null
    : null;

  const dbIdentifier = isInstance && instance ? instance.instance_identifier : cluster.cluster_identifier;
  const engineVersion = isInstance && instance ? (instance.engine_version ?? cluster.engine_version) : cluster.engine_version;

  const primaryInstance = cluster.instances?.[0] ?? null;

  const connectivityData = isInstance && instance
    ? {
        endpoint: instance.endpoint ?? "",
        internetAccessGateway: instance.publicly_accessible ? "Public" : "Private",
        iamAuthentication: cluster.iam_auth_enabled ? "Enabled" : "Disabled",
        databaseName: cluster.database_name ?? "",
        masterUsername: cluster.master_username ?? "",
        port: instance.port ?? cluster.port ?? 5432,
        availabilityZone: instance.availability_zone ?? "—",
        subnets: Array.isArray(instance.subnets_json) ? instance.subnets_json as string[] : [],
        certificateAuthority: instance.ca_certificate_identifier ?? "",
        certificateAuthorityDate: instance.ca_certificate_expiry ?? "",
      }
    : {
        endpoint: cluster.endpoint ?? "",
        internetAccessGateway: primaryInstance?.publicly_accessible ? "Public" : "Private",
        iamAuthentication: cluster.iam_auth_enabled ? "Enabled" : "Disabled",
        databaseName: cluster.database_name ?? "",
        masterUsername: cluster.master_username ?? "",
        port: cluster.port ?? 5432,
        availabilityZone: primaryInstance?.availability_zone ?? "—",
        subnets: primaryInstance?.availability_zone ? [primaryInstance.availability_zone] : [],
        certificateAuthority: primaryInstance?.ca_certificate_identifier ?? "",
        certificateAuthorityDate: cluster.created_at ?? "",
      };

  const endpoints = isInstance ? [] : [
    { name: cluster.endpoint ?? "", status: "Available", type: "Writer", port: cluster.port ?? 5432 },
    { name: cluster.reader_endpoint ?? "", status: "Available", type: "Reader", port: cluster.port ?? 5432 },
  ].filter((ep) => ep.name);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  const mockToken = `${connectivityData.endpoint}:${connectivityData.port}/?Action=connect&DBUser=${connectivityData.masterUsername}&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAIOSFODNN7EXAMPLE&X-Amz-Date=20260707T000000Z&X-Amz-Expires=900&X-Amz-SignedHeaders=host&X-Amz-Signature=abcdef1234567890abcdef1234567890abcdef12`;

  return (
    <div className="space-y-4">
      <Header
        title={`RDS ${dbIdentifier}`}
        subtitle={`Details for ${dbIdentifier}`}
      />

      <Dialog open={showTokenDialog} onOpenChange={setShowTokenDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Get token for {dbIdentifier}</DialogTitle>
          </DialogHeader>
          <div>
            <p className="text-sm font-semibold mb-1">
              Authentication token (password)
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              Choose the authentication option that aligns with the policy
              attached to your IAM identity. Copy the authentication token and
              provide it as the password when you connect to your cluster. To
              learn more, see{" "}
              <a href="#" className="text-primary hover:underline">
                Understanding authentication and authorization ↗
              </a>
            </p>
            <div className="flex items-start gap-2 bg-blue-500/10 border border-blue-500/20 rounded-md px-4 py-3 mb-4 text-xs text-blue-400">
              <Info size={14} className="shrink-0 mt-0.5" />
              <span>
                The following authentication token will expire in 15 minutes
              </span>
            </div>
            <div className="bg-muted/20 border border-border rounded-md">
              <div className="flex items-start gap-3 px-4 py-3">
                <span className="text-xs text-muted-foreground shrink-0 mt-0.5">
                  1
                </span>
                <span className="font-mono text-xs text-foreground break-all flex-1">
                  {mockToken}
                </span>
                <button
                  onClick={() => copyToClipboard(mockToken, "Token")}
                  className="shrink-0 p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                >
                  <Copy size={14} />
                </button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="space-y-4 p-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/aws/rds" className="text-primary hover:underline">
            RDS
          </Link>
          <ChevronRight size={14} />
          {isInstance ? (
            <>
              <Link
                to={`/aws/rds/${cluster.request_id}`}
                className="text-primary hover:underline"
              >
                {cluster.cluster_identifier}
              </Link>
              <ChevronRight size={14} />
              <span>{dbIdentifier}</span>
            </>
          ) : (
            <span>{dbIdentifier}</span>
          )}
        </div>

        {/* Tabs */}
        <div className="border-b border-border">
          <div className="flex gap-6 text-sm px-1">
            {[
              { key: "connectivity", label: "Connectivity & security" },
              { key: "configuration", label: "Configuration" },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key as DetailTab)}
                className={`pb-2.5 -mb-px border-b-2 transition-colors ${
                  tab === t.key
                    ? "border-primary text-primary font-medium"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Connectivity Tab */}
        {tab === "connectivity" && (
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-lg p-5">
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-base font-semibold">Connect using</h2>
                <span className="text-xs bg-blue-500/10 text-blue-400 px-2 py-1 rounded">
                  Info
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label
                  onClick={() => setConnectUsing("code")}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${connectUsing === "code" ? "border-primary bg-primary/5" : "border-border/50 bg-muted/20 hover:border-primary/50"}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <input
                      type="radio"
                      name="connect"
                      checked={connectUsing === "code"}
                      readOnly
                      className="cursor-pointer"
                    />
                    <span className="text-sm font-medium text-foreground">
                      Code snippets
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Use when connecting through SDK, APIs, or third-party tools
                    including agents.
                  </p>
                </label>
                <label
                  onClick={() => setConnectUsing("endpoints")}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${connectUsing === "endpoints" ? "border-primary bg-primary/5" : "border-border/50 bg-muted/20 hover:border-primary/50"}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <input
                      type="radio"
                      name="connect"
                      checked={connectUsing === "endpoints"}
                      readOnly
                      className="cursor-pointer"
                    />
                    <span className="text-sm font-medium text-foreground">
                      Endpoints
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Use when connecting through any IDE interface.
                  </p>
                </label>
              </div>
            </div>

            {connectUsing === "code" && (
              <div className="bg-card border border-border rounded-lg p-5 space-y-5">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs font-semibold text-foreground mb-2">
                      Internet access gateway
                    </p>
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-400 font-medium">
                      <CheckCircle2 size={14} />
                      {connectivityData.internetAccessGateway}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground mb-2">
                      IAM Authentication
                    </p>
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-400 font-medium">
                      <CheckCircle2 size={14} />
                      {connectivityData.iamAuthentication}
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground mb-1">
                    IAM authentication token
                  </p>
                  <button
                    onClick={() => setShowTokenDialog(true)}
                    className="text-sm text-primary hover:underline font-medium"
                  >
                    Get token
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs text-muted-foreground mb-2 block font-medium">
                      Programming language
                    </label>
                    <Select
                      value={psqlPlatform}
                      onValueChange={(v) =>
                        setPsqlPlatform(v as "macos" | "linux" | "windows")
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="macos">psql (macOS)</SelectItem>
                        <SelectItem value="linux">psql (Linux)</SelectItem>
                        <SelectItem value="windows">psql (Windows)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-2 block font-medium">
                      Connect to
                    </label>
                    <Select value="Writer" disabled>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Writer">Writer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <h2 className="text-base font-semibold mb-1">
                    Connection steps
                  </h2>
                  <p className="text-xs text-muted-foreground mb-4">
                    Follow the steps below to paste the code of each step in
                    your tool and run the commands.
                  </p>
                  <div className="space-y-4">
                    {getConnectionSteps(
                      psqlPlatform,
                      connectivityData.endpoint,
                      connectivityData.masterUsername,
                      connectivityData.databaseName,
                      connectivityData.port,
                      cluster.master_user_secret_arn ?? "",
                      cluster.region ?? "us-east-1",
                    ).map((step, idx) => (
                      <div key={idx} className="flex gap-3">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-foreground">
                              {step.label}
                            </p>
                            <button
                              onClick={() =>
                                copyToClipboard(step.code, step.label)
                              }
                              className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                            >
                              <Copy size={14} />
                            </button>
                          </div>
                          <pre className="bg-muted/20 border border-border rounded p-3 font-mono text-xs text-foreground overflow-x-auto whitespace-pre-wrap">
                            {step.code}
                          </pre>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {connectUsing === "endpoints" && (
              <>
                <div className="bg-card border border-border rounded-lg p-5">
                  <div className="grid grid-cols-4 gap-6 mb-4">
                    <FieldWithCopy
                      label="Database name"
                      value={connectivityData.databaseName}
                    />
                    <FieldWithCopy
                      label="Master username"
                      value={connectivityData.masterUsername}
                    />
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">
                        Internet access gateway
                      </div>
                      <div className="inline-flex items-center gap-1.5 text-emerald-400 text-sm">
                        <CheckCircle2 size={14} />
                        {connectivityData.internetAccessGateway}
                      </div>
                    </div>
                    <FieldWithCopy
                      label="Port"
                      value={String(connectivityData.port)}
                    />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">
                      IAM authentication token
                    </div>
                    <button
                      onClick={() => setShowTokenDialog(true)}
                      className="text-sm text-primary hover:underline font-medium"
                    >
                      Get token
                    </button>
                  </div>
                </div>

                {!isInstance && (
                  <div className="bg-card border border-border rounded-lg overflow-hidden">
                    <div className="px-5 py-4 border-b border-border">
                      <h2 className="text-base font-semibold">
                        Endpoints ({endpoints.length})
                      </h2>
                    </div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-muted-foreground border-b border-border bg-muted/20">
                          <th className="px-5 py-3 text-left font-medium">
                            Endpoint name
                          </th>
                          <th className="px-5 py-3 text-left font-medium">
                            Status
                          </th>
                          <th className="px-5 py-3 text-left font-medium">
                            Type
                          </th>
                          <th className="px-5 py-3 text-left font-medium">
                            Port
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {endpoints.map((ep, idx) => (
                          <tr
                            key={idx}
                            className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
                          >
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2">
                                <Copy
                                  size={14}
                                  className="text-muted-foreground cursor-pointer hover:text-primary shrink-0"
                                  onClick={() =>
                                    copyToClipboard(ep.name, "Endpoint")
                                  }
                                />
                                <span className="font-mono text-xs text-primary">
                                  {ep.name}
                                </span>
                              </div>
                            </td>
                            <td className="px-5 py-3">
                              <span className="inline-flex items-center gap-1.5 text-emerald-400">
                                <CheckCircle2 size={14} /> {ep.status}
                              </span>
                            </td>
                            <td className="px-5 py-3">{ep.type}</td>
                            <td className="px-5 py-3">{ep.port}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {isInstance && (
                  <AdditionalConfigurations
                    connectivityData={connectivityData}
                    copyToClipboard={copyToClipboard}
                  />
                )}
              </>
            )}
          </div>
        )}

        {/* Configuration Tab */}
        {tab === "configuration" && (
          <div className="bg-card border border-border rounded-lg p-5">
            <h2 className="text-base font-semibold mb-5">
              {isInstance ? "Instance" : "Database"}
            </h2>
            <div
              className={`grid gap-0 divide-x divide-border ${isInstance ? "grid-cols-4" : "grid-cols-5"}`}
            >
              {/* Col 1: Configuration */}
              <div className="pr-6">
                <p className="text-xs font-semibold text-foreground mb-4">
                  Configuration
                </p>
                <div className="space-y-4">
                  {isInstance && instance ? (
                    <>
                      <ConfigField
                        label="DB instance ID"
                        value={instance.instance_identifier}
                      />
                      <ConfigField
                        label="Engine version"
                        value={engineVersion}
                      />
                      <ConfigField
                        label="RDS Extended Support"
                        value="Enabled"
                      />
                      <ConfigField label="DB name" value="—" />
                      <ConfigField
                        label="Option groups"
                        value={
                          <span className="text-primary text-xs">
                            default.aurora-postgresql17
                          </span>
                        }
                      />
                      <ConfigField
                        label="Amazon Resource Name (ARN)"
                        value={
                          <div className="flex items-start gap-1">
                            <Copy
                              size={12}
                              className="text-muted-foreground cursor-pointer hover:text-primary mt-0.5 shrink-0"
                              onClick={() =>
                                copyToClipboard(
                                  instance.instance_arn ?? "",
                                  "ARN",
                                )
                              }
                            />
                            <span className="text-xs text-primary break-all">
                              {instance.instance_arn ?? "—"}
                            </span>
                          </div>
                        }
                      />
                      <ConfigField
                        label="Resource ID"
                        value={instance.resource_id ?? "—"}
                      />
                      <ConfigField
                        label="Created time"
                        value={
                          instance.created_at
                            ? new Date(instance.created_at).toLocaleString()
                            : "—"
                        }
                      />
                      <ConfigField
                        label="DB instance parameter group"
                        value={
                          <span className="text-primary text-xs">
                            default.aurora-postgresql17{" "}
                            <span className="text-emerald-400">✓ In sync</span>
                          </span>
                        }
                      />
                      <ConfigField
                        label="DB cluster parameter group"
                        value={
                          <span className="text-primary text-xs">
                            default.aurora-postgresql17{" "}
                            <span className="text-emerald-400">✓ In sync</span>
                          </span>
                        }
                      />
                      <ConfigField
                        label="Architecture settings"
                        value="Non-multitenant architecture"
                      />
                    </>
                  ) : (
                    <>
                      <ConfigField
                        label="DB cluster role"
                        value="Regional cluster"
                      />
                      <ConfigField
                        label="Engine version"
                        value={engineVersion}
                      />
                      <ConfigField
                        label="RDS Extended Support"
                        value="Enabled"
                      />
                      <ConfigField
                        label="Resource ID"
                        value={cluster.resource_id ?? "—"}
                      />
                      <ConfigField
                        label="Cluster storage configuration"
                        value="Aurora Standard"
                      />
                      <ConfigField
                        label="Amazon Resource Name (ARN)"
                        value={
                          <div className="flex items-start gap-1">
                            <Copy
                              size={12}
                              className="text-muted-foreground cursor-pointer hover:text-primary mt-0.5 shrink-0"
                              onClick={() =>
                                copyToClipboard(
                                  cluster.cluster_arn ?? "",
                                  "ARN",
                                )
                              }
                            />
                            <span className="text-xs text-primary break-all">
                              {cluster.cluster_arn ?? "—"}
                            </span>
                          </div>
                        }
                      />
                      <ConfigField label="Network type" value="—" />
                    </>
                  )}
                </div>
              </div>

              {/* Col 2: Capacity / Instance configuration */}
              <div className="px-6">
                {isInstance && instance ? (
                  <>
                    <p className="text-xs font-semibold text-foreground mb-4">
                      Instance configuration
                    </p>
                    <div className="space-y-4">
                      <ConfigField
                        label="Instance type"
                        value={
                          instance.instance_class === "db.serverless"
                            ? "Aurora serverless"
                            : instance.instance_class
                        }
                      />
                      <ConfigField
                        label="Minimum capacity"
                        value={`${cluster.min_acu ?? 0} ACUs`}
                      />
                      <ConfigField
                        label="Maximum capacity"
                        value={`${cluster.max_acu ?? 8} ACUs`}
                      />
                      <ConfigField label="Platform version" value="4" />
                      <ConfigField
                        label="Allowed DB Cluster idle time before pausing"
                        value={
                          cluster.auto_pause_seconds
                            ? `${Math.floor(cluster.auto_pause_seconds / 60)}:${String(cluster.auto_pause_seconds % 60).padStart(2, "0")}:00`
                            : "—"
                        }
                      />
                    </div>
                    <p className="text-xs font-semibold text-foreground mt-6 mb-4">
                      Availability
                    </p>
                    <div className="space-y-4">
                      <ConfigField
                        label="Failover priority"
                        value={String(instance.failover_priority ?? 1)}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-xs font-semibold text-foreground mb-4">
                      Capacity type
                    </p>
                    <div className="space-y-4">
                      <ConfigField
                        label=""
                        value={
                          cluster.engine_mode === "provisioned"
                            ? "Provisioned"
                            : (cluster.engine_mode ?? "Provisioned")
                        }
                      />
                      <ConfigField
                        label="Local read replica write forwarding"
                        value={
                          <span className="inline-flex items-center gap-1 text-muted-foreground">
                            ⊘ Disabled
                          </span>
                        }
                      />
                      <ConfigField
                        label="DB cluster ID"
                        value={cluster.cluster_identifier}
                      />
                      <ConfigField
                        label="DB cluster parameter group"
                        value={
                          <span className="text-primary text-xs">
                            {cluster.parameter_group ??
                              "default.aurora-postgresql17"}
                          </span>
                        }
                      />
                      <ConfigField
                        label="Deletion protection"
                        value="Disabled"
                      />
                      <ConfigField
                        label="Limitless Database"
                        value="Disabled"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Col 3: Authentication (cluster) / Primary storage (instance) */}
              <div className="px-6">
                {isInstance ? (
                  <>
                    <p className="text-xs font-semibold text-foreground mb-4">
                      Primary storage
                    </p>
                    <div className="space-y-4">
                      <ConfigField
                        label="Encryption key"
                        value="AWS owned KMS key"
                      />
                      <ConfigField
                        label="Storage type"
                        value={cluster.storage_type ?? "aurora"}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-xs font-semibold text-foreground mb-4">
                      Authentication
                    </p>
                    <div className="space-y-4">
                      <ConfigField
                        label="IAM DB authentication"
                        value={
                          <span className="text-primary text-sm">
                            {cluster.iam_auth_enabled ? "Enabled" : "Disabled"}
                          </span>
                        }
                      />
                      <ConfigField
                        label="Kerberos authentication"
                        value={
                          <span className="text-muted-foreground text-sm">
                            Not enabled
                          </span>
                        }
                      />
                      <ConfigField
                        label="Master username"
                        value={
                          <span className="text-primary text-sm">
                            {cluster.master_username ?? "—"}
                          </span>
                        }
                      />
                    </div>
                    <p className="text-xs font-semibold text-foreground mt-6 mb-4">
                      Availability
                    </p>
                    <div className="space-y-4">
                      <ConfigField label="Multi-AZ" value="No" />
                    </div>
                  </>
                )}
              </div>

              {/* Col 4: Encryption (cluster only) */}
              {!isInstance && (
                <div className="px-6">
                  <p className="text-xs font-semibold text-foreground mb-4">
                    Encryption
                  </p>
                  <div className="space-y-4">
                    <ConfigField
                      label="Encryption"
                      value={
                        cluster.encryption_enabled ? "Enabled" : "Disabled"
                      }
                    />
                    <ConfigField
                      label="Encryption key"
                      value={
                        cluster.kms_key_id ? (
                          <span className="text-primary text-xs">
                            {cluster.kms_key_id}
                          </span>
                        ) : (
                          "AWS owned KMS key"
                        )
                      }
                    />
                  </div>
                </div>
              )}

              {/* Last Col: Monitoring */}
              <div className="pl-6">
                <p className="text-xs font-semibold text-foreground mb-4">
                  Monitoring
                </p>
                <div className="space-y-4">
                  <ConfigField
                    label="Monitoring type"
                    value="Database Insights - Standard"
                  />
                  <ConfigField label="Performance Insights" value="Disabled" />
                  <ConfigField label="Enhanced Monitoring" value="Disabled" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FieldWithCopy({ label, value }: { label: string; value: string }) {
  const handleCopy = () => { navigator.clipboard.writeText(value); toast.success(`${label} copied`); };
  return (
    <div>
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className="flex items-center gap-2">
        <Copy size={14} className="text-muted-foreground cursor-pointer hover:text-primary transition-colors" onClick={handleCopy} />
        <span className="text-sm font-mono break-all">{value}</span>
      </div>
    </div>
  );
}

function AdditionalConfigurations({
  connectivityData,
  copyToClipboard,
}: {
  connectivityData: { endpoint: string; port: number; availabilityZone: string; subnets: string[]; certificateAuthority: string; certificateAuthorityDate: string };
  copyToClipboard: (text: string, label: string) => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center gap-2 px-5 py-4 text-sm font-semibold text-foreground hover:bg-muted/20 transition-colors">
        <ChevronRight size={14} className={`transition-transform ${open ? "rotate-90" : ""}`} />
        Additional configurations
      </button>
      {open && (
        <div className="border-t border-border p-5">
          <h3 className="text-sm font-semibold mb-4">Connectivity & security</h3>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <p className="text-xs font-semibold text-foreground mb-3">Endpoint & port</p>
              <div className="mb-3">
                <div className="text-xs text-muted-foreground mb-1">Endpoint</div>
                <div className="flex items-center gap-1.5">
                  <Copy size={13} className="text-muted-foreground cursor-pointer hover:text-primary shrink-0" onClick={() => copyToClipboard(connectivityData.endpoint, "Endpoint")} />
                  <span className="font-mono text-xs text-primary break-all">{connectivityData.endpoint || "—"}</span>
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Port</div>
                <div className="text-sm">{connectivityData.port}</div>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground mb-3">Networking</p>
              <div className="mb-3">
                <div className="text-xs text-muted-foreground mb-1">Availability Zone</div>
                <div className="text-sm">{connectivityData.availabilityZone}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Subnets</div>
                <div className="space-y-1">
                  {connectivityData.subnets.length > 0
                    ? connectivityData.subnets.map((s) => <div key={s} className="font-mono text-xs text-primary">{s}</div>)
                    : <div className="text-xs text-muted-foreground">—</div>
                  }
                </div>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground mb-3">Security</p>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Certificate authority</div>
                <div className="text-sm">{connectivityData.certificateAuthority || "—"}</div>
                                {connectivityData.certificateAuthorityDate && (
                  <div className="text-xs text-muted-foreground mt-1">{connectivityData.certificateAuthorityDate}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ConfigField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      {label && <div className="text-xs text-muted-foreground mb-0.5">{label}</div>}
      <div className="text-sm text-foreground break-words">{value ?? "—"}</div>
    </div>
  );
}


function getConnectionSteps(
  platform: "macos" | "linux" | "windows",
  endpoint: string,
  masterUsername: string,
  databaseName: string,
  port: number,
  secretArn: string,
  region: string
): { label: string; code: string }[] {
  const isWindows = platform === "windows";

  const downloadCert = {
    label: "Download SSL certificate",
    code: "curl -o global-bundle.pem https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem",
  };

  if (isWindows) {
    return [
      downloadCert,
      {
        label: "Connect using psql",
        code: `psql "host=${endpoint} port=${port} dbname=${databaseName} user=${masterUsername} sslmode=verify-full sslrootcert=./global-bundle.pem password=$( ($s = aws secretsmanager get-secret-value --secret-id ${secretArn} --region ${region} | ConvertFrom-Json).SecretString | ConvertFrom-Json | Select-Object -ExpandProperty password )"`,
      },
    ];
  }

  // macOS and Linux — same snippet
  return [
    downloadCert,
    {
      label: "Set host variable",
      code: `export RDSHOST="${endpoint}"`,
    },
    {
      label: "Connect using psql",
      code: `psql "host=$RDSHOST port=${port} dbname=${databaseName} user=${masterUsername} sslmode=verify-full sslrootcert=./global-bundle.pem password=$(aws secretsmanager get-secret-value --secret-id '${secretArn}' --region ${region} --query SecretString --output text | jq -r '.password')"`,
    },
  ];
}
