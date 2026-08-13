/**
 * useVMRequestForm.ts
 * Owns all form state, effects, validation and submission logic for the
 * EC2 VM request flow (VMRequestForm.tsx).
 */
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/store/appStore";
import { useSSHKeys } from "@/hooks/useSSHKeys";
import { useAwsConfig } from "@/hooks/useAwsConfig";
import { useDialog } from "@/components/ui/dialog-context";
import {
  VM_ROLES,
  CATEGORY_OPTIONS,
  CATEGORY_3_INFRA,
  CATEGORY_4_INFRA,
  TIMEZONES,
  type CategoryType,
  type VMRoleConfig,
  type DeploymentMode,
  type EnvironmentTag,
} from "@/types";
import {
  getAmiOptions,
  makeGroupId,
} from "@/components/requests/vmRequest.constants";
import type { GeneralVmGroup, VmMode } from "@/components/requests/vmRequest.types";

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

export function useVMRequestForm(onSubmit: (payload: any) => void, isSubmitting: boolean = false) {
  const { alert } = useDialog();
  const navigate = useNavigate();
  const { currentUser } = useAppStore();
  const {
    keys: sshKeys,
    loading: sshKeysLoading,
    loadError: sshKeysError,
  } = useSSHKeys();

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
  const [ami, setAmi] = useState<string>(() => getAmiOptions(getDefaultRegion())[0]?.value ?? "");
  const selectedAmi = getAmiOptions(region).find(
    option => option.value === ami
  );
  useEffect(() => {
    const opts = getAmiOptions(region);
    if (!opts.some((o) => o.value === ami)) {
      setAmi(opts[0]?.value ?? "");
    }
  }, [region]);
  const [allInOneInstanceType, setAllInOneInstanceType] = useState("");
  const [cat5InstanceTypes, setCat5InstanceTypes] = useState<
    Record<string, string>
  >(() => Object.fromEntries(CATEGORY_4_INFRA.map((r) => [r.id, r.type])));
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [runtimeDuration, setRuntimeDuration] = useState<number>(8);

  // ── Category 1 deployment mode toggle (Splunk vs General Purpose) ────────
  const [vmMode, setVmMode] = useState<VmMode>("splunk");
  const MAX_GENERAL_GROUPS = 10;
  const [generalGroups, setGeneralGroups] = useState<GeneralVmGroup[]>([]);

  const { data: awsConfig } = useAwsConfig();
  const [roleConfigs, setRoleConfigs] = useState<VMRoleConfig[]>([]);
  const [splunkVersion, setSplunkVersion] = useState("10.2.3");
  const [justification, setJustification] = useState("");
  const [justificationTouched, setJustificationTouched] = useState(false);
  const [justificationError, setJustificationError] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [projectIdentifierError, setProjectIdentifierError] = useState("");
  const [sshKeyError, setSshKeyError] = useState("");
  const [splunkVersionError, setSplunkVersionError] = useState("");
  const [generalGroupErrors, setGeneralGroupErrors] = useState<Record<string, string>>({});
  const projectIdentifierRef = useRef<HTMLInputElement>(null);
  const sshKeySectionRef = useRef<HTMLDivElement>(null);
  const splunkVersionSectionRef = useRef<HTMLDivElement>(null);
  const justificationRef = useRef<HTMLDivElement>(null);

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
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const defaultRegion = getDefaultRegion();
    setRegion(defaultRegion);
    setSelectedRegions([defaultRegion]);
  }, []);
  useEffect(() => {
    if (!selectedAmi) return;

    setDiskSize((prev) => {
      if (prev < selectedAmi.minimumDiskSize) {
        return selectedAmi.defaultDiskSize;
      }

      if (prev > selectedAmi.defaultDiskSize) {
        return selectedAmi.defaultDiskSize;
      }

      return prev;
    });
  }, [selectedAmi]);

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
            currentUser.allowedInstanceTypes.includes(r.type) ? r.type : firstAllowed,
          ])
        )
      );
    }
  }, [category, currentUser]);

  const MAX_VM_LIMIT = currentUser?.maxVMs || 13; //13

  const activeVMs = currentUser?.activeVMs || 0;
  const provisioningVMs = currentUser?.provisioningVMs || 0;

  const usedVMs = activeVMs + provisioningVMs;
  const splunkNewVMs = Object.values(roles).reduce((sum, r) => sum + r.count, 0);
  const generalNewVMs = generalGroups.reduce((sum, g) => sum + (g.count || 0), 0);
  const newVMs = category === 1 && vmMode === "general" ? generalNewVMs : splunkNewVMs;
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

  const resetVmConfiguration = (nextMode: VmMode) => {
    setVmMode(nextMode);
    setRoles({});
    setGeneralGroups(
      nextMode === "general"
        ? [
            {
              id: makeGroupId(),
              name: "",
              instanceType: defaultType,
              count: 1,
            },
          ]
        : []
    );
    setRoleConfigs([]);
  };

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
    setSubmitted(true);
    setJustificationTouched(true);

    // ── Compute all errors synchronously ─────────────────────────────────
    let projErr = "";
    if (!projectIdentifier.trim()) {
      projErr = "Project Identifier is required";
    } else if (!/^[a-zA-Z0-9_-]+$/.test(projectIdentifier)) {
      projErr = "projectIdentifier can only contain letters, numbers, hyphens, and underscores";
    } else if (category === 5 && !/^[a-z0-9-]{1,32}$/i.test(projectIdentifier)) {
      projErr = "Only letters, numbers and hyphens(-), max 32 characters for category 5";
    }
    setProjectIdentifierError(projErr);

    const sshErr = !selectedSSHKeyName ? "Please select an SSH key" : "";
    setSshKeyError(sshErr);

    const splunkErr = category !== 1 && !splunkVersion ? "Please select a Splunk version" : "";
    setSplunkVersionError(splunkErr);

    const justErr = justification.trim().length < 20 || !/[a-zA-Z]/.test(justification.trim());
    setJustificationError(justErr);

    // General group errors (cat 1, general mode)
    const grpErrors: Record<string, string> = {};
    if (category === 1 && vmMode === "general") {
      const trimmedGroups = generalGroups.filter((g) => (g.count || 0) > 0);
      const names = trimmedGroups.map((g) => g.name.trim().toLowerCase());
      trimmedGroups.forEach((g) => {
        if (!g.name.trim()) grpErrors[g.id] = "Name is required";
        else if (!g.instanceType) grpErrors[g.id] = "Instance type is required";
      });
      // Duplicate name check
      names.forEach((n, i) => {
        if (n && names.indexOf(n) !== i) {
          grpErrors[trimmedGroups[i].id] = "Group names must be unique";
        }
      });
    }
    setGeneralGroupErrors(grpErrors);

    // ── Hard-stop conditions (quota / AWS) — keep alert for these ────────
    if (isOverQuota) {
      alert({ title: `Exceeds quota. Maximum ${remainingQuota} VMs allowed.`, severity: "error" });
      return;
    }

    // ── Check if any inline error exists → scroll to first ───────────────
    const hasInlineError =
      projErr ||
      sshErr ||
      splunkErr ||
      justErr ||
      Object.keys(grpErrors).length > 0 ||
      (category !== 2 && requestedVMs === 0);

    if (hasInlineError) {
      setTimeout(() => {
        if (projErr) {
          projectIdentifierRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        } else if (splunkErr) {
          splunkVersionSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        } else if (sshErr) {
          sshKeySectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        } else if (justErr) {
          justificationRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 0);
      return;
    }

    // ── Build rolesData ───────────────────────────────────────────────────
    let rolesData: VMRoleConfig[] = [];

    if (category === 2) {
      rolesData = [{ roleId: "aio", roleName: "All In One", count: 1, instanceType: allInOneInstanceType }];
    } else if (category === 3) {
      rolesData = CATEGORY_3_INFRA.map((r) => ({ roleId: r.id, roleName: r.name, count: r.count, instanceType: r.type }));
    } else if (category === 4) {
      rolesData = CATEGORY_4_INFRA.map((r) => ({ roleId: r.id, roleName: r.name, count: r.count, instanceType: r.type }));
    } else if (category === 5) {
      rolesData = CATEGORY_4_INFRA.map((r) => ({ roleId: r.id, roleName: r.name, count: r.count, instanceType: cat5InstanceTypes[r.id] ?? r.type }));
    } else {
      if (vmMode === "general") {
        rolesData = generalGroups
          .filter((g) => (g.count || 0) > 0)
          .map((g) => ({ roleId: g.id, roleName: g.name.trim(), count: g.count, instanceType: g.instanceType }));
      } else {
        rolesData = Object.entries(roles)
          .filter(([_, config]) => config.count > 0)
          .map(([roleId, config]) => {
            const role = VM_ROLES.find((r) => r.id === roleId)!;
            return { roleId, roleName: role.name, count: config.count, instanceType: config.instanceType };
          });
      }
    }

    if (category === 3 && CATEGORY_3_TOTAL_VMS > remainingQuota) {
      alert({ title: `Category 3 requires ${CATEGORY_3_TOTAL_VMS} VMs, but only ${remainingQuota} are available.`, severity: "error" });
      return;
    }

    setRoleConfigs(rolesData);
    setIsDialogOpen(true);
  };

  function handleSubmit() {
    const selectedAmi = getAmiOptions(region).find((option) => option.value === ami);
    const isCat1 = category === 1;
    const isGeneral = isCat1 && vmMode === "general";

    const payload = {
      category: Number(category),
      ...(isCat1 && { provisionMode: vmMode }),
      environmentTag,
      projectIdentifier,
      ...(!isCat1 && { splunkVersion }),
      ...(isCat1 && {
        amiId: selectedAmi?.amiId ?? "",
        amiName: selectedAmi?.label ?? "",
        osType: selectedAmi?.osType ?? "amazon",
      }),
      deploymentMode,
      region,
      regions: deploymentMode === "multi-region" ? selectedRegions : [region],
      diskSize,
      sshKeyName: selectedSSHKeyName,
      ...(isGeneral
        ? {
            vmGroups: roleConfigs.map((r) => ({
              name: r.roleName,
              instanceType: r.instanceType,
              count: r.count,
            })),
          }
        : {
            roles: roleConfigs.map((r) => ({
              roleId: r.roleId,
              roleName: r.roleName,
              instanceType: r.instanceType,
              count: r.count,
            })),
          }),
      ...(runtimePolicyInfo.show && { runtimeDurationHours: runtimeDuration }),
      justification,
    };

    onSubmit(payload);
  }

  const visibleCategories = CATEGORY_OPTIONS.filter((cat) =>
    currentUser?.allowedCategories?.includes(cat.value),
  );

  useEffect(() => {
    if (!category && visibleCategories.length > 0) {
      setCategory(visibleCategories[0].value);
    }
  }, [visibleCategories, category]);

  useEffect(() => {
    if (!projectIdentifier) return;
    if (!projectIdentifier.trim()) {
      setProjectIdentifierError("Project Identifier is required");
    } else if (!/^[a-zA-Z0-9_-]+$/.test(projectIdentifier)) {
      setProjectIdentifierError("projectIdentifier can only contain letters, numbers, hyphens, and underscores");
    } else if (category === 5 && !/^[a-z0-9-]{1,32}$/i.test(projectIdentifier)) {
      setProjectIdentifierError("Only letters, numbers and hyphens(-), max 32 characters for category 5");
    } else {
      setProjectIdentifierError("");
    }
  }, [category]);

  useEffect(() => {
    if (category === 1) {
      setSplunkVersion("");
    } else {
      setSplunkVersion((prev) => prev || "10.2.3");
    }
  }, [category]);

  const isAwsDisconnected = awsConfig?.status !== "CONNECTED";
  const isDisabled = isAwsDisconnected || isSubmitting;

  let tooltipMessage = "";
  if (isSubmitting) {
    tooltipMessage = "Submitting request...";
  } else if (isAwsDisconnected) {
    tooltipMessage = "AWS Disconnected";
  }

  return {
    navigate,
    currentUser,
    sshKeys,
    sshKeysLoading,
    sshKeysError,
    environmentTag,
    setEnvironmentTag,
    projectIdentifier,
    setProjectIdentifier,
    deploymentMode,
    setDeploymentMode,
    region,
    setRegion,
    selectedRegions,
    setSelectedRegions,
    diskSize,
    setDiskSize,
    selectedSSHKeyName,
    setSelectedSSHKeyName,
    roles,
    updateRole,
    category,
    setCategory,
    ami,
    setAmi,
    selectedAmi,
    allInOneInstanceType,
    setAllInOneInstanceType,
    cat5InstanceTypes,
    setCat5InstanceTypes,
    isDialogOpen,
    setIsDialogOpen,
    runtimeDuration,
    setRuntimeDuration,
    vmMode,
    setVmMode,
    MAX_GENERAL_GROUPS,
    generalGroups,
    setGeneralGroups,
    awsConfig,
    roleConfigs,
    setRoleConfigs,
    splunkVersion,
    setSplunkVersion,
    justification,
    setJustification,
    justificationTouched,
    setJustificationTouched,
    justificationError,
    setJustificationError,
    submitted,
    setSubmitted,
    projectIdentifierError,
    setProjectIdentifierError,
    sshKeyError,
    setSshKeyError,
    splunkVersionError,
    setSplunkVersionError,
    generalGroupErrors,
    setGeneralGroupErrors,
    projectIdentifierRef,
    sshKeySectionRef,
    splunkVersionSectionRef,
    justificationRef,
    runtimePolicyInfo,
    timeZoneLabel,
    maxRuntimeHours,
    vmStopTime,
    MAX_VM_LIMIT,
    usedVMs,
    newVMs,
    remainingQuota,
    CATEGORY_3_TOTAL_VMS,
    CATEGORY_4_TOTAL_VMS,
    requestedVMs,
    isOverQuota,
    effectiveVMs,
    defaultType,
    resetVmConfiguration,
    onOpenDialog,
    handleSubmit,
    visibleCategories,
    isAwsDisconnected,
    isDisabled,
    tooltipMessage,
  };
}
