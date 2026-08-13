import { RefObject } from "react";
import { Server, Layers, MapPin, Key } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AmiOption, CategoryType } from "@/types";
import { getAmiOptions } from "@/components/requests/vmRequest.constants";

type SshKey = { id: string; name: string };

type Props = {
  category: CategoryType | null;
  region: string;
  ami: string;
  setAmi: (value: string) => void;
  selectedAmi: AmiOption | undefined;
  diskSize: number;
  setDiskSize: (value: number) => void;
  sshKeys: SshKey[];
  sshKeysLoading: boolean;
  sshKeysError: unknown;
  selectedSSHKeyName: string;
  setSelectedSSHKeyName: (value: string) => void;
  sshKeyError: string;
  setSshKeyError: (value: string) => void;
  submitted: boolean;
  sshKeySectionRef: RefObject<HTMLDivElement>;
};

export function InfrastructureSettingsSection({
  category,
  region,
  ami,
  setAmi,
  selectedAmi,
  diskSize,
  setDiskSize,
  sshKeys,
  sshKeysLoading,
  sshKeysError,
  selectedSSHKeyName,
  setSelectedSSHKeyName,
  sshKeyError,
  setSshKeyError,
  submitted,
  sshKeySectionRef,
}: Props) {
  return (
    <>
      {category === 1 && (
        <section className="glass-panel rounded-xl p-6">
          <h2 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
            <Server className="h-5 w-5 text-primary" />
            Application & OS Images (AMI)
          </h2>

          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Layers className="h-4 w-4" />
                AMI (Amazon Machine Image)
              </Label>
              <Select value={ami} onValueChange={setAmi}>
                <SelectTrigger className="bg-muted/50 h-auto py-2">
                  <SelectValue placeholder="Select AMI...">
                    {(() => {
                      const sel = getAmiOptions(region).find(
                        (o) => o.value === ami,
                      );
                      if (!sel) return "Select AMI...";
                      return (
                        <div className="flex flex-col items-start text-left">
                          <span className="font-medium">{sel.label}</span>
                          <span className="text-xs text-muted-foreground">
                            {sel.amiId} ({sel.arch})
                          </span>
                        </div>
                      );
                    })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-96">
                  {getAmiOptions(region).map((opt) => (
                    <SelectItem
                      key={opt.value}
                      value={opt.value}
                      className="py-2"
                    >
                      <div className="flex flex-col gap-0.5 hover:text-white">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-medium">{opt.label}</span>
                          {opt.freeTier && (
                            <span className="text-[10px] text-emerald-500 font-medium">
                              Free tier eligible
                            </span>
                          )}
                        </div>
                        <span className="text-xs">
                          {opt.amiId} ({opt.arch})
                        </span>
                        <span className="text-xs">
                          Virtualization: {opt.virtualization} · Root device:{" "}
                          {opt.rootDevice}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Options are based on the selected region
              </p>
            </div>
          </div>
        </section>
      )}

      <section className="glass-panel rounded-xl p-6">
        <h2 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          Infrastructure Settings
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <Label>Disk Size: {diskSize} GB</Label>
            <Slider
              value={[diskSize]}
              onValueChange={([v]) => setDiskSize(v)}
              min={selectedAmi?.minimumDiskSize ?? 10}
              max={50}
              step={10}
              className="py-4"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{selectedAmi?.minimumDiskSize ?? 10} GB</span>
              <span>50 GB</span>
            </div>
          </div>

          <div ref={sshKeySectionRef} className="space-y-3">
            <Label className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              SSH Key
            </Label>
            {sshKeysLoading ? (
              <div className="h-10 bg-muted/50 rounded-md animate-pulse" />
            ) : sshKeysError ? (
              <p className="text-sm text-destructive">
                Failed to load SSH keys. Please try again later.
              </p>
            ) : sshKeys.length === 0 ? (
              <div className="p-4 rounded-lg border border-warning/50 bg-warning/10">
                <p className="text-sm text-warning">No SSH keys available</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Please generate an SSH key in Settings before creating a VM
                  request
                </p>
              </div>
            ) : (
              <>
                <Select
                  value={selectedSSHKeyName}
                  onValueChange={(v) => { setSelectedSSHKeyName(v); if (submitted) setSshKeyError(""); }}
                >
                  <SelectTrigger className="bg-muted/50">
                    <SelectValue
                      placeholder={
                        <span className="text-muted-foreground">
                          Select SSH key...
                        </span>
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {sshKeys.map((key) => (
                      <SelectItem key={key.id} value={key.name}>
                        {key.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {submitted && sshKeyError && (
                  <p className="text-xs text-destructive">{sshKeyError}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Terraform will use this key for VM access
                </p>
              </>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
