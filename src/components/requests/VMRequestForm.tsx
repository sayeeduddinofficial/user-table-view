import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/store/appStore";
import { useEffect, useState } from "react";
import {
  VM_ROLES,
  INSTANCE_TYPES,
  AWS_REGIONS,
  ENVIRONMENT_TAGS,
  CATEGORY_OPTIONS,
  CATEGORY_3_INFRA,
  CATEGORY_4_INFRA,
  TIMEZONES,
  SPLUNK_VERSIONS,
  type CategoryType,
  type VMRoleConfig,
  type DeploymentMode,
  type EnvironmentTag,
} from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus,
  Minus,
  Server,
  MapPin,
  Zap,
  Globe,
  Key,
  Layers,
  Clock,
  AlertCircle,
  Info,
  FileText,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSSHKeys } from "@/hooks/useSSHKeys";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAwsConfig } from "@/hooks/useAwsConfig";
import { useDialog } from "../ui/dialog-context";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  onSubmit: (payload: any) => void;
  isSubmitting?: boolean;
};

// AMI options per region (Quick Start images as shown in the AWS console).
// Each region falls back to the default 7-option list unless overridden.
const DEFAULT_AMI_OPTIONS = [
  { value: "amazon-linux", label: "Amazon Linux" },
  { value: "macos", label: "macOS" },
  { value: "ubuntu", label: "Ubuntu" },
  { value: "windows", label: "Windows" },
  { value: "red-hat", label: "Red Hat" },
  { value: "suse-linux", label: "SUSE Linux" },
  { value: "debian", label: "Debian" },
];
const AMI_OPTIONS_BY_REGION: Record<string, { value: string; label: string }[]> = {};
const getAmiOptions = (region: string) =>
  AMI_OPTIONS_BY_REGION[region] ?? DEFAULT_AMI_OPTIONS;

export function VMRequestForm({ onSubmit, isSubmitting = false }: Props) {
  const { alert } = useDialog();
  const navigate = useNavigate();
  const { currentUser } = useAppStore();
  const {
    keys: sshKeys,
    loading: sshKeysLoading,
    loadError: sshKeysError,
  } = useSSHKeys();

  const currentUserdata = JSON.stringify(currentUser);

  const getDefaultRegion = () => {
    const host = window.location.hostname;
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "splunkops-dev.prudentconsulting.com"
    ) {
      return "us-east-2";
    }
    return "us-east-1";
  };
  const [environmentTag, setEnvironmentTag] = useState<EnvironmentTag>("dev");
  const [projectIdentifier, setProjectIdentifier] = useState("");
  const [deploymentMode, setDeploymentMode] =
    useState<DeploymentMode>("single-region");
  const [region, setRegion] = useState(getDefaultRegion());
  const [selectedRegions, setSelectedRegions] = useState<string[]>([
    getDefaultRegion(),
  ]);
  const [diskSize, setDiskSize] = useState(10);
  const [selectedSSHKeyName, setSelectedSSHKeyName] = useState("");
  const [roles, setRoles] = useState<
    Record<string, { count: number; instanceType: string }>
  >({});
  const [category, setCategory] = useState<CategoryType | null>(null);
  const [ami, setAmi] = useState<string>("amazon-linux");
  const [allInOneInstanceType, setAllInOneInstanceType] = useState("");
  const [cat5InstanceTypes, setCat5InstanceTypes] = useState<
    Record<string, string>
  >(() => Object.fromEntries(CATEGORY_4_INFRA.map((r) => [r.id, r.type])));
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [runtimeDuration, setRuntimeDuration] = useState<number>(8);

  const { data: awsConfig } = useAwsConfig();
  const [roleConfigs, setRoleConfigs] = useState<VMRoleConfig[]>([]);
  const [splunkVersion, setSplunkVersion] = useState("10.2.3");
  const [justification, setJustification] = useState("");
  const [justificationTouched, setJustificationTouched] = useState(false);
  const [justificationError, setJustificationError] = useState(false);

  // ── Runtime Policy Logic ──────────────────────────────────────────────────
  const runtimePolicyInfo = (() => {
    const { timeZone, workStartTime, workEndTime } = currentUser || {};

    // All three fields must be non-empty strings in HH:MM format
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (
      !timeZone || typeof timeZone !== "string" ||
      !workStartTime || !timeRegex.test(workStartTime) ||
      !workEndTime || !timeRegex.test(workEndTime)
    ) return { show: false };

    try {
      // Reliably get current minutes-since-midnight in the user's timezone.
      // Use formatToParts to get structured hour/minute values — no string
      // parsing ambiguity regardless of browser locale output format.
      const now = new Date();
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).formatToParts(now);

      const hourPart = parts.find((p) => p.type === "hour")?.value ?? "0";
      const minutePart = parts.find((p) => p.type === "minute")?.value ?? "0";
      const h = parseInt(hourPart, 10);
      const m = parseInt(minutePart, 10);
      if (isNaN(h) || isNaN(m)) return { show: false };
      // Normalise midnight: some engines return 24 instead of 0
      const nowMins = (h === 24 ? 0 : h) * 60 + m;

      const [sh, sm] = workStartTime.split(":").map(Number);
      const [eh, em] = workEndTime.split(":").map(Number);
      const startMins = sh * 60 + sm;
      const endMins = eh * 60 + em;

      // Determine if currently in shift (handles overnight)
      let inShift: boolean;
      let minsToEnd: number;
      if (endMins > startMins) {
        // Normal shift (e.g. 09:30 - 17:47)
        inShift = nowMins >= startMins && nowMins < endMins;
        minsToEnd = endMins - nowMins;
      } else {
        // Overnight shift (e.g. 22:00 - 06:00)
        inShift = nowMins >= startMins || nowMins < endMins;
        minsToEnd = nowMins >= startMins
          ? 24 * 60 - nowMins + endMins
          : endMins - nowMins;
      }

      // Before shift start: ALWAYS show runtime policy so user can pick duration
      // If their chosen duration overlaps into shift, backend extends to shift end
      let beforeShiftStart: boolean;
      if (endMins > startMins) {
        // Normal shift: before start
        beforeShiftStart = nowMins < startMins;
      } else {
        // Overnight shift: "before shift" = after shift end AND before shift start
        // i.e. in the gap between end (05:00) and start (21:00)
        beforeShiftStart = nowMins >= endMins && nowMins < startMins;
      }

      if (beforeShiftStart) {
        // Show policy — user selects duration; if it overlaps shift, VM runs to shift end
        return { show: true, minsToEnd: 0, timeZone, workEndTime, beforeShift: true };
      }

      if (!inShift) {
        // After shift end — show runtime policy
        return { show: true, minsToEnd: 0, timeZone, workEndTime };
      }

      // In shift: show policy only if < 2 hours to shift end
      if (minsToEnd < 120) {
        return { show: true, minsToEnd, timeZone, workEndTime };
      }

      return { show: false };
    } catch {
      return { show: false };
    }
  })();
  const timeZoneLabel = TIMEZONES.find(tz => tz.value === runtimePolicyInfo.timeZone)?.label || runtimePolicyInfo.timeZone || "your timezone";
  const maxRuntimeHours = 8;

  const vmStopTime = (() => {
    if (!runtimePolicyInfo.show || !timeZoneLabel) return null;
    const { timeZone, workStartTime: wStart, workEndTime: wEnd } = currentUser || {};
    if (!timeZone || !wStart || !wEnd) return null;

    const now = new Date();
    const durationStop = new Date(now.getTime() + runtimeDuration * 60 * 60 * 1000);

    try {
      const nowMins = (() => {
        const parts = new Intl.DateTimeFormat("en-US", { timeZone, hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(now);
        const h = parseInt(parts.find(p => p.type === "hour")?.value ?? "0", 10);
        const m = parseInt(parts.find(p => p.type === "minute")?.value ?? "0", 10);
        return (h === 24 ? 0 : h) * 60 + m;
      })();

      const [sh, sm] = wStart.split(":").map(Number);
      const [eh, em] = wEnd.split(":").map(Number);
      const startMins = sh * 60 + sm;
      const endMins = eh * 60 + em;
      const isOvernightShift = endMins <= startMins;

      const isBeforeShift = isOvernightShift
        ? nowMins >= endMins && nowMins < startMins
        : nowMins < startMins;

      if (isBeforeShift) {
        // Get today's date string in user's timezone
        const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);

        // Shift start UTC (today)
        const roughStart = new Date(`${todayStr}T${wStart}:00Z`);
        const startOffsetMs = getLocalOffsetMs(roughStart, timeZone);
        const shiftStartUTC = new Date(roughStart.getTime() - startOffsetMs);

        // Shift end UTC (next day for overnight)
        const endDateStr = isOvernightShift
          ? (() => { const d = new Date(`${todayStr}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10); })()
          : todayStr;
        const roughEnd = new Date(`${endDateStr}T${wEnd}:00Z`);
        const endOffsetMs = getLocalOffsetMs(roughEnd, timeZone);
        const shiftEndUTC = new Date(roughEnd.getTime() - endOffsetMs);

        // If duration overlaps into shift → show shift end time
        const displayStop = durationStop > shiftStartUTC ? shiftEndUTC : durationStop;
        return displayStop.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone, hour12: true }) + ` (${timeZoneLabel})`;
      }
    } catch { /* fall through */ }

    // After shift / near end of shift: just show duration stop
    return durationStop.toLocaleTimeString("en-US", {
      hour: "2-digit", minute: "2-digit", timeZone: timeZone, hour12: true,
    }) + ` (${timeZoneLabel})`;
  })();

  // Helper: get timezone offset in ms at a given UTC instant
  function getLocalOffsetMs(utcDate: Date, tz: string): number {
    const utcStr = utcDate.toLocaleString("en-US", { timeZone: "UTC" });
    const localStr = utcDate.toLocaleString("en-US", { timeZone: tz });
    // Iterative correction for accuracy
    const rough = new Date(localStr).getTime() - new Date(utcStr).getTime();
    const corrected = new Date(utcDate.getTime() - rough);
    const utcStr2 = corrected.toLocaleString("en-US", { timeZone: "UTC" });
    const localStr2 = corrected.toLocaleString("en-US", { timeZone: tz });
    return new Date(localStr2).getTime() - new Date(utcStr2).getTime();
  }
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const defaultRegion = getDefaultRegion();
    setRegion(defaultRegion);
    setSelectedRegions([defaultRegion]);
  }, []);

  useEffect(() => {
    if (
      currentUser?.allowedInstanceTypes &&
      currentUser.allowedInstanceTypes.length > 0
    ) {
      setAllInOneInstanceType(currentUser.allowedInstanceTypes[0]);
    }
  }, [currentUser]);

  useEffect(() => {
  if (category === 5 && currentUser?.allowedInstanceTypes?.length) {
    const firstAllowed = currentUser.allowedInstanceTypes[0];
    setCat5InstanceTypes(
      Object.fromEntries(
        CATEGORY_4_INFRA.map((r) => [
          r.id,
          currentUser.allowedInstanceTypes.includes(r.type) ? r.type: firstAllowed,
        ])
      )
    );
  }
}, [category,currentUser]);

  const MAX_VM_LIMIT = currentUser?.maxVMs || 13; //13
  
  const activeVMs = currentUser?.activeVMs || 0;
  const provisioningVMs = currentUser?.provisioningVMs || 0;

  const usedVMs = activeVMs + provisioningVMs;
  const newVMs = Object.values(roles).reduce((sum, r) => sum + r.count, 0); //3//5
  const remainingQuota = MAX_VM_LIMIT - usedVMs; //13-5=8
  const CATEGORY_3_TOTAL_VMS = CATEGORY_3_INFRA.reduce(
    (sum, r) => sum + r.count,
    0,
  );

  const CATEGORY_4_TOTAL_VMS = CATEGORY_4_INFRA.reduce(
    (sum, r) => sum + r.count,
    0,
  );

  const requestedVMs =
    category === 2
      ? remainingQuota > 0
        ? 1
        : 0
      : category === 3
        ? CATEGORY_3_TOTAL_VMS
        : category === 4 || category === 5
          ? CATEGORY_4_TOTAL_VMS
          : newVMs;

  const totalVMs = usedVMs + requestedVMs;
  const isOverQuota = totalVMs > MAX_VM_LIMIT; //5>13
 
  const effectiveVMs = requestedVMs;

  const defaultType = currentUser?.allowedInstanceTypes?.[0] ?? "";

  const updateRole = (
    roleId: string,
    field: "count" | "instanceType",
    value: number | string,
  ) => {
    setRoles((prev) => {
      // Enforce quota ONLY when updating count
      if (field === "count") {
        const currentNewVMs = Object.values(prev).reduce(
          (sum, r) => sum + r.count,
          0,
        );
        const currentRoleCount = prev[roleId]?.count ?? 0;
        const nextRoleCount = value as number;
        const delta = nextRoleCount - currentRoleCount;
        if (delta > 0 && currentNewVMs + delta > remainingQuota) {
          return prev;
        }
      }
      return {
        ...prev,
        [roleId]: {
          count:
            field === "count" ? (value as number) : (prev[roleId]?.count ?? 0),
          instanceType:
            field === "instanceType"
              ? (value as string)
              : (prev[roleId]?.instanceType ?? defaultType),
        },
      };
    });
  };

const onOpenDialog = () => {
    if (!category) {
      alert({
        title: "Please select a category for your VM request",
        severity: "error"
      })
      return;
    }

    if (category !== 2 && totalVMs === 0) {
      alert({
        title: "Please select at least one VM role",
        severity: "error"
      })
      return;
    }

    if (isOverQuota) {
      alert({
        title: `Exceeds quota. Maximum ${remainingQuota} VMs allowed.`,
        severity: "error"
      })
      return;
    }

    if (!projectIdentifier.trim()) {
      alert({
        title: "Project Identifier is required",
        severity: "error"
      })
      return;
    }

  if (category === 5 && !/^[a-z0-9-]{1,32}$/i.test(projectIdentifier)) {
    alert({
      title: "Project Identifier must contain only letters, numbers, and hyphens (-), with a maximum length of 32 characters.",
      severity: "error",
    });
    return;
  }

  if (!selectedSSHKeyName) {
    alert({
      title: "Please select an SSH key for VM access",
      severity: "error"
    })
    return;
  }

  if (category !== 1 && !splunkVersion) {
    alert({
      title: "Please select a Splunk Version",
      severity: "error",
    });
    return;
  }
  if (category === 1 && !ami) {
    alert({
      title: "Please select an AMI",
      severity: "error",
    });
    return;
  }
  const trimmedJustification = justification.trim();

  if (!trimmedJustification) {
    alert({
      title: "Justification is required",
      severity: "error",
    });
    return;
  }

  if (trimmedJustification.length < 20) {
    alert({
      title: "Justification must be at least 20 characters.",
      severity: "error",
    });
    return;
  }

  // Must contain at least one alphabet
  if (!/[a-zA-Z]/.test(trimmedJustification)) {
    alert({
      title: "Justification must contain meaningful text.",
      severity: "error",
    });
    return;
  }

  let rolesData: VMRoleConfig[] = [];

  if (category === 2) {
     // All-in-One role
    rolesData = [
      {
        roleId: "aio",
        roleName: "All In One",
        count: 1,
        instanceType: allInOneInstanceType,
      },
    ];
  } else if (category === 3) {
    // Category 3 → Predefined Infrastructure
    rolesData = CATEGORY_3_INFRA.map((r) => ({
      roleId: r.id,
      roleName: r.name,
      count: r.count,
      instanceType: r.type,
    }));
  } else if (category === 4) {
    // Category 4 → Predefined Infrastructure
    rolesData = CATEGORY_4_INFRA.map((r) => ({
      roleId: r.id,
      roleName: r.name,
      count: r.count,
      instanceType: r.type,
    }));
  } 
  else if(category === 5 ){ 
    // Category 5 → Predefined Infrastructure
     rolesData = CATEGORY_4_INFRA.map((r) => ({
      roleId: r.id,
      roleName: r.name,
      count: r.count,
     instanceType: cat5InstanceTypes[r.id] ?? r.type,
    }));
  }
  else {
    // Category 1 → Manual role selection
    rolesData = Object.entries(roles)
      .filter(([_, config]) => config.count > 0)
      .map(([roleId, config]) => {
        const role = VM_ROLES.find((r) => r.id === roleId)!;
        return {
          roleId,
          roleName: role.name,
          count: config.count,
          instanceType: config.instanceType,
        };
      });
  }

  if (category === 3 && CATEGORY_3_TOTAL_VMS > remainingQuota) {
    alert({
        title: `Category 3 requires ${CATEGORY_3_TOTAL_VMS} VMs, but only ${remainingQuota} are available.`,
        severity: "error"
      })
    return;
  }

  setRoleConfigs(rolesData);
  setIsDialogOpen(true);
};

  function handleSubmit() {
    const payload = {
      category: Number(category),
      environmentTag,
      projectIdentifier,
      ...(category !== 1 && { splunkVersion }),
      deploymentMode,
      region,
      regions: deploymentMode === "multi-region" ? selectedRegions : [region],
      diskSize,
      sshKeyName: selectedSSHKeyName,
      roles: roleConfigs,
      ...(runtimePolicyInfo.show && { runtimeDurationHours: runtimeDuration }),
      justification,
    };

    onSubmit(payload);
  };

  const visibleCategories = CATEGORY_OPTIONS.filter((cat) =>
    currentUser?.allowedCategories?.includes(cat.value),
  );

  useEffect(() => {
    if (!category && visibleCategories.length > 0) {
      setCategory(visibleCategories[0].value);
    }
  }, [visibleCategories, category]);

  useEffect(() => {
    if (category === 1) {
      setSplunkVersion("");
    } else {
      setSplunkVersion((prev) => prev || "10.2.3");
    }
  }, [category]);
  
  const isAwsDisconnected = awsConfig?.status !== "CONNECTED";
  const isDisabled = requestedVMs === 0 || isOverQuota || isAwsDisconnected || isSubmitting;

  let tooltipMessage = "";

  if (isSubmitting) {
    tooltipMessage = "Submitting request...";
  } else if (isAwsDisconnected) {
    tooltipMessage = "AWS Disconnected";
  } else if (requestedVMs === 0) {
    tooltipMessage = "Select at least one VM before submitting the request";
  } else if (isOverQuota) {
    tooltipMessage = "Requested VMs exceed your quota";
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Environment Settings */}
      <section className="glass-panel rounded-xl p-6">
        <h2 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" />
          Category Selection
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visibleCategories.map((cat) => (
            <div
              key={cat.value}
              onClick={() => setCategory(cat.value)}
              className={cn(
                "p-4 rounded-xl border transition cursor-pointer",
                category === cat.value
                  ? "border-primary bg-primary/10"
                  : "border-muted",
              )}
            >
              <h3 className="text-md font-semibold flex items-center gap-2">
                {cat.label}
              </h3>

              <p className="text-sm text-muted-foreground mt-1">
                {cat.description}
              </p>
            </div>
          ))}
        </div>

        {visibleCategories.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No categories assigned. Contact admin.
          </p>
        )}
      </section>

      <section className="glass-panel rounded-xl p-6">
        <h2 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          Environment Configuration
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <Label>Environment Tag</Label>
            <Select
              value={environmentTag}
              onValueChange={(v) => setEnvironmentTag(v as EnvironmentTag)}
            >
              <SelectTrigger className="bg-muted/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ENVIRONMENT_TAGS.map((tag) => (
                  <SelectItem key={tag.value} value={tag.value}>
                    {tag.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Used for EC2 tagging
            </p>
          </div>

          <div className="space-y-3">
            <Label htmlFor="project">Project Identifier</Label>
            <Input
              id="project"
              placeholder="e.g., splunk-prod, analytics-lab"
              value={projectIdentifier}
              onChange={(e) => setProjectIdentifier(e.target.value)}
              className="bg-muted/50"
              spellCheck={false}
            />
            <p className="text-xs text-muted-foreground">
              Project tag for resource tracking
            </p>
          </div>
        </div>
        {category !== 1 && (
          <div className="mt-6 space-y-3">
            <Label className="flex items-center gap-2">
              <Server className="h-4 w-4" />
              Splunk Version
            </Label>

            <Select
              value={splunkVersion}
              onValueChange={setSplunkVersion}
            >
              <SelectTrigger className="bg-muted/50">
                <SelectValue
                  placeholder={
                    <span className="text-muted-foreground">
                      Select Splunk Version
                    </span>
                  }
                />
              </SelectTrigger>

              <SelectContent>
                {SPLUNK_VERSIONS.map((version) => (
                  <SelectItem
                    key={version.value}
                    value={version.value}
                  >
                    {version.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <p className="text-xs text-muted-foreground">
              Splunk version to install on provisioned VMs
            </p>
          </div>
        )}
      </section>

      {/* Deployment Mode */}
      <section className="glass-panel rounded-xl p-6">
        <h2 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          Deployment Mode
        </h2>

        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setDeploymentMode("single-region")}
              className={cn(
                "flex-1 p-4 rounded-lg border-2 transition-all",
                deploymentMode === "single-region"
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-muted-foreground",
              )}
            >
              <p className="font-medium text-foreground">Single Region</p>
              <p className="text-xs text-muted-foreground">
                Deploy to one AWS region
              </p>
            </button>
            <button
              onClick={() => setDeploymentMode("multi-region")}
              className={cn(
                "flex-1 p-4 rounded-lg border-2 transition-all opacity-50 cursor-not-allowed",
                "border-border hover:border-muted-foreground",
              )}
              disabled={true}
            >
              <p className="font-medium text-foreground">Multi-Region</p>
              <p className="text-xs text-muted-foreground">
                Deploy identical setup across regions
              </p>
            </button>
          </div>

          {deploymentMode === "single-region" ? (
            <div className="space-y-3">
              <Label>Select Region</Label>
              <Select value={region} onValueChange={setRegion}>
                <SelectTrigger className="bg-muted/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AWS_REGIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-3">
              <Label>Select Regions (Multi-Region)</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {AWS_REGIONS.map((r) => (
                  <div
                    key={r.value}
                    className={cn(
                      "flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all",
                      selectedRegions.includes(r.value)
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-muted-foreground",
                    )}
                    onClick={() => {
                      setSelectedRegions((prev) =>
                        prev.includes(r.value)
                          ? prev.filter((reg) => reg !== r.value)
                          : [...prev, r.value],
                      );
                    }}
                  >
                    <Checkbox
                      checked={selectedRegions.includes(r.value)}
                      onCheckedChange={(checked) => {
                        setSelectedRegions((prev) =>
                          checked
                            ? [...prev, r.value]
                            : prev.filter((reg) => reg !== r.value),
                        );
                      }}
                    />
                    <span className="text-sm">{r.label}</span>
                  </div>
                ))}
              </div>
              {selectedRegions.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Selected: {selectedRegions.length} region(s) - Same
                  configuration will be deployed to each
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Infrastructure Settings */}
      <section className="glass-panel rounded-xl p-6">
        <h2 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          Infrastructure Settings
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <Label>Disk Size: {diskSize} GB</Label>
            <Slider
              value={[diskSize]}
              onValueChange={([v]) => setDiskSize(v)}
              min={10}
              max={50}
              step={5}
              className="py-4"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>10 GB</span>
              <span>50 GB</span>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              SSH Key
            </Label>
            {sshKeysLoading ? (
              <div className="h-10 bg-muted/50 rounded-md animate-pulse" />
            ) : sshKeysError ? (
              <p className="text-sm text-destructive">
                Failed to load SSH keys. Please try again later.
              </p>
            ) : sshKeys.length === 0 ? (
              <div className="p-4 rounded-lg border border-warning/50 bg-warning/10">
                <p className="text-sm text-warning">No SSH keys available</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Please generate an SSH key in Settings before creating a VM
                  request
                </p>
              </div>
            ) : (
              <>
                <Select
                  value={selectedSSHKeyName}
                  onValueChange={setSelectedSSHKeyName}
                >
                        <SelectTrigger className="bg-muted/50">
                          <SelectValue
                            placeholder={
                              <span className="text-muted-foreground">
                                Select SSH key...
                              </span>
                            }
                          />
                        </SelectTrigger>
                  <SelectContent>
                    {sshKeys.map((key) => (
                      <SelectItem key={key.id} value={key.name}>
                        {key.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Terraform will use this key for VM access
                </p>
              </>
            )}
          </div>

          {category === 1 && (
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Layers className="h-4 w-4" />
                AMI (Amazon Machine Image)
              </Label>
              <Select value={ami} onValueChange={setAmi}>
                <SelectTrigger className="bg-muted/50">
                  <SelectValue placeholder="Select AMI..." />
                </SelectTrigger>
                <SelectContent>
                  {getAmiOptions(region).map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Options are based on the selected region
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Runtime Policy */}
      {runtimePolicyInfo.show && (
        <section className="glass-panel rounded-xl p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Runtime Policy
          </h2>

          <div className="mb-4 p-4 rounded-lg border border-orange-500/50 bg-orange-500/10 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-orange-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-orange-400">Late request detected</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                This request is outside or near the end of your working hours. Select the required runtime (up to {maxRuntimeHours} hours).
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Select Runtime Duration</Label>
            <Select
              value={String(runtimeDuration)}
              onValueChange={(v) => setRuntimeDuration(Number(v))}
            >
              <SelectTrigger className="bg-muted/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: maxRuntimeHours }, (_, i) => i + 1).map((h) => (
                  <SelectItem key={h} value={String(h)}>
                    {h} {h === 1 ? "hour" : "hours"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Maximum runtime: {maxRuntimeHours} hours</p>
          </div>

          <div className="mt-4 p-3 rounded-lg border border-border bg-muted/20 flex items-center gap-2 text-sm text-muted-foreground">
            <Info className="h-4 w-4 shrink-0" />
            VM will stop automatically after the selected duration.
          </div>

          {vmStopTime && (
            <div className="mt-3 p-3 rounded-lg border border-primary/30 bg-primary/5 text-sm">
              VM will stop at: <span className="font-semibold text-foreground">{vmStopTime}</span>
            </div>
          )}
        </section>
      )}

      {/* VM Role Configuration */}
      {category === 1 && (
        <section className="glass-panel rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Server className="h-5 w-5 text-primary" />
              VM Role Configuration
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Total VMs:</span>
              <Badge
                variant="outline"
                className={cn(
                  "text-lg font-bold px-3 py-1",
                  isOverQuota && "border-destructive text-destructive",
                )}
              >
                {newVMs} / {remainingQuota}
              </Badge>
            </div>
          </div>

          <div className="space-y-4">
            {VM_ROLES.map((role) => {
              const roleState = roles[role.id] ?? {
                count: 0,
                instanceType: defaultType,
              };
              return (
                <RoleRow
                  key={role.id}
                  role={role}
                  count={roleState.count || 0}
                  instanceType={roleState.instanceType}
                  allowedTypes={currentUser?.allowedInstanceTypes || []}
                  onUpdateCount={(count) => updateRole(role.id, "count", count)}
                  onUpdateType={(type) =>
                    updateRole(role.id, "instanceType", type)
                  }
                />
              );
            })}
          </div>
        </section>
      )}

      {/* ============================
      All In One Configuration (Category 2)
      ============================ */}
      {category === 2 && (
        <section className="glass-panel rounded-xl p-6 border border-warning/40 bg-warning/5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Server className="h-5 w-5 text-warning" />
              All in One Configuration
            </h2>
            <div className="text-sm text-muted-foreground">
              Total VMs:
              <Badge variant="outline" className="ml-2 font-normal text-lg">
                {remainingQuota > 0 ? `1 / ${remainingQuota}` : "0 / 0"}
              </Badge>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
            <div className="flex items-center gap-4">
              <span className="text-2xl">🖥️</span>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground">All in One</p>
                </div>

                <p className="text-xs text-muted-foreground">
                  Single VM with Splunk auto-installed
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Select
                value={allInOneInstanceType}
                onValueChange={setAllInOneInstanceType}
              >
                <SelectTrigger className="w-[140px] bg-muted/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INSTANCE_TYPES.filter((t) =>
                    currentUser?.allowedInstanceTypes?.includes(t.value),
                  ).map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      <span className="font-mono">{t.label}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {t.vcpu}vCPU / {t.memory}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Badge variant="secondary">x1</Badge>
            </div>
          </div>
        </section>
      )}

      {/* ============================
      Predefined Infrastructure (Category 3)
      ============================ */}
      {category === 3 && (
        <section className="glass-panel rounded-xl p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold flex items-center gap-3">
              <Server className="h-5 w-5 text-primary" />
              Predefined Infrastructure
            </h2>

            <div className="text-sm text-muted-foreground">
              Total VMs:
              <Badge
                variant="outline"
                className={cn(
                  "ml-2 font-normal text-lg",
                  CATEGORY_3_TOTAL_VMS > remainingQuota &&
                    "border-destructive text-destructive",
                )}
              >
                {CATEGORY_3_TOTAL_VMS} / {remainingQuota}
              </Badge>
            </div>
          </div>

          {/* Role List */}
          <div className="space-y-3">
            {CATEGORY_3_INFRA.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/20"
              >
                <div className="flex items-center gap-4">
                  <span className="text-2xl">{item.icon}</span>
                  <div>
                    <p className="font-medium text-foreground">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Badge variant="secondary">{item.type}</Badge>
                  <Badge variant="outline">x{item.count}</Badge>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ============================
      Predefined Infrastructure (Category 4)
      ============================ */}
      {category === 4 && (
        <section className="glass-panel rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold flex items-center gap-3">
              <Server className="h-5 w-5 text-primary" />
              HA Cluster Infrastructure
            </h2>

            <div className="text-sm text-muted-foreground">
              Total VMs:
              <Badge
                variant="outline"
                className={cn(
                  "ml-2 font-normal text-lg",
                  CATEGORY_4_TOTAL_VMS > remainingQuota &&
                    "border-destructive text-destructive",
                )}
              >
                {CATEGORY_4_TOTAL_VMS} / {remainingQuota}
              </Badge>
            </div>
          </div>

          <div className="space-y-3">
            {CATEGORY_4_INFRA.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/20"
              >
                <div className="flex items-center gap-4">
                  <span className="text-2xl">{item.icon}</span>
                  <div>
                    <p className="font-medium text-foreground">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Badge variant="secondary">{item.type}</Badge>
                  <Badge variant="outline">x{item.count}</Badge>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {category === 5 && (
        <section className="glass-panel rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold flex items-center gap-3">
              <Server className="h-5 w-5 text-primary" />
              Predefined Infrastructure
            </h2>
            <div className="text-sm text-muted-foreground">
              Total VMs:
              <Badge
                variant="outline"
                className={cn(
                  "ml-2 font-normal text-lg",
                  CATEGORY_4_TOTAL_VMS > remainingQuota &&
                    "border-destructive text-destructive",
                )}
              >
                {CATEGORY_4_TOTAL_VMS} / {remainingQuota}
              </Badge>
            </div>
          </div>

          <div className="space-y-3">
            {CATEGORY_4_INFRA.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/20"
              >
                <div className="flex items-center gap-4">
                  <span className="text-2xl">{item.icon}</span>
                  <div>
                    <p className="font-medium text-foreground">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Select
                    value={cat5InstanceTypes[item.id] ?? item.type}
                    onValueChange={(val) =>
                      setCat5InstanceTypes((prev) => ({
                        ...prev,
                        [item.id]: val,
                      }))
                    }
                  >
                    <SelectTrigger className="w-[140px] bg-muted/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INSTANCE_TYPES.filter((t) =>
                        currentUser?.allowedInstanceTypes?.includes(t.value),
                      ).map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          <span className="font-mono">{t.label}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {t.vcpu}vCPU / {t.memory}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Badge variant="outline">x{item.count}</Badge>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="glass-panel rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Business Justification</h2>
        </div>

        <div className="space-y-3">
          {/* <Label htmlFor="justification">
            Justification <span className="text-destructive">*</span>
          </Label> */}

          <Textarea
            id="justification"
            className={`resize-none overflow-y-auto ${justificationTouched && justificationError ? "border-red-500 ring-1 ring-red-200" : ""}`}
            placeholder="Provide a brief justification for this VM request."
            value={justification}
            onChange={(e) => {
              const value = e.target.value;
              setJustification(value);
              if (justificationTouched) setJustificationError(value.trim().length < 20);
            }}
            onBlur={() => {
              setJustificationTouched(true);
              setJustificationError(justification.trim().length < 20);
            }}
            rows={3}
            maxLength={250}
          />

          <div className="flex justify-between items-center mt-1">
            {justificationTouched && justificationError ? (
              <div className="text-xs text-red-600">
                Business justification must contain at least 20 characters.
              </div>
            ) : <span />}
            <p className="text-xs text-muted-foreground">{justification.length}/250</p>
          </div>
        </div>
      </section>

      {/* Submit */}
      <div className="flex flex-col space-y-2">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => navigate("/requests")}>
            Cancel
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <Button
                            onClick={onOpenDialog}
                            disabled={isDisabled}
                            className="min-w-[200px]"
                          >
                            Submit Request ({effectiveVMs} VMs)
                          </Button>
                        </span>
                      </TooltipTrigger>

                      {isDisabled && (
                        <TooltipContent side="bottom" sideOffset={8}>
                          <p>{tooltipMessage}</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                </span>
              </TooltipTrigger>

              {isDisabled && (
                <TooltipContent side="bottom" sideOffset={8}>
                  <p>{tooltipMessage}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
            <div className="p-4 pb-4 border-b">
              <DialogHeader className="text-center items-center">
                <DialogTitle className="text-xl font-semibold text-foreground">
                  Confirm VM Request
                </DialogTitle>
                <DialogDescription className="text-muted-foreground mt-2">
                  Please review the details below before submitting your request.
                </DialogDescription>
              </DialogHeader>
            </div>
            <div className="space-y-4 mt-4 text-sm overflow-y-auto model-scroll-hide flex-1 px-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Category</p>
                  <p className="font-medium text-foreground">{visibleCategories.find(item => item.value === category)?.label}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Environment</p>
                  <p className="font-medium text-foreground">{ENVIRONMENT_TAGS.find(t => t.value === environmentTag)?.label}</p>
                </div>
              </div>

              <div
                className={`grid gap-3 ${category === 1 ? "grid-cols-1" : "grid-cols-2"
                  }`}
              >
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Project</p>
                  <p className="font-medium text-foreground">{projectIdentifier}</p>
                </div>

                {category !== 1 && (
                  <div className="p-3 rounded-lg bg-muted/50 border border-border">
                    <p className="text-xs text-muted-foreground mb-1">Splunk Version</p>
                    <p className="font-medium text-foreground">
                      {SPLUNK_VERSIONS.find(v => v.value === splunkVersion)?.label}
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Deployment</p>
                  <p className="font-medium text-foreground capitalize">{deploymentMode.replace('-', ' ')}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Region(s)</p>
                  <p className="font-medium text-foreground">
                    {deploymentMode === 'multi-region'
                      ? selectedRegions.map(r => AWS_REGIONS.find(ar => ar.value === r)?.label).join(', ')
                      : AWS_REGIONS.find(r => r.value === region)?.label}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Disk Size</p>
                  <p className="font-medium text-foreground">{diskSize} GB</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <p className="text-xs text-muted-foreground mb-1">SSH Key</p>
                  <p className="font-medium text-foreground">{selectedSSHKeyName}</p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-xs text-muted-foreground mb-2">
                  VM Roles ({effectiveVMs} total)
                </p>

                <div className="space-y-1">
                  {roleConfigs.map((role) => (
                    <div
                      key={role.roleId}
                      className="flex items-center justify-between"
                    >
                      <span className="text-foreground">{role.roleName}</span>

                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="font-mono text-xs">
                          {role.instanceType}
                        </Badge>

                        <Badge variant="outline" className="text-xs">
                          ×{role.count}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-xs text-muted-foreground mb-1">
                  Justification
                </p>
                <p className="font-medium text-foreground whitespace-pre-wrap">
                  {justification}
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

                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Submitting..." : "Confirm & Submit"}
                  </Button>
                </DialogFooter>
              </div>
            </div>
          </DialogContent>
        </Dialog>


        {isOverQuota && (
          <div className="flex justify-end">
            <p className="text-sm text-destructive font-medium">
              ⚠ VM Quota exceeded. Contact admin.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function RoleRow({
  role,
  count,
  instanceType,
  allowedTypes,
  onUpdateCount,
  onUpdateType,
}: {
  role: (typeof VM_ROLES)[0];
  count: number;
  instanceType: string;
  allowedTypes: string[];
  onUpdateCount: (count: number) => void;
  onUpdateType: (type: string) => void;
}) {
  const filteredTypes = INSTANCE_TYPES.filter((t) =>
    allowedTypes.includes(t.value),
  );

  return (
    <div
      className={cn(
        "flex items-center justify-between p-4 rounded-lg border transition-all",
        count > 0 ? "border-primary/50 bg-primary/5" : "border-border",
      )}
    >
      <div className="flex items-center gap-4">
        <span className="text-2xl">{role.icon}</span>
        <div>
          <p className="font-medium text-foreground">{role.name}</p>
          <p className="text-xs text-muted-foreground">{role.description}</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Select
          value={instanceType}
          onValueChange={onUpdateType}
          disabled={count === 0}
        >
          <SelectTrigger className="w-[140px] bg-muted/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {filteredTypes.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                <span className="font-mono">{t.label}</span>
                <span className="text-xs text-muted-foreground ml-2">
                  {t.vcpu}vCPU / {t.memory}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onUpdateCount(Math.max(0, count - 1))}
            disabled={count === 0}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="w-8 text-center font-mono text-lg">{count}</span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onUpdateCount(count + 1)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
