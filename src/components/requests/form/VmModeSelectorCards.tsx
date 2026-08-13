import { Boxes, Monitor, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VmMode } from "@/components/requests/vmRequest.types";

type Props = {
  vmMode: VmMode;
  resetVmConfiguration: (nextMode: VmMode) => void;
};

export function VmModeSelectorCards({ vmMode, resetVmConfiguration }: Props) {
  return (
    <>
      <div className="mb-4">
        <p className="text-sm font-medium text-foreground mb-3">
          What are these VMs for?
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => resetVmConfiguration("splunk")}
            className={cn(
              "text-left rounded-lg border p-4 transition-colors",
              vmMode === "splunk"
                ? "border-primary ring-1 ring-primary bg-primary/5"
                : "border-border bg-muted/20 hover:bg-muted/40",
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              <Boxes className={cn("h-4 w-4", vmMode === "splunk" ? "text-primary" : "text-muted-foreground")} />
              <span className="text-sm font-semibold text-foreground">Splunk Deployment</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Pick from Splunk roles (SH, IDX, HF, UF, etc.). Splunk will be auto-installed.
            </p>
          </button>
          <button
            type="button"
            onClick={() => resetVmConfiguration("general")}
            className={cn(
              "text-left rounded-lg border p-4 transition-colors",
              vmMode === "general"
                ? "border-primary ring-1 ring-primary bg-primary/5"
                : "border-border bg-muted/20 hover:bg-muted/40",
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              <Monitor className={cn("h-4 w-4", vmMode === "general" ? "text-primary" : "text-muted-foreground")} />
              <span className="text-sm font-semibold text-foreground">General Purpose</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Bare VMs — no Splunk. Provide a name tag, shape and count per VM group.
            </p>
          </button>
        </div>
      </div>

      {vmMode === "general" && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />
          <span>
            Add up to <span className="font-semibold text-foreground">10</span> VM groups. Each group provisions <span className="font-semibold text-foreground">count</span> identical VMs of the chosen shape, tagged with the given name.
          </span>
        </div>
      )}
    </>
  );
}
