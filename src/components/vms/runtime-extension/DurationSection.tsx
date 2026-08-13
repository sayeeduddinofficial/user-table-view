import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ShieldCheck, ShieldAlert } from 'lucide-react';
import type { DurationOption } from '@/components/vms/runtimeExtension.types';

interface Props {
  durationOption: DurationOption;
  onDurationOptionChange: (v: DurationOption) => void;
  customHours: string;
  onCustomHoursChange: (v: string) => void;
  durationHours: number | null;
  requiresManagerApproval: boolean;
  freeHoursRemaining: number;
}

export function DurationSection({
  durationOption,
  onDurationOptionChange,
  customHours,
  onCustomHoursChange,
  durationHours,
  requiresManagerApproval,
  freeHoursRemaining,
}: Props) {
  return (
    <div className="space-y-2">
      <Label>Requested Extension Duration</Label>
      <Select
        value={durationOption}
        onValueChange={(v) => onDurationOptionChange(v as DurationOption)}
      >
        <SelectTrigger className="bg-muted/50">
          <SelectValue placeholder="Select duration" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1h">1 Hour</SelectItem>
          <SelectItem value="2h">2 Hours</SelectItem>
          <SelectItem value="4h">4 Hours</SelectItem>
          <SelectItem value="8h">8 Hours</SelectItem>
          <SelectItem value="custom">Custom</SelectItem>
        </SelectContent>
      </Select>

      {durationOption === 'custom' && (
        <Input
          type="number"
          min="1"
          max="192"
          step="1"
          placeholder="Enter hours (e.g. 10)"
          value={customHours}
          onKeyDown={(e) => {
            // Block invalid keys: ., e, E, +, -
            if (['.', 'e', 'E', '+', '-'].includes(e.key)) {
              e.preventDefault();
            }
          }}
          onChange={(e) => {
            const value = e.target.value;
            // Allow only digits
            if (!/^\d*$/.test(value)) return;
            // Limit to 3 digits
            if (value.length > 3) return;
            onCustomHoursChange(value);
          }}
          className="bg-muted/50"
        />
      )}

      {/* ── Approval indicator banner ─────────────────────────────── */}
      {durationHours !== null && (
        <div
          className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs ${
            requiresManagerApproval
              ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
              : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
          }`}
        >
          {requiresManagerApproval ? (
            <>
              <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
              <span>
                This duration exceeds your {freeHoursRemaining}h free quota. Manager approval
                is required — an email will be sent to the selected manager.
              </span>
            </>
          ) : (
            <>
              <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
              <span>
                Within your free quota — applied immediately, no manager approval needed.
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
