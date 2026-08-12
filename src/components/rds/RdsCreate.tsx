import { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ChevronRight, ChevronDown, XCircle, Pencil, FileText, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/Header";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from "sonner";
import { useProvisionRds } from "@/hooks/useRds";
import { checkRdsIdentifier } from "@/services/rdsService";
import { useAppStore } from "@/store/appStore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { type AwsRegion } from '@/services/rdsService';

type Row = {
  config: string;
  value: string | React.ReactNode;
  hint?: string;
  modifiable: string;
  editable?: boolean;
  field?: "identifier" | "username" | "minCapacity" | "maxCapacity" | "pauseAfter";
}; 

const REGIONS: { value: AwsRegion; label: string }[] = [
  { value: "us-east-2", label: "US East (Ohio)" },
  { value: "us-east-1", label: "US East (N. Virginia)" },
];




export function RdsCreate() {
  const navigate = useNavigate();
  const setActiveRequest = useAppStore((s) => s.setActiveRequest);
  const { provision, isSubmitting } = useProvisionRds();

  const [open, setOpen] = useState(false);
  const [touched, setTouched] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const identifierRowRef = useRef<HTMLTableRowElement | null>(null);
  const justificationRef = useRef<HTMLElement | null>(null);

  // Editable fields
  const [identifier, setIdentifier] = useState("database-2");
  const [username, setUsername] = useState("postgres");
  const [minCapacity, setMinCapacity] = useState("0");
  const [maxCapacity, setMaxCapacity] = useState("16");
  const [pauseAfter, setPauseAfter] = useState("300");
  const [justifications, setJustifications] = useState("");
  const [justificationError, setJustificationError] = useState(false);
  const [justificationTouched, setJustificationTouched] = useState(false);
  const [identifierExistsError, setIdentifierExistsError] = useState("");
  const [identifierCheckLoading, setIdentifierCheckLoading] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<AwsRegion>("us-east-2");

  useEffect(() => {
    if (!identifier.trim()) { setIdentifierExistsError(""); return; }
    setIdentifierCheckLoading(true);
    setIdentifierExistsError("");
    const timer = setTimeout(async () => {
      try {
        const { exists } = await checkRdsIdentifier(identifier.trim(), selectedRegion);
        setIdentifierExistsError(exists ? `Cluster identifier "${identifier.trim()}" already exists in ${selectedRegion}.` : "");
      } catch {
        // silently ignore
      } finally {
        setIdentifierCheckLoading(false);
      }
    }, 1200);
    return () => clearTimeout(timer);
  }, [identifier, selectedRegion]);
  const isJustificationValid = justifications.trim().length >= 20;





  const validateJustification = (value: string) => {
    if (value.trim().length < 20) {
      return `Minimum 20 characters required (${value.trim().length}/20).`;
    }
    return "";
  };

  const clusterIdentifierRegex = /^[a-z][a-z0-9-]*$/;

  const errors = {
    identifier: !identifier.trim()
      ? "The DB cluster identifier field is required."
      : identifier.length > 63
        ? "Cluster identifier must be 63 characters or less."
        : !clusterIdentifierRegex.test(identifier)
          ? "Must start with a letter, contain only lowercase letters, numbers, hyphens"
          : "",
    username: !username.trim()
      ? "The Database master username field is required."
      : username.length > 16
        ? "Master username must be 16 characters or less."
        : !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(username)
          ? "Must start with a letter, contain only letters, numbers, underscores"
          : "",
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
    { config: "Private access/VPC", value: "Enabled / splunk-poc VPC", modifiable: "No" },
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
    const err = (touched || editingField === row.field) ? errors[row.field as keyof typeof errors] : "";
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
          {!err && row.field === "identifier" && (
            identifierCheckLoading
              ? <p className="text-xs text-muted-foreground mt-1">Checking...</p>
              : identifierExistsError
                ? <div className="flex items-center gap-1 text-destructive text-xs mt-1"><XCircle size={12} className="shrink-0" />{identifierExistsError}</div>
                : null
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
            onBlur={() => { setTouched(true); setEditingField(null); }}
            className={`h-7 text-sm bg-card/50 w-[150px] ${err ? "border-destructive focus-visible:ring-destructive" : "border-border/50"
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

  const onOpenDialog = () => {
    setTouched(true);
    setJustificationTouched(true);

    const justificationValidation = validateJustification(justifications);
    setJustificationError(!!justificationValidation);

    if (hasErrors || justificationValidation || identifierExistsError || identifierCheckLoading) {
      setTimeout(() => {
        if (hasErrors || identifierExistsError || identifierCheckLoading) {
          setOpen(true);
          identifierRowRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        } else {
          justificationRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 0);
      return;
    }
    setIsDialogOpen(true);
  };

  const handleCreate = async () => {
    const payload = {
      cluster_identifier: identifier,
      master_username: username,
      database_name: "postgres",
      region:selectedRegion,
      min_acu: Number(minCapacity),
      max_acu: Number(maxCapacity),
      auto_pause_seconds: Number(pauseAfter),
      justification: justifications.trim(),
    };

    const requestId = await provision(payload);
    if (!requestId) return;

    setActiveRequest(requestId, "rds-service", "create");
    setIsDialogOpen(false);
    navigate(`/console?request=${encodeURIComponent(requestId)}&service=rds-service`);
  };

  return (
    <div>
      <Header
        title="Create with express configuration in seconds"
        subtitle="Quickly create an Aurora PostgreSQL serverless database with optimized default settings."
        showSearch={false}
      />

      <div className="flex items-center gap-2 text-sm text-muted-foreground px-6 py-3">
        <Link to="/aws/rds" className="hover:text-foreground transition-colors">
          RDS
        </Link>
        <Link to="/aws/rds" className="hover:text-foreground transition-colors">
          RDS
        </Link>
        <ChevronRight size={14} />
        <span className="text-foreground">Create DB Cluster</span>
      </div>

      <div className="max-w-5xl mx-auto pb-10 px-6 space-y-6">
        <section className="glass-panel rounded-xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <Layers className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">Database configuration</h1>
          </div>
          <p className="text-sm text-muted-foreground mb-5">
            Aurora PostgreSQL with Serverless instance (Version 17)
          </p>
          <div className="space-y-3 mb-4">
            <Label>AWS Region</Label>
            <Select value={selectedRegion} onValueChange={(v) => setSelectedRegion(v as AwsRegion)}>
              <SelectTrigger className="bg-muted/50">
                <SelectValue placeholder="Select Region" />
              </SelectTrigger>

              <SelectContent>
                {REGIONS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Configuration details collapsible */}
          <button
            onClick={() => setDetailsOpen((v) => !v)}
            className="w-full flex items-center gap-2 text-lg font-semibold text-foreground hover:text-primary transition-colors"
          >
            {detailsOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            Configuration Details
          </button>

          {open && (
            <div className="border-t border-border mt-4 pt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/20 text-xs text-muted-foreground">
                    <th className="px-5 py-3 text-left font-medium w-[220px]">
                      Configuration
                    </th>
                    <th className="px-5 py-3 text-left font-medium">
                      <span className="flex items-center gap-1">Value</span>
                    </th>
                    <th className="px-5 py-3 text-left font-medium w-[200px]">
                      Modifiable post-creation
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr
                      key={idx}
                      ref={idx === 1 ? identifierRowRef : undefined}
                      className="border-b border-border last:border-0 hover:bg-muted/10 transition-colors"
                    >
                      <td className="px-5 py-3 text-sm text-foreground">
                        {row.config}
                      </td>
                      <td className="px-5 py-3">
                        {row.editable ? (
                          getEditInput(row)
                        ) : (
                          <div>
                            <div className="text-sm text-foreground">
                              {row.value}
                            </div>
                            {row.hint && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {row.hint}
                              </p>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3 text-sm text-muted-foreground">
                        {row.modifiable}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="text-xs text-muted-foreground mt-5">
            *Aurora Capacity Unit (ACU) pricing is $0.12 per ACU-Hour and
            storage is $0.10 per GB-month.
          </p>
        </section>



        {/* Business Justification */}
        <section ref={justificationRef} className="glass-panel rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Business Justification</h2>
          </div>

          <div className="space-y-3">
            <Textarea
              id="justification"
              className={`w-full resize-none overflow-y-auto rounded-md border bg-background px-3 py-1 text-sm border-input`}
              placeholder="Provide a brief justification for this RDS request."
              value={form.values.justification}
              onChange={(e) => form.handleJustificationChange(e.target.value)}
              onBlur={form.handleJustificationBlur}
              rows={3}
              maxLength={250}
            />
            <div className="flex justify-between items-center">
              {showJustificationError ? (
                <div className="text-xs text-red-600">
                  Business justification must contain at least {MIN_JUSTIFICATION_LENGTH} characters.
                </div>
              ) : (
                <span />
              )}
              <p className="text-xs text-muted-foreground">
                {justifications.length}/250
              </p>
            </div>
          </div>
        </section>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => navigate("/aws/rds")}>
            Cancel
          </Button>
          <Button
            onClick={onOpenDialog}
            className="bg-primary hover:bg-primary/90"
          >
            Create database
          </Button>
        </div>

        {/* Confirmation Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent
            className="sm:max-w-lg max-h-[85vh] flex flex-col"
            onInteractOutside={(event) => event.preventDefault()}
          >
            <div className="p-4 pb-4 border-b">
              <DialogHeader className="text-center items-center">
                <DialogTitle className="text-xl font-semibold text-foreground">
                  Confirm RDS Database Request
                </DialogTitle>
                <DialogDescription className="text-muted-foreground mt-2">
                  Please review the details below before submitting your
                  request.
                </DialogDescription>
              </DialogHeader>
            </div>
            <div className="space-y-4 mt-4 text-sm overflow-y-auto model-scroll-hide flex-1 px-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <p className="text-xs text-muted-foreground mb-1">
                    DB Engine
                  </p>
                  <p className="font-medium text-foreground">
                    Aurora PostgreSQL
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <p className="text-xs text-muted-foreground mb-1">
                    Engine Version
                  </p>
                  <p className="font-medium text-foreground">Version 17</p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-xs text-muted-foreground mb-1">
                  DB Cluster Identifier
                </p>
                <p className="font-medium text-foreground">{identifier}</p>
              </div>

              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-xs text-muted-foreground mb-1">
                  Master Username
                </p>
                <p className="font-medium text-foreground">{username}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <p className="text-xs text-muted-foreground mb-1">
                    Min Capacity
                  </p>
                  <p className="font-medium text-foreground">
                    {acu(minCapacity)}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <p className="text-xs text-muted-foreground mb-1">
                    Max Capacity
                  </p>
                  <p className="font-medium text-foreground">
                    {acu(maxCapacity)}
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-xs text-muted-foreground mb-1">
                  Pause After Inactivity
                </p>
                <p className="font-medium text-foreground">
                  {pauseAfter} seconds
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Storage</p>
                  <p className="font-medium text-foreground">Aurora Standard</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <p className="text-xs text-muted-foreground mb-1">
                    Encryption
                  </p>
                  <p className="font-medium text-foreground">Enabled</p>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-xs text-muted-foreground mb-1">Region</p>
                <p className="font-medium text-foreground">
                  {REGIONS.find((r) => r.value === selectedRegion)?.label}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-xs text-muted-foreground mb-1">
                  Business Justification
                </p>
                <p className="font-medium text-foreground whitespace-pre-wrap">
                  {justifications}
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    disabled={isSubmitting}
                  >
                    Go Back & Edit
                  </Button>

                  <Button onClick={handleCreate} disabled={isSubmitting}>
                    {isSubmitting ? "Creating..." : "Confirm & Submit"}
                  </Button>
                </DialogFooter>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
