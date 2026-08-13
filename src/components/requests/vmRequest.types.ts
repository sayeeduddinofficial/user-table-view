import type { VMRoleConfig } from "@/types";

export type Props = {
  onSubmit: (payload: any) => void;
  isSubmitting?: boolean;
};

export type VmMode = "splunk" | "general";

export type GeneralVmGroup = {
  id: string;
  name: string;
  instanceType: string;
  count: number;
};

export type RuntimePolicyInfo = {
  show: boolean;
  minsToEnd?: number;
  timeZone?: string;
  workEndTime?: string;
  beforeShift?: boolean;
};

export type { VMRoleConfig };
