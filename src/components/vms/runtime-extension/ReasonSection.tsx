import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface Props {
  reason: string;
  onReasonChange: (v: string) => void;
  reasonError: string;
  onReasonErrorChange: (v: string) => void;
  touchedReason: boolean;
  onTouchedReasonChange: (v: boolean) => void;
}

export function ReasonSection({
  reason,
  onReasonChange,
  reasonError,
  onReasonErrorChange,
  touchedReason,
  onTouchedReasonChange,
}: Props) {
  return (
    <div className="space-y-2">
      <Label>
        Reason for Extension
      </Label>
      <Textarea
        placeholder="Explain why you need more time..."
        value={reason}
        minLength={10}
        maxLength={250}
        onChange={(e) => {
          const value = e.target.value;
          onReasonChange(value);
          if (touchedReason) {
            onReasonErrorChange(value.trim().length < 10 ? 'Minimum 10 characters required' : '');
          }
        }}
        onBlur={() => {
          onTouchedReasonChange(true);
          if (reason.trim().length < 10) onReasonErrorChange('Minimum 10 characters required');
        }}
        className="bg-muted/50 min-h-[80px]"
      />
      <div className="flex justify-between items-center text-xs">
        <span className="text-destructive">{reasonError}</span>
        <span className="text-muted-foreground">{reason.length}/250</span>
      </div>
    </div>
  );
}
