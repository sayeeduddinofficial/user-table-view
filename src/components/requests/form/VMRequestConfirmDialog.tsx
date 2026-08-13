import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ENVIRONMENT_TAGS,
  SPLUNK_VERSIONS,
  AWS_REGIONS,
  type CategoryType,
  type EnvironmentTag,
  type DeploymentMode,
  type VMRoleConfig,
} from "@/types";
import { getAmiOptions } from "@/components/requests/vmRequest.constants";
import type { VmMode } from "@/components/requests/vmRequest.types";

type Props = {
  isDialogOpen: boolean;
  setIsDialogOpen: (open: boolean) => void;
  visibleCategories: { value: CategoryType; label: string; description: string }[];
  category: CategoryType | null;
  environmentTag: EnvironmentTag;
  projectIdentifier: string;
  splunkVersion: string;
  region: string;
  ami: string;
  deploymentMode: DeploymentMode;
  selectedRegions: string[];
  diskSize: number;
  selectedSSHKeyName: string;
  vmMode: VmMode;
  effectiveVMs: number;
  roleConfigs: VMRoleConfig[];
  justification: string;
  isSubmitting: boolean;
  handleSubmit: () => void;
};

export function VMRequestConfirmDialog({
  isDialogOpen,
  setIsDialogOpen,
  visibleCategories,
  category,
  environmentTag,
  projectIdentifier,
  splunkVersion,
  region,
  ami,
  deploymentMode,
  selectedRegions,
  diskSize,
  selectedSSHKeyName,
  vmMode,
  effectiveVMs,
  roleConfigs,
  justification,
  isSubmitting,
  handleSubmit,
}: Props) {
  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogContent
        className="sm:max-w-lg max-h-[85vh] flex flex-col"
        onInteractOutside={(event) => event.preventDefault()}
      >
        <div className="p-4 pb-4 border-b">
          <DialogHeader className="text-center items-center">
            <DialogTitle className="text-xl font-semibold text-foreground">
              Confirm VM Request
            </DialogTitle>
            <DialogDescription className="text-muted-foreground mt-2">
              Please review the details below before submitting your request.
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="space-y-4 mt-4 text-sm overflow-y-auto model-scroll-hide flex-1 px-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-xs text-muted-foreground mb-1">Category</p>
              <p className="font-medium text-foreground">{visibleCategories.find(item => item.value === category)?.label}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-xs text-muted-foreground mb-1">Environment</p>
              <p className="font-medium text-foreground">{ENVIRONMENT_TAGS.find(t => t.value === environmentTag)?.label}</p>
            </div>
          </div>

          <div className="grid gap-3 grid-cols-2">
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-xs text-muted-foreground mb-1">Project</p>
              <p className="font-medium text-foreground">{projectIdentifier}</p>
            </div>

            {category !== 1 && (
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-xs text-muted-foreground mb-1">Splunk Version</p>
                <p className="font-medium text-foreground">
                  {SPLUNK_VERSIONS.find(v => v.value === splunkVersion)?.label}
                </p>
              </div>
            )}

            {category === 1 && (() => {
              const sel = getAmiOptions(region).find(o => o.value === ami);
              return (
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <p className="text-xs text-muted-foreground mb-1">AMI</p>
                  <p className="font-medium text-foreground">{sel?.label ?? ami}</p>
                  {sel && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {sel.amiId} · {sel.arch} · Virt: {sel.virtualization} · Root: {sel.rootDevice}
                    </p>
                  )}
                </div>
              );
            })()}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-xs text-muted-foreground mb-1">Deployment</p>
              <p className="font-medium text-foreground capitalize">{deploymentMode.replace('-', ' ')}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-xs text-muted-foreground mb-1">Region(s)</p>
              <p className="font-medium text-foreground">
                {deploymentMode === 'multi-region'
                  ? selectedRegions.map(r => AWS_REGIONS.find(ar => ar.value === r)?.label).join(', ')
                  : AWS_REGIONS.find(r => r.value === region)?.label}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-xs text-muted-foreground mb-1">Disk Size</p>
              <p className="font-medium text-foreground">{diskSize} GB</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-xs text-muted-foreground mb-1">SSH Key</p>
              <p className="font-medium text-foreground">{selectedSSHKeyName}</p>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">
                {category === 1 && vmMode === "general" ? "Custom VM Groups" : "VM Roles"} ({effectiveVMs} total)
              </p>
              {category === 1 && (
                <Badge variant="secondary" className="text-xs">
                  {vmMode === "general" ? "General Purpose" : "Splunk Deployment"}
                </Badge>
              )}
            </div>

            <div className="space-y-1">
              {roleConfigs.map((role) => (
                <div
                  key={role.roleId}
                  className="flex items-center justify-between"
                >
                  <span className="text-foreground">{role.roleName}</span>

                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="font-mono text-xs">
                      {role.instanceType}
                    </Badge>

                    <Badge variant="outline" className="text-xs">
                      ×{role.count}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <p className="text-xs text-muted-foreground mb-1">
              Justification
            </p>
            <p className="font-medium text-foreground whitespace-pre-wrap">
              {justification}
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={isSubmitting}
              >
                Go Back & Edit
              </Button>

              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Submitting..." : "Confirm & Submit"}
              </Button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
