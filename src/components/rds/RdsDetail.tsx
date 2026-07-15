import { Header } from "@/components/layout/Header";
import { useParams, Link } from "react-router-dom";
import { ChevronRight, Copy, CheckCircle2 } from "lucide-react";
import { useResources } from "@/lib/lbLocalStore";
import { RdsRow } from "./RdsList";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Info } from "lucide-react";

type DetailTab = "connectivity" | "configuration";
type ConnectUsing = "code" | "endpoints";

export function RdsDetail() {
  const { id } = useParams<{ id: string }>();
  const { resources } = useResources("rds");
  const [tab, setTab] = useState<DetailTab>("connectivity");
  const [connectUsing, setConnectUsing] = useState<ConnectUsing>("code");
  const [programmingLanguage, setProgrammingLanguage] = useState("Node.js");
  const [connectTo, setConnectTo] = useState("Writer");
  const [showTokenDialog, setShowTokenDialog] = useState(false);

  const resource = resources.find((r) => r.id === id);
  const row = resource?.meta as RdsRow | undefined;

  if (!row) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Database not found</p>
          <Link to="/aws/rds" className="text-primary hover:underline mt-2 inline-block">
            Back to RDS
          </Link>
        </div>
      </div>
    );
  }

  const isInstance = !row.isCluster;

  // Mock connectivity data
  const connectivityData = {
    databaseName: "postgres",
    masterUsername: "postgres",
    endpoint: `${row.dbIdentifier}.cmpzfoy16.us-east-1.rds.amazonaws.com`,
    port: 5432,
    internetAccessGateway: "Enabled",
    iamAuthentication: "Enabled",
    certificateAuthority: "rds-ca-2024-q1",
    certificateAuthorityDate: "May 26, 2061, 05:04 (UTC+05:30)",
    dbInstanceCertificateExpirationDate: "July 07, 2027, 18:37 (UTC+05:30)",
    availabilityZone: row.region,
    subnets: ["subnet-12345678", "subnet-87654321"],
  };

  // Mock endpoints data
  const endpoints = [
    {
      name: `${row.dbIdentifier}-cluster-cmzfoy16.us-east-1.rds.amazonaws.com`,
      status: "Available",
      type: "Writer",
      port: 5432,
    },
    {
      name: `${row.dbIdentifier}-cluster-ro-cmzfoy16.us-east-1.rds.amazonaws.com`,
      status: "Available",
      type: "Reader",
      port: 5432,
    },
  ];

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  const mockToken = `${connectivityData.endpoint}:5432/?Action=connect&DBUser=postgres&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAIOSFODNN7EXAMPLE&X-Amz-Date=20260707T000000Z&X-Amz-Expires=900&X-Amz-SignedHeaders=host&X-Amz-Signature=abcdef1234567890abcdef1234567890abcdef12`;

  return (
    <div className="space-y-4">
      <Header title={`RDS ${row.dbIdentifier}`} subtitle={`Details for ${row.dbIdentifier}`} />

      {/* IAM Token Dialog */}
      <Dialog open={showTokenDialog} onOpenChange={setShowTokenDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Get token for {row.dbIdentifier}</DialogTitle>
          </DialogHeader>
          <div>
            <p className="text-sm font-semibold mb-1">Authentication token (password)</p>
            <p className="text-xs text-muted-foreground mb-4">
              Choose the authentication option that aligns with the policy attached to your IAM identity. Copy the authentication token and provide it as the password when you connect to your cluster. To learn more, see{" "}
              <a href="#" className="text-primary hover:underline">Understanding authentication and authorization ↗</a>
            </p>
            <div className="flex items-start gap-2 bg-blue-500/10 border border-blue-500/20 rounded-md px-4 py-3 mb-4 text-xs text-blue-400">
              <Info size={14} className="shrink-0 mt-0.5" />
              <span>The following authentication token will expire in 15 minutes on July 7, 2026 at 19:38</span>
            </div>
            <div className="bg-muted/20 border border-border rounded-md">
              <div className="flex items-start gap-3 px-4 py-3">
                <span className="text-xs text-muted-foreground shrink-0 mt-0.5">1</span>
                <span className="font-mono text-xs text-foreground break-all flex-1">{mockToken}</span>
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
          <span>{row.dbIdentifier}</span>
        </div>

        {/* Tabs Navigation */}
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

        {/* Connectivity & Security Tab */}
        {tab === "connectivity" && (
          <div className="space-y-4">
            {/* Connect using section */}
            <div className="bg-card border border-border rounded-lg p-5">
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-base font-semibold">Connect using</h2>
                <span className="text-xs bg-blue-500/10 text-blue-400 px-2 py-1 rounded">Info</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label
                  onClick={() => setConnectUsing("code")}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    connectUsing === "code"
                      ? "border-primary bg-primary/5"
                      : "border-border/50 bg-muted/20 hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <input type="radio" name="connect" checked={connectUsing === "code"} readOnly className="cursor-pointer" />
                    <span className="text-sm font-medium text-foreground">Code snippets</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Use when connecting through SDK, APIs, or third-party tools including agents.</p>
                </label>

                <label
                  onClick={() => setConnectUsing("endpoints")}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    connectUsing === "endpoints"
                      ? "border-primary bg-primary/5"
                      : "border-border/50 bg-muted/20 hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <input type="radio" name="connect" checked={connectUsing === "endpoints"} readOnly className="cursor-pointer" />
                    <span className="text-sm font-medium text-foreground">Endpoints</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Use when connecting through any IDE interface.</p>
                </label>
              </div>
            </div>

            {/* Code Snippets View */}
            {connectUsing === "code" && (
              <div className="bg-card border border-border rounded-lg p-5 space-y-5">
                {/* Internet access gateway + IAM Authentication side by side */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs font-semibold text-foreground mb-2">Internet access gateway</p>
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-400 font-medium">
                      <CheckCircle2 size={14} />
                      {connectivityData.internetAccessGateway}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground mb-2">IAM Authentication</p>
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-400 font-medium">
                      <CheckCircle2 size={14} />
                      {connectivityData.iamAuthentication}
                    </div>
                  </div>
                </div>

                {/* IAM authentication token */}
                <div>
                  <p className="text-xs font-semibold text-foreground mb-1">IAM authentication token</p>
                  <button onClick={() => setShowTokenDialog(true)} className="text-sm text-primary hover:underline font-medium">Get token</button>
                </div>

                {/* Programming language + Connect to */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs text-muted-foreground mb-2 block font-medium">Programming language</label>
                    <Select value={programmingLanguage} onValueChange={setProgrammingLanguage}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["Node.js", "Python", "Java", "Go", "Ruby", "PHP", "C#"].map((lang) => (
                          <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-2 block font-medium">Connect to</label>
                    <Select value={connectTo} onValueChange={setConnectTo}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Writer">Writer</SelectItem>
                        <SelectItem value="Reader">Reader</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Connection steps */}
                <div>
                  <h2 className="text-base font-semibold mb-1">Connection steps</h2>
                  <p className="text-xs text-muted-foreground mb-4">Follow the steps below to paste the code of each step in your tool and run the commands. The snippets dynamically reflect the authentication configuration.</p>
                  <div className="space-y-4">
                    {getConnectionSteps(programmingLanguage, connectivityData.endpoint).map((step, idx) => (
                      <div key={idx} className="flex gap-3">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">{idx + 1}</div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-foreground">{step.label}</p>
                            <button
                              onClick={() => copyToClipboard(step.code, step.label)}
                              className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                            >
                              <Copy size={14} />
                            </button>
                          </div>
                          <pre className="bg-muted/20 border border-border rounded p-3 font-mono text-xs text-foreground overflow-x-auto whitespace-pre-wrap">{step.code}</pre>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Endpoints View */}
            {connectUsing === "endpoints" && (
              <>
                {/* Top info card: 4 columns + IAM token */}
                <div className="bg-card border border-border rounded-lg p-5">
                  <div className="grid grid-cols-4 gap-6 mb-4">
                    <FieldWithCopy label="Database name" value={connectivityData.databaseName} />
                    <FieldWithCopy label="Master username" value={connectivityData.masterUsername} />
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Internet access gateway</div>
                      <div className="inline-flex items-center gap-1.5 text-emerald-400 text-sm">
                        <CheckCircle2 size={14} />
                        {connectivityData.internetAccessGateway}
                      </div>
                    </div>
                    <FieldWithCopy label="Port" value={String(connectivityData.port)} />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">IAM authentication token</div>
                    <button onClick={() => setShowTokenDialog(true)} className="text-sm text-primary hover:underline font-medium">Get token</button>
                  </div>
                </div>

                {/* DB (cluster): Endpoints table */}
                {!isInstance && (
                  <div className="bg-card border border-border rounded-lg overflow-hidden">
                    <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                      <h2 className="text-base font-semibold">Endpoints ({endpoints.length})</h2>
                      {/* <Button variant="outline" size="sm">Create custom endpoint</Button> */}
                    </div>
                    {/* <div className="px-5 py-3 border-b border-border">
                      <input
                        type="text"
                        placeholder="Filter resources"
                        className="w-64 px-3 py-1.5 rounded-md border border-border bg-muted/20 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                    </div> */}
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-muted-foreground border-b border-border bg-muted/20">
                          <th className="px-5 py-3 text-left font-medium">Endpoint name</th>
                          <th className="px-5 py-3 text-left font-medium">Status</th>
                          <th className="px-5 py-3 text-left font-medium">Type</th>
                          <th className="px-5 py-3 text-left font-medium">Port</th>
                        </tr>
                      </thead>
                      <tbody>
                        {endpoints.map((ep, idx) => (
                          <tr key={idx} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2">
                                <Copy size={14} className="text-muted-foreground cursor-pointer hover:text-primary shrink-0" onClick={() => copyToClipboard(ep.name, "Endpoint")} />
                                <span className="font-mono text-xs text-primary">{ep.name}</span>
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

                {/* Instance: Additional configurations collapsible */}
                {isInstance && (
                  <AdditionalConfigurations connectivityData={connectivityData} copyToClipboard={copyToClipboard} />
                )}
              </>
            )}

          </div>
        )}

        {/* Configuration Tab */}
        {tab === "configuration" && (
          <div className="bg-card border border-border rounded-lg p-5">
            <h2 className="text-base font-semibold mb-5">{isInstance ? "Instance" : "Database"}</h2>
            <div className={`grid gap-0 divide-x divide-border ${isInstance ? "grid-cols-4" : "grid-cols-5"}`}>

              {/* Col 1: Configuration */}
              <div className="pr-6">
                <p className="text-xs font-semibold text-foreground mb-4">Configuration</p>
                <div className="space-y-4">
                  {isInstance ? (
                    <>
                      <ConfigField label="DB instance ID" value={row.dbIdentifier} />
                      <ConfigField label="Engine version" value={row.engineVersion} />
                      <ConfigField label="RDS Extended Support" value="Enabled" />
                      <ConfigField label="DB name" value="—" />
                      <ConfigField label="Option groups" value={<span className="text-primary text-xs">default.aurora-postgresql17</span>} />
                      <ConfigField label="Amazon Resource Name (ARN)" value={
                        <div className="flex items-start gap-1">
                          <Copy size={12} className="text-muted-foreground cursor-pointer hover:text-primary mt-0.5 shrink-0" onClick={() => copyToClipboard(`arn:aws:rds:us-east-1:566889948003:db:${row.dbIdentifier}`, "ARN")} />
                          <span className="text-xs text-primary break-all">arn:aws:rds:us-east-1:566889948003:db:{row.dbIdentifier}</span>
                        </div>
                      } />
                      <ConfigField label="Resource ID" value="db-5JQJ54F5GDSGULEB0GQPQE" />
                      <ConfigField label="Created time" value="July 07, 2026, 18:37 (UTC+05:30)" />
                      <ConfigField label="DB instance parameter group" value={<span className="text-primary text-xs">default.aurora-postgresql17 <span className="text-emerald-400">✓ In sync</span></span>} />
                      <ConfigField label="DB cluster parameter group" value={<span className="text-primary text-xs">default.aurora-postgresql17 <span className="text-emerald-400">✓ In sync</span></span>} />
                      <ConfigField label="Architecture settings" value="Non-multitenant architecture" />
                    </>
                  ) : (
                    <>
                      <ConfigField label="DB cluster role" value="Regional cluster" />
                      <ConfigField label="Engine version" value={row.engineVersion} />
                      <ConfigField label="RDS Extended Support" value="Enabled" />
                      <ConfigField label="Resource ID" value="cluster-TXMNXDWWPHZ4VG7CHN3PMAO25Q" />
                      <ConfigField label="Cluster storage configuration" value="Aurora Standard" />
                      <ConfigField label="Amazon Resource Name (ARN)" value={
                        <div className="flex items-start gap-1">
                          <Copy size={12} className="text-muted-foreground cursor-pointer hover:text-primary mt-0.5 shrink-0" onClick={() => copyToClipboard(`arn:aws:rds:us-east-1:566889948003:cluster:${row.dbIdentifier}`, "ARN")} />
                          <span className="text-xs text-primary break-all">arn:aws:rds:us-east-1:566889948003:cluster:{row.dbIdentifier}</span>
                        </div>
                      } />
                      <ConfigField label="Network type" value="—" />
                    </>
                  )}
                </div>
              </div>

              {/* Col 2: Capacity / Instance configuration */}
              <div className="px-6">
                {isInstance ? (
                  <>
                    <p className="text-xs font-semibold text-foreground mb-4">Instance configuration</p>
                    <div className="space-y-4">
                      <ConfigField label="Instance type" value="Aurora serverless" />
                      <ConfigField label="Minimum capacity" value="0 ACUs (0 GiB)" />
                      <ConfigField label="Maximum capacity" value="16 ACUs (32 GiB)" />
                      <ConfigField label="Platform version" value="4 (Version 4 offering scaling up to 256 ACUs, and performance improvement up to 30% compared to version 3)" />
                      <ConfigField label="Allowed DB Cluster idle time before pausing" value="00:05:00" />
                    </div>
                    <p className="text-xs font-semibold text-foreground mt-6 mb-4">Availability</p>
                    <div className="space-y-4">
                      <ConfigField label="Failover priority" value="1" />
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-xs font-semibold text-foreground mb-4">Capacity type</p>
                    <div className="space-y-4">
                      <ConfigField label="" value="Provisioned" />
                      <ConfigField label="Local read replica write forwarding" value={<span className="inline-flex items-center gap-1 text-muted-foreground">⊘ Disabled</span>} />
                      <ConfigField label="DB cluster ID" value={row.dbIdentifier} />
                      <ConfigField label="DB cluster parameter group" value={<span className="text-primary text-xs">default.aurora-postgresql17</span>} />
                      <ConfigField label="Deletion protection" value="Disabled" />
                      <ConfigField label="Limitless Database" value="Disabled" />
                    </div>
                  </>
                )}
              </div>

              {/* Col 3: Authentication (DB) / Primary storage (Instance) */}
              <div className="px-6">
                {isInstance ? (
                  <>
                    <p className="text-xs font-semibold text-foreground mb-4">Primary storage</p>
                    <div className="space-y-4">
                      <ConfigField label="Encryption key" value="AWS owned KMS key" />
                      <ConfigField label="Storage type" value="—" />
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-xs font-semibold text-foreground mb-4">Authentication</p>
                    <div className="space-y-4">
                      <ConfigField label="IAM DB authentication" value={<span className="text-primary text-sm">Enabled</span>} />
                      <ConfigField label="Kerberos authentication" value={<span className="text-muted-foreground text-sm">Not enabled</span>} />
                      <ConfigField label="Master username" value={<span className="text-primary text-sm">postgres</span>} />
                    </div>
                    <p className="text-xs font-semibold text-foreground mt-6 mb-4">Availability</p>
                    <div className="space-y-4">
                      <ConfigField label="Multi-AZ" value="No" />
                    </div>
                  </>
                )}
              </div>

              {/* Col 4: Encryption (DB only) */}
              {!isInstance && (
                <div className="px-6">
                  <p className="text-xs font-semibold text-foreground mb-4">Encryption</p>
                  <div className="space-y-4">
                    <ConfigField label="Encryption key" value="AWS owned KMS key" />
                  </div>
                </div>
              )}

              {/* Last Col: Monitoring */}
              <div className="pl-6">
                <p className="text-xs font-semibold text-foreground mb-4">Monitoring</p>
                <div className="space-y-4">
                  <ConfigField label="Monitoring type" value="Database Insights - Standard" />
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

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className="text-sm">{value ?? "—"}</div>
    </div>
  );
}

function FieldWithCopy({ label, value }: { label: string; value: string }) {
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  };

  return (
    <div>
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className="flex items-center gap-2">
        <Copy
          size={14}
          className="text-muted-foreground cursor-pointer hover:text-primary transition-colors"
          onClick={handleCopy}
        />
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
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-5 py-4 text-sm font-semibold text-foreground hover:bg-muted/20 transition-colors"
      >
        <ChevronRight size={14} className={`transition-transform ${open ? "rotate-90" : ""}`} />
        Additional configurations
      </button>
      {open && (
        <div className="border-t border-border">
          <div className="p-5">
            <h3 className="text-sm font-semibold mb-4">Connectivity &amp; security</h3>
            <div className="grid grid-cols-3 gap-6">
              {/* Endpoint & port */}
              <div>
                <p className="text-xs font-semibold text-foreground mb-3">Endpoint &amp; port</p>
                <div className="mb-3">
                  <div className="text-xs text-muted-foreground mb-1">Endpoint</div>
                  <div className="flex items-center gap-1.5">
                    <Copy size={13} className="text-muted-foreground cursor-pointer hover:text-primary shrink-0" onClick={() => copyToClipboard(connectivityData.endpoint, "Endpoint")} />
                    <span className="font-mono text-xs text-primary break-all">{connectivityData.endpoint}</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Port</div>
                  <div className="text-sm">{connectivityData.port}</div>
                </div>
              </div>
              {/* Networking */}
              <div>
                <p className="text-xs font-semibold text-foreground mb-3">Networking</p>
                <div className="mb-3">
                  <div className="text-xs text-muted-foreground mb-1">Availability Zone</div>
                  <div className="text-sm">{connectivityData.availabilityZone}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Subnets</div>
                  <div className="space-y-1">
                    {connectivityData.subnets.map((s) => (
                      <div key={s} className="font-mono text-xs text-primary">{s}</div>
                    ))}
                  </div>
                </div>
              </div>
              {/* Security */}
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

function getConnectionSteps(lang: string, endpoint: string): { label: string; code: string }[] {
  const steps: Record<string, { label: string; code: string }[]> = {
    "Node.js": [
      { label: "Install required packages", code: "npm install pg aws-sdk" },
      {
        label: "Connection code",
        code: `const { Client } = require('pg');
const aws = require('aws-sdk');
const signer = new aws.RDS.Signer({ region: 'us-east-1', hostname: '${endpoint}', port: 5432, username: 'postgres' });
const password = signer.getAuthToken({});

const client = new Client({
  host: '${endpoint}',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password,
  ssl: { rejectUnauthorized: false }
});
await client.connect();`,
      },
    ],
    "Python": [
      { label: "Install required packages", code: "pip install psycopg2-binary boto3" },
      {
        label: "Connection code",
        code: `import boto3
import psycopg2

client = boto3.client('rds', region_name='us-east-1')
token = client.generate_db_auth_token(
    DBHostname='${endpoint}',
    Port=5432,
    DBUsername='postgres'
)

conn = psycopg2.connect(
    host='${endpoint}',
    port=5432,
    database='postgres',
    user='postgres',
    password=token,
    sslmode='require'
)`,
      },
    ],
    "Java": [
      {
        label: "Add Maven dependency",
        code: `<dependency>
  <groupId>org.postgresql</groupId>
  <artifactId>postgresql</artifactId>
  <version>42.6.0</version>
</dependency>`,
      },
      {
        label: "Connection code",
        code: `RdsIamAuthTokenGenerator generator = RdsIamAuthTokenGenerator.builder()
    .credentials(DefaultAWSCredentialsProviderChain.getInstance())
    .region("us-east-1")
    .build();

String token = generator.getAuthToken(
    GetIamAuthTokenRequest.builder()
        .hostname("${endpoint}")
        .port(5432)
        .userName("postgres")
        .build());

Connection conn = DriverManager.getConnection(
    "jdbc:postgresql://${endpoint}:5432/postgres?ssl=true&sslmode=require",
    "postgres", token);`,
      },
    ],
    "Go": [
      { label: "Install required packages", code: "go get github.com/lib/pq\ngo get github.com/aws/aws-sdk-go/aws" },
      {
        label: "Connection code",
        code: `import (
    "database/sql"
    "github.com/aws/aws-sdk-go/aws/credentials"
    "github.com/aws/aws-sdk-go/service/rds/rdsutils"
    _ "github.com/lib/pq"
)

creds := credentials.NewEnvCredentials()
token, _ := rdsutils.BuildAuthToken(
    "${endpoint}:5432", "us-east-1", "postgres", creds)

dsn := fmt.Sprintf("host=%s port=5432 user=postgres password=%s dbname=postgres sslmode=require",
    "${endpoint}", token)
db, _ := sql.Open("postgres", dsn)`,
      },
    ],
    "Ruby": [
      { label: "Install required packages", code: "gem install pg aws-sdk-rds" },
      {
        label: "Connection code",
        code: `require 'pg'
require 'aws-sdk-rds'

rds_client = Aws::RDS::AuthTokenGenerator.new(region: 'us-east-1')
token = rds_client.auth_token(
  endpoint: '${endpoint}:5432',
  user_name: 'postgres'
)

conn = PG.connect(
  host: '${endpoint}',
  port: 5432,
  dbname: 'postgres',
  user: 'postgres',
  password: token,
  sslmode: 'require'
)`,
      },
    ],
    "PHP": [
      { label: "Install required packages", code: "composer require aws/aws-sdk-php" },
      {
        label: "Connection code",
        code: `<?php
use Aws\Rds\AuthTokenGenerator;
use Aws\Credentials\CredentialProvider;

$generator = new AuthTokenGenerator(CredentialProvider::defaultProvider());
$token = $generator->createToken('${endpoint}:5432', 'us-east-1', 'postgres');

$dsn = "pgsql:host=${endpoint};port=5432;dbname=postgres;sslmode=require";
$pdo = new PDO($dsn, 'postgres', $token);`,
      },
    ],
    "C#": [
      { label: "Install required packages", code: "dotnet add package Npgsql\ndotnet add package AWSSDK.RDS" },
      {
        label: "Connection code",
        code: `using Amazon.RDS.Util;
using Npgsql;

var token = RDSAuthTokenGenerator.GenerateAuthToken(
    "${endpoint}", 5432, "postgres");

var connStr = $"Host=${endpoint};Port=5432;Database=postgres;Username=postgres;Password={token};SSL Mode=Require;Trust Server Certificate=true";
using var conn = new NpgsqlConnection(connStr);
await conn.OpenAsync();`,
      },
    ],
  };
  return steps[lang] ?? steps["Node.js"];
}


