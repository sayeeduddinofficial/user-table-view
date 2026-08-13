import { Server } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { INSTANCE_TYPES } from "@/types";

type Props = {
  remainingQuota: number;
  allInOneInstanceType: string;
  setAllInOneInstanceType: (value: string) => void;
  allowedInstanceTypes: string[];
};

export function Category2AllInOneSection({
  remainingQuota,
  allInOneInstanceType,
  setAllInOneInstanceType,
  allowedInstanceTypes,
}: Props) {
  return (
    <section className="glass-panel rounded-xl p-6 border border-warning/40 bg-warning/5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Server className="h-5 w-5 text-warning" />
          All in One Configuration
        </h2>
        <div className="text-sm text-muted-foreground">
          Total VMs:
          <Badge variant="outline" className="ml-2 font-normal text-lg">
            {remainingQuota > 0 ? `1 / ${remainingQuota}` : "0 / 0"}
          </Badge>
        </div>
      </div>

      <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
        <div className="flex items-center gap-4">
          <span className="text-2xl">🖥️</span>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium text-foreground">All in One</p>
            </div>

            <p className="text-xs text-muted-foreground">
              Single VM with Splunk auto-installed
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Select
            value={allInOneInstanceType}
            onValueChange={setAllInOneInstanceType}
          >
            <SelectTrigger className="w-[140px] bg-muted/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INSTANCE_TYPES.filter((t) =>
                allowedInstanceTypes.includes(t.value),
              ).map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  <span className="font-mono">{t.label}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {t.vcpu}vCPU / {t.memory}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Badge variant="secondary">x1</Badge>
        </div>
      </div>
    </section>
  );
}
