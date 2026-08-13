import {
  OHIO_AMI_OPTIONS,
  NVIRGINIA_AMI_OPTIONS,
  type AmiOption,
} from "@/types";

export const DEFAULT_AMI_OPTIONS: AmiOption[] = OHIO_AMI_OPTIONS;

export const AMI_OPTIONS_BY_REGION: Record<string, AmiOption[]> = {
  "us-east-2": OHIO_AMI_OPTIONS,
  "us-east-1": NVIRGINIA_AMI_OPTIONS,
};

export const getAmiOptions = (region: string): AmiOption[] =>
  AMI_OPTIONS_BY_REGION[region] ?? DEFAULT_AMI_OPTIONS;

export const MAX_GENERAL_GROUPS = 10;

export const makeGroupId = () => `grp-${Math.random().toString(36).slice(2, 9)}`;
