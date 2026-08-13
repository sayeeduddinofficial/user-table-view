/**
 * UserForm.tsx
 * Add / Edit user form. Handles all local form state and validation.
 * Calls onSubmit with a clean payload — no API calls inside.
 */

import { useState, useEffect } from "react";
import { Globe } from "lucide-react";
import { useAuth } from "@/hooks/useLogin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDialog } from "@/components/ui/dialog-context";
import { isAdmin, ROLE_LABELS } from "@/utils/roles";
import {
  TIMEZONES,
  to24Hour,
  from24Hour,
  validateShiftDuration,
  DEFAULT_SHIFT_BY_TIMEZONE,
} from "@/utils/workSchedule";
import { TimePicker } from "@/utils/TimePicker";
import { INSTANCE_TYPES, CATEGORY_OPTIONS } from "@/types";
import type { User, Role, CategoryType } from "@/types";

// ── Types ────────────────────────────────────────────────────────────────────
export interface UserFormValues {
  id: string;
  name: string;
  email: string;
  entraObjectId?: string;
  role: Role;
  maxVMs: number;
  currentVMs: number;
  maxBuckets: number;
  maxVpcs: number;
  maxLoadBalancers: number;
  maxEksClusters: number;
  maxDnsRecords: number;
  maxRdsClusters: number;
  allowedInstanceTypes: string[];
  allowedCategories: CategoryType[];
  timeZone: string;
  workStartTime: string;
  workEndTime: string;
  createdAt: Date;
  lastActive: Date;
}

interface UserFormProps {
  user?: User;
  onSubmit: (values: UserFormValues) => Promise<void> | void;
  onCancel: () => void;
}

// ── Component ────────────────────────────────────────────────────────────────
export function UserForm({ user, onSubmit, onCancel }: UserFormProps) {
  const { alert } = useDialog();
  const { user: authUser } = useAuth();
  const isAdminAccess = isAdmin(authUser?.role);

  // ── Field state ────────────────────────────────────────────────────────
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [role, setRole] = useState<Role>(user?.role ?? "SplunkOps.User");
  const [maxVMs, setMaxVMs] = useState(user?.maxVMs ?? 13);
  const [maxBuckets, setMaxBuckets] = useState(user?.maxBuckets ?? 5);
  const [maxVpcs, setMaxVpcs] = useState(user?.maxVpcs ?? 5);
  const [maxLoadBalancers, setMaxLoadBalancers] = useState(user?.maxLoadBalancers ?? 5);
  const [maxEksClusters, setMaxEksClusters] = useState(user?.maxEksClusters ?? 5);
  const [maxDnsRecords, setMaxDnsRecords] = useState(user?.maxDnsRecords ?? 5);
  const [maxRdsClusters, setMaxRdsClusters] = useState(user?.maxRdsClusters ?? 5);
  const [allowedTypes, setAllowedTypes] = useState<string[]>(
    user?.allowedInstanceTypes ?? ["t3.micro", "t3.small", "t3.medium", "t3.large"],
  );
  const [allowedCategories, setAllowedCategories] = useState<CategoryType[]>(
    user?.allowedCategories ?? ([1] as CategoryType[]),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Work schedule ──────────────────────────────────────────────────────
  const [timeZone, setTimeZone] = useState(user?.timeZone ?? TIMEZONES[0].value);

  const parseTime = (t: string) => from24Hour(t || "");
  const initStart = parseTime(user?.workStartTime ?? "09:00");
  const initEnd = parseTime(user?.workEndTime ?? "18:00");

  const [startHour, setStartHour] = useState(initStart.hour);
  const [startMinute, setStartMinute] = useState(initStart.minute);
  const [startPeriod, setStartPeriod] = useState(initStart.period);
  const [endHour, setEndHour] = useState(initEnd.hour);
  const [endMinute, setEndMinute] = useState(initEnd.minute);
  const [endPeriod, setEndPeriod] = useState(initEnd.period);

  const workStartTime24 = to24Hour(startHour, startMinute, startPeriod);
  const workEndTime24 = to24Hour(endHour, endMinute, endPeriod);
  const shiftError = validateShiftDuration(workStartTime24, workEndTime24);

  // Sync when user prop changes (edit mode re-open)
  useEffect(() => {
    if (!user) return;
    setName(user.name ?? "");
    setEmail(user.email ?? "");
    setRole(user.role ?? "SplunkOps.User");
    setMaxVMs(user.maxVMs ?? 13);
    setMaxBuckets(user.maxBuckets ?? 5);
    setMaxVpcs(user.maxVpcs ?? 5);
    setMaxLoadBalancers(user.maxLoadBalancers ?? 5);
    setMaxEksClusters(user.maxEksClusters ?? 5);
    setMaxDnsRecords(user.maxDnsRecords ?? 5);
    setMaxRdsClusters(user.maxRdsClusters ?? 5);
    setAllowedTypes(Array.isArray(user.allowedInstanceTypes) ? user.allowedInstanceTypes : []);
    setAllowedCategories(
      Array.isArray(user.allowedCategories)
        ? (Array.from(new Set(user.allowedCategories)) as CategoryType[])
        : ([1] as CategoryType[]),
    );
    const tz = user.timeZone ?? TIMEZONES[0].value;
    setTimeZone(tz);
    const s = from24Hour(user.workStartTime ?? "09:00");
    const e = from24Hour(user.workEndTime ?? "18:00");
    setStartHour(s.hour); setStartMinute(s.minute); setStartPeriod(s.period);
    setEndHour(e.hour); setEndMinute(e.minute); setEndPeriod(e.period);
  }, [user]);

  // ── Timezone change: apply region defaults ─────────────────────────────
  function handleTimezoneChange(tz: string) {
    setTimeZone(tz);
    const defaults = DEFAULT_SHIFT_BY_TIMEZONE[tz];
    if (defaults) {
      const s = from24Hour(defaults.start);
      const e = from24Hour(defaults.end);
      setStartHour(s.hour); setStartMinute(s.minute); setStartPeriod(s.period);
      setEndHour(e.hour); setEndMinute(e.minute); setEndPeriod(e.period);
    }
  }

  // ── Toggle helpers ─────────────────────────────────────────────────────
  function toggleType(value: string, checked: boolean) {
    setAllowedTypes((prev) =>
      checked ? [...prev, value] : prev.filter((t) => t !== value),
    );
  }

  function toggleCategory(value: CategoryType, checked: boolean) {
    setAllowedCategories((prev) =>
      checked ? [...prev, value] : prev.filter((c) => c !== value),
    );
  }

  // ── Submit ─────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (isSubmitting) return;

    if (!name || !email) {
      alert({ title: "Please fill in all required fields", severity: "error" });
      return;
    }
    if (!allowedCategories.length) {
      alert({ title: "Select at least one category", severity: "error" });
      return;
    }
    if (!allowedTypes.length) {
      alert({ title: "Select at least one instance type", severity: "error" });
      return;
    }
    if (!timeZone) {
      alert({ title: "Please select a timezone", severity: "error" });
      return;
    }
    if (shiftError) {
      alert({ title: shiftError, severity: "error" });
      return;
    }

    const hasCategory3Or4 = allowedCategories.some((c) => Number(c) === 3 || Number(c) === 4);
    if (hasCategory3Or4 && !allowedTypes.includes("t3.medium")) {
      alert({
        title: "Category 3 (Standard Cluster) and Category 4 (HA Cluster) require t3.medium.",
        severity: "error",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        id: user?.id ?? `user-${Date.now().toString(36)}`,
        name,
        email: email.trim().toLowerCase(),
        role,
        maxVMs,
        currentVMs: user?.currentVMs ?? 0,
        maxBuckets,
        maxVpcs,
        maxLoadBalancers,
        maxEksClusters,
        maxDnsRecords,
        maxRdsClusters,
        allowedInstanceTypes: Array.from(new Set(allowedTypes)),
        allowedCategories: Array.from(new Set(allowedCategories)) as CategoryType[],
        timeZone,
        workStartTime: workStartTime24,
        workEndTime: workEndTime24,
        createdAt: user?.createdAt ?? new Date(),
        lastActive: new Date(),
      });
    } finally {
      setIsSubmitting(false);
    }
  }
  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Doe"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input id="email" type="email" value={email} disabled />
        </div>
      </div>

      {/* Role */}
      <div className="space-y-2">
        <Label>Role</Label>
        <Input value={ROLE_LABELS[role] ?? role} disabled />
      </div>

      {/* Timezone */}
      <div className="space-y-2">
        <Label htmlFor="timeZone">
          <span className="flex items-center gap-1">
            <Globe size={17} /> Timezone
          </span>
        </Label>
        <Select value={timeZone} onValueChange={handleTimezoneChange}>
          <SelectTrigger id="timeZone">
            <SelectValue placeholder="Select timezone" />
          </SelectTrigger>
          <SelectContent>
            {TIMEZONES.map((tz) => (
              <SelectItem key={tz.value} value={tz.value}>
                {tz.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Work Schedule */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Work Start Time</Label>
          <TimePicker
            idPrefix="start"
            value={{ hour: startHour, minute: startMinute, period: startPeriod }}
            onChange={(h, m, p) => { setStartHour(h); setStartMinute(m); setStartPeriod(p); }}
          />
        </div>
        <div className="space-y-2">
          <Label>Work End Time (EOD)</Label>
          <TimePicker
            idPrefix="end"
            value={{ hour: endHour, minute: endMinute, period: endPeriod }}
            onChange={(h, m, p) => { setEndHour(h); setEndMinute(m); setEndPeriod(p); }}
          />
        </div>
      </div>

      {shiftError && <p className="text-xs text-destructive -mt-2">{shiftError}</p>}
      <p className="text-xs text-muted-foreground -mt-2">
        Instances will automatically stop at End of Day based on the user's timezone.
      </p>

      {/* Service Quotas */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Service Quotas</Label>
          <span className="text-xs text-muted-foreground">Per-service caps for this user</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: "EC2", value: maxVMs, setValue: setMaxVMs, min: 1, max: 50, unit: "VMs" },
            { label: "S3 Buckets", value: maxBuckets, setValue: setMaxBuckets, min: 1, max: 10, unit: "buckets" },
            { label: "VPC", value: maxVpcs, setValue: setMaxVpcs, min: 1, max: 10, unit: "VPCs" },
            { label: "Load Balancers", value: maxLoadBalancers, setValue: setMaxLoadBalancers, min: 1, max: 10, unit: "LBs" },
            { label: "EKS Clusters", value: maxEksClusters, setValue: setMaxEksClusters, min: 1, max: 10, unit: "clusters" },
            { label: "Route53 Records", value: maxDnsRecords, setValue: setMaxDnsRecords, min: 1, max: 10, unit: "records" },
            { label: "RDS Databases", value: maxRdsClusters, setValue: setMaxRdsClusters, min: 1, max: 10, unit: "databases" },
          ].map((q) => (
            <div key={q.label} className="rounded-lg border border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm">{q.label}</Label>
                <span className="text-sm font-semibold text-primary">{q.value}</span>
              </div>
              <Slider
                value={[q.value]}
                onValueChange={([v]) => { if (isAdminAccess) q.setValue(v); }}
                min={q.min}
                max={q.max}
                step={1}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
          <span>{q.min}</span>
          <span>{q.max}</span>
        </div>
            </div>
          ))}
        </div>
      </div>

      {/* Allowed Instance Types */}
      <div className="space-y-3">
        <Label>Allowed Instance Types</Label>
        <div className="grid grid-cols-2 gap-2 p-1">
          {INSTANCE_TYPES.map((type) => (
            <label
              key={type.value}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
            >
              <Checkbox
                checked={allowedTypes.includes(type.value)}
                onCheckedChange={(checked) => toggleType(type.value, !!checked)}
              />
              <span className="font-mono text-sm">{type.label}</span>
              <span className="text-xs text-muted-foreground">
                {type.vcpu}vCPU / {type.memory}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Allowed Categories */}
      <div className="space-y-3">
        <Label>Allowed Categories</Label>
        <div className="space-y-2 p-1">
          {CATEGORY_OPTIONS.map((category) => (
            <label
              key={category.value}
              className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer"
            >
              <Checkbox
                checked={allowedCategories.includes(category.value)}
                onCheckedChange={(checked) =>
                  toggleCategory(category.value, !!checked)
                }
              />
              <div>
                <p className="text-sm font-mono">{category.label}</p>
                <p className="text-xs text-muted-foreground">{category.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : user ? "Save Changes" : "Add User"}
        </Button>
      </div>
    </div>
  );
}