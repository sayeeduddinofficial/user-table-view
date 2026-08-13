/**
 * LbBusinessJustificationSection.tsx
 * Business justification section for the Load Balancer create flow.
 */

import { Textarea } from "@/components/ui/textarea";

interface LbBusinessJustificationSectionProps {
  justifications: string;
  setJustifications: (value: string) => void;
  justificationError: boolean;
  submitted: boolean;
}

export function LbBusinessJustificationSection({
  justifications,
  setJustifications,
  justificationError,
  submitted,
}: LbBusinessJustificationSectionProps) {
  return (
    <section className="glass-panel rounded-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg font-semibold">Business Justification</span>
      </div>

      <div className="space-y-3">
        <Textarea
          id="justification"
          className={`w-full resize-none overflow-y-auto rounded-md border bg-background px-3 py-1 text-sm ${
            justificationError ? "border-red-500 ring-1 ring-red-200" : "border-input"
          }`}
          placeholder="Provide a brief justification for this VM request."
          value={justifications}
          onChange={(e) => {
            const value = e.target.value;
            setJustifications(value);
            if (submitted) {
              // parent handles validation state via submit flow
            }
          }}
          rows={3}
          maxLength={250}
        />
        <div className="flex justify-between items-center">
          {submitted && justificationError ? (
            <div className="text-xs text-red-600">
              Business justification must contain at least 20 characters.
            </div>
          ) : (
            <span />
          )}
          <p className="text-xs text-muted-foreground">{justifications.length}/250</p>
        </div>
      </div>
    </section>
  );
}
