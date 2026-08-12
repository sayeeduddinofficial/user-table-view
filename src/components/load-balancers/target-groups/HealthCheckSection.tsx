import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Props = {
  healthCheckProtocol: string;
  healthCheckProtocolOptions: string[];
  onHealthCheckProtocolChange: (value: string) => void;
  showHealthCheckPath: boolean;
  healthCheckPath: string;
  onHealthCheckPathChange: (value: string) => void;
  onHealthCheckPathTouched: () => void;
  healthCheckPathError: string | null;
};

export function HealthCheckSection({
  healthCheckProtocol,
  healthCheckProtocolOptions,
  onHealthCheckProtocolChange,
  showHealthCheckPath,
  healthCheckPath,
  onHealthCheckPathChange,
  onHealthCheckPathTouched,
  healthCheckPathError,
}: Props) {
  return (
    <section className="glass-panel rounded-xl p-6">
      <h2 className="text-lg font-semibold text-foreground mb-1 flex items-center gap-2">
        Health checks
      </h2>
      <p className="text-xs text-muted-foreground mb-6">
        The associated load balancer periodically sends requests, per the settings below, to the registered
        targets to test their status.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <Label>Health check protocol</Label>
          <Select value={healthCheckProtocol} onValueChange={onHealthCheckProtocolChange}>
            <SelectTrigger className="bg-muted/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {healthCheckProtocolOptions.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {showHealthCheckPath && (
          <div className="space-y-3">
            <Label htmlFor="hc-path">Health check path</Label>
            <Input
              id="hc-path"
              value={healthCheckPath}
              onChange={(e) => { onHealthCheckPathChange(e.target.value); onHealthCheckPathTouched(); }}
              onBlur={onHealthCheckPathTouched}
              className={cn("bg-muted/50", healthCheckPathError && "border-destructive ring-1 ring-destructive/30")}
              maxLength={1024}
            />
            {healthCheckPathError ? (
              <p className="text-xs text-destructive">{healthCheckPathError}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Use the default path of "/" to perform health checks on the root, or specify a custom path.
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
