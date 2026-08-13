export interface VM {
  id: number;
  name: string;
  role: string;
  instanceId: string;
  instanceType?: string;
  publicIp: string;
  privateIp: string;
  region: string;
  status: string;
  requestId: string | null;
  userId: number;
  workspace?: string;
  launchedAt?: string;
  stop_time?: string | null;
}

export type Scope = 'single' | 'request';
export type DurationOption = '1h' | '2h' | '4h' | '8h' | 'custom';

export interface FreeExtStatus {
  free_threshold: number;
  used_hours: number;
  remaining_free_hours: number;
}

export type RuntimeExtensionContext = {
  requestId: string;
  vm?: VM;
  vms?: VM[];
  requestLevelEnabled?: boolean;
};

export type RuntimeExtensionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  extensionContext?: RuntimeExtensionContext | null;
  onSuccess?: () => void;
};
