/**
 * LbSecurityGroupsSection.tsx
 * "Security Groups" section of the Load Balancer create flow.
 */

import { X, XCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SgItem } from "@/services/lbApi";
import { DEFAULT_SG_NAME } from "../lbCreate.constants";
import { Field, Section } from "../lbCreateShared";

interface LbSecurityGroupsSectionProps {
  isAlb: boolean;
  sgOptions: SgItem[];
  selectedSgId: string;
  setSelectedSgId: (value: string) => void;
  sgs: string[];
  setSgs: React.Dispatch<React.SetStateAction<string[]>>;
  vpc: string;
  loadingVpc: boolean;
  submitted: boolean;
  sgError: boolean;
}

export function LbSecurityGroupsSection({
  isAlb,
  sgOptions,
  selectedSgId,
  setSelectedSgId,
  sgs,
  setSgs,
  vpc,
  loadingVpc,
  submitted,
  sgError,
}: LbSecurityGroupsSectionProps) {
  return (
    <Section id="security-groups" title="Security Groups">
      <Field label={isAlb ? "Security groups" : "Security groups - recommended"}>
        <div className="flex flex-col gap-2">
          {(() => {
            const defaultSg = sgOptions.find((o) => o.name.toLowerCase() === DEFAULT_SG_NAME.toLowerCase());
            const isDefaultSgLocked = !!defaultSg && sgs.includes(defaultSg.id);
            return (
              <Select
                value={selectedSgId}
                onValueChange={(value) => {
                  if (value && !sgs.includes(value) && sgs.length < 5) {
                    setSgs((p) => [...p, value]);
                  }
                  setSelectedSgId("");
                }}
                disabled={!vpc || loadingVpc || isDefaultSgLocked}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={!vpc ? "Select a VPC" : loadingVpc ? "Loading..." : "Select a security group"} />
                </SelectTrigger>
                <SelectContent>
                  {sgOptions.map((o) => (
                    <SelectItem key={o.id} value={o.id} disabled={sgs.includes(o.id) && selectedSgId !== o.id}>
                      {o.name} ({o.id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            );
          })()}
          {submitted && sgError && (
            <p className="mt-1 flex items-center gap-1 text-xs text-red-500">
              <XCircle size={12} /> At least one security group is required.
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {sgs.map((g) => {
              const sg = sgOptions.find((o) => o.id === g);
              const isDefault = sg?.name.toLowerCase() === DEFAULT_SG_NAME.toLowerCase();
              return (
                <span key={g} className="inline-flex items-center gap-2 px-2.5 py-1 text-xs border border-border rounded-md bg-primary/10 text-primary">
                  {sg ? `${sg.name} (${sg.id})` : g}
                  {!isDefault && (
                    <button
                      type="button"
                      onClick={() => {
                        const nextSgs = sgs.filter((x) => x !== g);
                        setSgs(nextSgs);
                        setSelectedSgId(nextSgs[nextSgs.length - 1] ?? "");
                      }}
                      className="hover:text-foreground"
                      aria-label={`Remove ${g}`}
                    >
                      <X size={12} />
                    </button>
                  )}
                </span>
              );
            })}
          </div>
        </div>
      </Field>
    </Section>
  );
}
