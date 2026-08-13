import { RefObject } from "react";
import { FileText } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  justificationRef: RefObject<HTMLDivElement>;
  justification: string;
  setJustification: (value: string) => void;
  justificationTouched: boolean;
  setJustificationTouched: (value: boolean) => void;
  justificationError: boolean;
  setJustificationError: (value: boolean) => void;
  submitted: boolean;
};

export function JustificationSection({
  justificationRef,
  justification,
  setJustification,
  justificationTouched,
  setJustificationTouched,
  justificationError,
  setJustificationError,
  submitted,
}: Props) {
  return (
    <section ref={justificationRef} className="glass-panel rounded-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Business Justification</h2>
      </div>

      <div className="space-y-3">
        <Textarea
          id="justification"
          className="resize-none overflow-y-auto"
          placeholder="Provide a brief justification for this VM request."
          value={justification}
          onChange={(e) => {
            const value = e.target.value;
            setJustification(value);
            if (justificationTouched || submitted) {
              setJustificationError(value.trim().length < 20 || !/[a-zA-Z]/.test(value.trim()));
            }
          }}
          onBlur={() => {
            setJustificationTouched(true);
            setJustificationError(justification.trim().length < 20 || !/[a-zA-Z]/.test(justification.trim()));
          }}
          rows={3}
          maxLength={250}
        />

        <div className="flex justify-between items-center mt-1">
          {(justificationTouched || submitted) && justificationError ? (
            <div className="text-xs text-destructive">
              {justification.trim().length === 0
                ? "Business justification is required."
                : !(/[a-zA-Z]/.test(justification.trim()))
                ? "Justification must contain meaningful text."
                : "Business justification must contain at least 20 characters."}
            </div>
          ) : <span />}
          <p className="text-xs text-muted-foreground">{justification.length}/250</p>
        </div>
      </div>
    </section>
  );
}
