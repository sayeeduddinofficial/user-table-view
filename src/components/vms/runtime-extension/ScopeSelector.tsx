import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Monitor, Layers } from 'lucide-react';
import type { Scope, VM } from '@/components/vms/runtimeExtension.types';

interface Props {
  scope: Scope;
  onScopeChange: (scope: Scope) => void;
  vm?: VM;
  requestLevelEnabled: boolean;
  requestId: string;
}

export function ScopeSelector({ scope, onScopeChange, vm, requestLevelEnabled, requestId }: Props) {
  return (
    <div className="space-y-2">
      <Label>Extension Scope</Label>
      <RadioGroup
        value={scope}
        onValueChange={(v) => onScopeChange(v as Scope)}
        className="grid grid-cols-2 gap-3"
      >
        <label
          className={`w-full flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer transition-colors ${
            scope === 'single' ? 'border-primary bg-primary/5' : 'border-border/50 bg-muted/30'
          } ${!vm ? 'opacity-40 pointer-events-none' : ''}`}
        >
          <RadioGroupItem value="single" id="scope-single" disabled={!vm} />
          <Monitor className="h-4 w-4 text-muted-foreground" />
          <div className="text-sm">
            <p className="font-medium text-foreground">Single VM</p>
            <p className="text-[11px] text-muted-foreground">
              {vm ? vm.name : 'Select from instance row'}
            </p>
          </div>
        </label>

        <label
          className={`w-full flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors ${
            !requestLevelEnabled
              ? 'opacity-40 pointer-events-none cursor-not-allowed'
              : 'cursor-pointer'
          } ${
            scope === 'request' ? 'border-primary bg-primary/5' : 'border-border/50 bg-muted/30'
          }`}
        >
          <RadioGroupItem value="request" id="scope-request" disabled={!requestLevelEnabled} />
          <Layers className="h-4 w-4 text-muted-foreground" />
          <div className="text-sm">
            <p className="font-medium text-foreground">Entire Request</p>
            {!requestLevelEnabled ? (
              <p className="text-[11px] text-amber-400">Vms under request have different stop times</p>
            ) : (
              <p className="text-[11px] text-muted-foreground font-mono">{requestId}</p>
            )}
          </div>
        </label>
      </RadioGroup>
    </div>
  );
}
