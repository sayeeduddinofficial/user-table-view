import { useState } from "react";
import { Terminal, Info, Copy, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  getAllCommandsForOs,
  getOsSetupSteps,
  getVerifyConnectionStep,
  CONNECT_OS_OPTIONS,
  type ConnectOsId,
} from "./EksConnectData";
import { CommandBlock, StepBadge, useCopyToClipboard } from "./eksShared";

interface EksConnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clusterName: string;
  region: string;
  kubernetesVersion?: string | null;
}

export function EksConnectDialog({
  open,
  onOpenChange,
  clusterName,
  region,
  kubernetesVersion,
}: EksConnectDialogProps) {
  const [osId, setOsId] = useState<ConnectOsId>("amazon-linux-2023");
  const { copied: allCopied, copy: copyAll } = useCopyToClipboard();

  const ctx = { clusterName, region };

  const setupSteps = getOsSetupSteps(osId, ctx);
  const verifyStep = getVerifyConnectionStep();
  const selectedOs = CONNECT_OS_OPTIONS.find((o) => o.id === osId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
  className="
    w-[calc(100vw-32px)]
    max-w-[700px]
    max-h-[85vh]
    overflow-y-auto
    p-0
    gap-0

    bg-background
    text-foreground
    border
    border-border
    shadow-2xl

    dark:bg-[#0b0e14]
    dark:border-[#252b36]

    [&::-webkit-scrollbar]:w-2
    [&::-webkit-scrollbar-track]:bg-transparent
    [&::-webkit-scrollbar-thumb]:rounded-full

    [&::-webkit-scrollbar-thumb]:bg-gray-300
    [&::-webkit-scrollbar-thumb:hover]:bg-gray-400

    dark:[&::-webkit-scrollbar-thumb]:bg-[#2b313c]
    dark:[&::-webkit-scrollbar-thumb:hover]:bg-[#3a4250]
  "
  style={{
    scrollbarWidth: "thin",
    scrollbarColor: "hsl(var(--border)) transparent",
  }}
>
        {/* Header */}
       <DialogHeader
  className="
    border-b
    px-5
    pt-5
    pb-4

    border-gray-200

    dark:border-[#1d232d]
  "
>
          <DialogTitle className="text-lg font-semibold">
            Connect to EKS
          </DialogTitle>
          <div className="text-sm text-muted-foreground">
            {clusterName}
            <span className="mx-1.5">•</span>
            {region}
            {kubernetesVersion && (
              <>
                <span className="mx-1.5">•</span>
                Kubernetes {kubernetesVersion}
              </>
            )}
          </div>
        </DialogHeader>

        <div className="px-5 py-4 space-y-5">
          {/* STEP 1 */}
          <section>
            <StepBadge step={1} title="Important prerequisite" />

            <div className="flex gap-2.5 rounded-lg border border-blue-500/30 bg-blue-500/[0.04] px-3 py-2.5">
              <Info size={16} className="text-blue-400 shrink-0 mt-[2px]" />
              <p className="text-sm leading-relaxed font-normal text-muted-foreground">
                Use any{" "}
                <span className="font-semibold text-foreground">
                  PrudentOps-provisioned VM
                </span>{" "}
                to connect to this EKS cluster.
              </p>
            </div>
          </section>

          {/* STEP 2 */}
          <section>
            <StepBadge step={2} title="Select operating system" />

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CONNECT_OS_OPTIONS.map((os) => {
                const selected = os.id === osId;

                return (
                  <button
                    key={os.id}
                    type="button"
                    onClick={() => setOsId(os.id)}
                    className={`relative min-h-[50px] rounded-lg border px-3 py-2.5 text-left transition-all duration-150 ${
  selected
    ? `
      border-primary
      bg-primary/10
      ring-1
      ring-primary/30
    `
    : `
      border-border
      bg-card
      hover:border-primary/40
      hover:bg-muted
    `
}`}
                  >
                    {selected && (
                      <Check
                        size={14}
                        className="absolute top-2 right-2 text-blue-400"
                      />
                    )}
                    <div className="flex items-center gap-2 pr-4">
                      <span
                        className={`h-2 w-2 rounded-full shrink-0 ${os.dotClassName}`}
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-medium leading-tight text-foreground truncate">
                          {os.label}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 leading-tight">
                          {os.subtitle}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* STEP 3 — same console-style block as the final verify step, no numbering */}
          <section>
            <StepBadge step={3} title={`Set up & connect — ${selectedOs?.label}`} />
            <div className="space-y-2.5">
              {setupSteps.map((step) => (
                <div key={step.id}>
                  {step.note && (
                    <p className="text-xs text-muted-foreground mb-1.5">{step.note}</p>
                  )}
                  <CommandBlock
                    label={step.title}
                    code={step.code}
                    icon={<Terminal size={13} className="text-blue-400" />}
                  />
                </div>
              ))}
            </div>
          </section>

          {/* STEP 4 — verification kept as a single combined block, same as before */}
          <section>
            <StepBadge step={4} title="Verify connection" />
            <CommandBlock
              label={verifyStep.title}
              code={verifyStep.code}
              icon={<Terminal size={13} className="text-blue-400" />}
            />
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border bg-background px-5 py-3.5">
          <span className="inline-flex items-center rounded-full border border-border bg-muted px-2.5 py-1 text-xs text-muted-foreground">
            {selectedOs?.label}
          </span>

          <Button
            size="sm"
            onClick={() => copyAll(getAllCommandsForOs(osId, ctx))}
            variant={allCopied ? "ghost" : "default"}
            className={
              allCopied
                ? "h-9 rounded-md px-3.5 text-sm font-medium text-success hover:bg-transparent hover:text-success"
                : "h-9 rounded-md bg-blue-600 px-3.5 text-sm font-medium text-white hover:bg-blue-500"
            }
          >
            {allCopied ? (
              <>
                <Check size={14} className="mr-1.5 text-success" />
                Copied
              </>
            ) : (
              <>
                <Copy size={14} className="mr-1.5" />
                Copy All Commands
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}