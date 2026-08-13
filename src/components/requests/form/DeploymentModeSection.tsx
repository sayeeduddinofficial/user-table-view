import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AWS_REGIONS, type DeploymentMode } from "@/types";

type Props = {
  deploymentMode: DeploymentMode;
  setDeploymentMode: (value: DeploymentMode) => void;
  region: string;
  setRegion: (value: string) => void;
  selectedRegions: string[];
  setSelectedRegions: (fn: (prev: string[]) => string[]) => void;
};

export function DeploymentModeSection({
  deploymentMode,
  setDeploymentMode,
  region,
  setRegion,
  selectedRegions,
  setSelectedRegions,
}: Props) {
  return (
    <section className="glass-panel rounded-xl p-6">
      <h2 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
        <Globe className="h-5 w-5 text-primary" />
        Deployment Mode
      </h2>

      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setDeploymentMode("single-region")}
            className={cn(
              "flex-1 p-4 rounded-lg border-2 transition-all",
              deploymentMode === "single-region"
                ? "border-primary bg-primary/10"
                : "border-border hover:border-muted-foreground",
            )}
          >
            <p className="font-medium text-foreground">Single Region</p>
            <p className="text-xs text-muted-foreground">
              Deploy to one AWS region
            </p>
          </button>
          <button
            onClick={() => setDeploymentMode("multi-region")}
            className={cn(
              "flex-1 p-4 rounded-lg border-2 transition-all opacity-50 cursor-not-allowed",
              "border-border hover:border-muted-foreground",
            )}
            disabled={true}
          >
            <p className="font-medium text-foreground">Multi-Region</p>
            <p className="text-xs text-muted-foreground">
              Deploy identical setup across regions
            </p>
          </button>
        </div>

        {deploymentMode === "single-region" ? (
          <div className="space-y-3">
            <Label>Select Region</Label>
            <Select value={region} onValueChange={setRegion}>
              <SelectTrigger className="bg-muted/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AWS_REGIONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="space-y-3">
            <Label>Select Regions (Multi-Region)</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {AWS_REGIONS.map((r) => (
                <div
                  key={r.value}
                  className={cn(
                    "flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all",
                    selectedRegions.includes(r.value)
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-muted-foreground",
                  )}
                  onClick={() => {
                    setSelectedRegions((prev) =>
                      prev.includes(r.value)
                        ? prev.filter((reg) => reg !== r.value)
                        : [...prev, r.value],
                    );
                  }}
                >
                  <Checkbox
                    checked={selectedRegions.includes(r.value)}
                    onCheckedChange={(checked) => {
                      setSelectedRegions((prev) =>
                        checked
                          ? [...prev, r.value]
                          : prev.filter((reg) => reg !== r.value),
                      );
                    }}
                  />
                  <span className="text-sm">{r.label}</span>
                </div>
              ))}
            </div>
            {selectedRegions.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Selected: {selectedRegions.length} region(s) - Same
                configuration will be deployed to each
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
