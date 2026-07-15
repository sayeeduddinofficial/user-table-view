import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ChevronRight, ChevronDown, XCircle, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/Header";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useResources } from "@/lib/lbLocalStore";

type Row = {
  config: string;
  value: string | React.ReactNode;
  hint?: string;
  modifiable: string;
  editable?: boolean;
  field?: "identifier" | "username" | "minCapacity" | "maxCapacity" | "pauseAfter";
};

export function RdsCreate() {
  const navigate = useNavigate();
  const { add } = useResources("rds");

  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);

  // Editable fields
  const [identifier, setIdentifier] = useState("database-2");
  const [username, setUsername] = useState("postgres");
  const [minCapacity, setMinCapacity] = useState("0");
  const [maxCapacity, setMaxCapacity] = useState("16");
  const [pauseAfter, setPauseAfter] = useState("300");

  const errors = {
    identifier: !identifier.trim() ? "The DB cluster identifier field is required." : "",
    username: !username.trim() ? "The Database master username field is required." : "",
    minCapacity: !minCapacity.trim()
      ? "The minimum capacity (ACUs) field is required."
      : parseFloat(minCapacity) < 0 || parseFloat(minCapacity) > 256
      ? "Min capacity must be between 0 and 256."
      : "",
    maxCapacity: !maxCapacity.trim()
      ? "The maximum capacity (ACUs) field is required."
      : parseFloat(maxCapacity) < 1 || parseFloat(maxCapacity) > 256
      ? "Max capacity must be between 1 and 256."
      : parseFloat(maxCapacity) < parseFloat(minCapacity)
      ? "Max capacity must be greater than or equal to min capacity."
      : "",
    pauseAfter: !pauseAfter.trim()
      ? "The pause after inactivity field is required."
      : parseFloat(pauseAfter) < 300 || parseFloat(pauseAfter) > 86400
      ? "Value must be between 300 and 86400 seconds."
      : "",
  };

  const hasErrors = Object.values(errors).some(Boolean);

  const acu = (val: string) => {
    const n = parseFloat(val) || 0;
    const gib = n === 0 ? 0 : Math.round(n * 2);
    return `${n} ACU (${gib} GiB)`;
  };

  const rows: Row[] = [
    { config: "DB engine version", value: "Version 17", modifiable: "Yes, upgradable" },
    { config: "DB cluster identifier", value: identifier, modifiable: "Yes", editable: true, field: "identifier" },
    { config: "Database master username", value: username, modifiable: "Yes", editable: true, field: "username" },
    {
      config: "DB instance type",
      value: <><span className="font-medium">Serverless*</span><br /><span className="text-xs text-muted-foreground">Automated vertical (up/down) scaling</span></>,
      modifiable: "Yes",
    },
    {
      config: "Min capacity value",
      value: acu(minCapacity),
      hint: "Scales to 0 after 5min of inactivity",
      modifiable: "Yes",
      editable: true,
      field: "minCapacity",
    },
    {
      config: "Max capacity value",
      value: acu(maxCapacity),
      hint: "1 to 256 in increments of 0.5",
      modifiable: "Yes",
      editable: true,
      field: "maxCapacity",
    },
    {
      config: "Pause after inactivity",
      value: `${pauseAfter} seconds`,
      hint: "300 to 86400 seconds (5 minutes to 24 hours)",
      modifiable: "Yes",
      editable: true,
      field: "pauseAfter",
    },
    { config: "Storage configuration", value: "Aurora Standard*", modifiable: "Yes" },
    { config: "Encryption", value: "Enabled with AWS/RDS owned key", modifiable: "No" },
    { config: "Internet access gateway", value: "Enabled", modifiable: "No" },
    { config: "Private access/VPC", value: "Disabled/No VPC used", modifiable: "No" },
    { config: "Authentication", value: "IAM only", modifiable: "No" },
  ];

  const getEditInput = (row: Row) => {
    if (!row.editable || !row.field) return null;
    const map: Record<string, { val: string; set: (v: string) => void; type?: string; unit?: string }> = {
      identifier: { val: identifier, set: setIdentifier },
      username: { val: username, set: setUsername },
      minCapacity: { val: minCapacity, set: setMinCapacity, type: "number", unit: "ACU" },
      maxCapacity: { val: maxCapacity, set: setMaxCapacity, type: "number", unit: "ACU" },
      pauseAfter: { val: pauseAfter, set: setPauseAfter, type: "number", unit: "seconds" },
    };
    const { val, set, type = "text", unit } = map[row.field];
    const err = touched ? errors[row.field as keyof typeof errors] : "";
    const displayValue = (row.field === "minCapacity" || row.field === "maxCapacity") ? acu(val) : row.field === "pauseAfter" ? `${val} seconds` : val;
    const isEditing = editingField === row.field;

    if (!isEditing) {
      return (
        <div>
          <div
            className="inline-flex items-center gap-1.5 cursor-pointer group"
            onClick={() => setEditingField(row.field!)}
          >
            <span className="text-sm text-foreground">{displayValue}</span>
            <Pencil size={12} className="text-muted-foreground shrink-0" />
          </div>
          {row.hint && <p className="text-xs text-muted-foreground mt-0.5">{row.hint}</p>}
          {err && (
            <div className="flex items-center gap-1 text-destructive text-xs mt-1">
              <XCircle size={12} className="shrink-0" />
              {err}
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Input
            autoFocus
            type={type}
            value={val}
            onChange={(e) => set(e.target.value)}
            onBlur={() => setEditingField(null)}
            className={`h-7 text-sm bg-card/50 w-[150px] ${
              err ? "border-destructive focus-visible:ring-destructive" : "border-border/50"
            }`}
          />
          {unit && <span className="text-sm text-muted-foreground whitespace-nowrap">{unit}</span>}
        </div>
        {row.hint && <p className="text-xs text-muted-foreground">{row.hint}</p>}
        {err && (
          <div className="flex items-center gap-1 text-destructive text-xs">
            <XCircle size={12} className="shrink-0" />
            {err}
          </div>
        )}
      </div>
    );
  };

  const handleCreate = async () => {
    setTouched(true);
    if (hasErrors) return;
    setIsSubmitting(true);
    add({
      id: `${identifier.toLowerCase()}-${Date.now()}`,
      name: identifier,
      region: "us-east-1",
      createdAt: new Date().toISOString(),
      status: "creating",
      meta: {
        dbIdentifier: identifier,
        isCluster: true,
        role: "Regional cluster",
        engine: "Aurora PostgreSQL",
        engineVersion: "17",
        status: "Creating",
        region: "us-east-1",
        size: "0 Instances",
        upgradeRollout: "SECOND",
        created: new Date().toLocaleDateString(),
      },
    });
    await new Promise((r) => setTimeout(r, 400));
    toast.success("DB Cluster creation initiated", { description: identifier });
    setIsSubmitting(false);
    navigate("/aws/rds");
  };

  return (
    <div>
      <Header
        title="Create RDS Database"
        subtitle="Create with express configuration in seconds"
        showSearch={false}
      />

      <div className="flex items-center gap-2 text-sm text-muted-foreground px-6 py-3">
        <Link to="/aws/rds" className="hover:text-foreground transition-colors">RDS</Link>
        <ChevronRight size={14} />
        <span className="text-foreground">Create DB Cluster</span>
      </div>

      <div className="max-w-4xl mx-auto pb-10 px-6 space-y-5">

        {/* Page header */}
        <div>
          <h1 className="text-xl font-semibold mb-1">Create with express configuration in seconds</h1>
          <p className="text-sm text-muted-foreground">
            Create and query an Aurora PostgreSQL serverless database with pre-configured settings to get started quickly.
            You can modify some settings in the configuration details section now and most other settings later using the modify flow.
          </p>
        </div>

        {/* Database configuration */}
        <div className="bg-card border border-border rounded-lg p-5">
          <p className="text-sm font-semibold mb-1">Database configuration</p>
          <p className="text-sm text-muted-foreground">Aurora PostgreSQL with Serverless instance (Version 17)</p>
        </div>

        {/* Configuration details collapsible */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <button
            onClick={() => setOpen((v) => !v)}
            className="w-full flex items-center gap-2 px-5 py-4 text-sm font-semibold text-foreground hover:bg-muted/20 transition-colors"
          >
            {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            Configuration details
          </button>

          {open && (
            <div className="border-t border-border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/20 text-xs text-muted-foreground">
                    <th className="px-5 py-3 text-left font-medium w-[220px]">Configuration</th>
                    <th className="px-5 py-3 text-left font-medium">
                      <span className="flex items-center gap-1">Value</span>
                    </th>
                    <th className="px-5 py-3 text-left font-medium w-[200px]">Modifiable post-creation</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr key={idx} className="border-b border-border last:border-0 hover:bg-muted/10 transition-colors">
                      <td className="px-5 py-3 text-sm text-foreground">{row.config}</td>
                      <td className="px-5 py-3">
                        {row.editable ? (
                          getEditInput(row)
                        ) : (
                          <div>
                            <div className="text-sm text-foreground">{row.value}</div>
                            {row.hint && <p className="text-xs text-muted-foreground mt-0.5">{row.hint}</p>}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3 text-sm text-muted-foreground">{row.modifiable}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pricing note */}
        <p className="text-xs text-muted-foreground">
          *Aurora Capacity Unit (ACU) pricing is $0.12 per ACU-Hour and storage is $0.10 per GB-month.
        </p>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => navigate("/aws/rds")}>Cancel</Button>
          <Button onClick={handleCreate} disabled={isSubmitting} className="bg-primary hover:bg-primary/90">
            {isSubmitting ? "Creating..." : "Create database"}
          </Button>
        </div>

      </div>
    </div>
  );
}
