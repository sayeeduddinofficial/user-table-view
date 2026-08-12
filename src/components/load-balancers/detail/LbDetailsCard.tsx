import { Button } from "@/components/ui/button";
import type { LbItem } from "@/services/lbApi";
import { getLbStatusTextClass } from "@/components/load-balancers/lbShared";

export function LbDetailsCard({ lb, onViewRequest }: { lb: LbItem; onViewRequest: () => void }) {
  const lbTypeLabel = lb.type === "application" ? "Application" : lb.type === "network" ? "Network" : lb.type;
  const statusClassName = getLbStatusTextClass(lb.status);

  return (
    <div className="border rounded-lg bg-card">
      <div className="m-2 border-b">
        <h2 className="font-semibold text-lg">Details</h2>
      </div>
      <div className="grid md:grid-cols-5 gap-8 p-8 text-sm">
        <div>
          <p className="text-muted-foreground">Load balancer type</p>
          <p>{lbTypeLabel}</p>
          <p className="mt-5 text-muted-foreground">Scheme</p>
          <p>{lb.scheme}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Status</p>
          <p className={`${statusClassName} font-medium`}>
            {['completed', 'active'].includes(lb.status?.toLowerCase())
              ? 'Active'
              : lb.status.charAt(0).toUpperCase() + lb.status.slice(1)}
          </p>
          <p className="mt-5 text-muted-foreground">IP address type</p>
          <p>{lb.ip_address_type}</p>
        </div>
        <div>
          <p className="text-muted-foreground">VPC</p>
          <p>{lb.vpc_id}</p>
          <p className="mt-5 text-muted-foreground">Availability Zones</p>
          <div className="space-y-1">
            {lb.subnets.map((s) => (
              <div key={s.id}>{s.availability_zone}</div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-muted-foreground">Region</p>
          <p>{lb.region}</p>
          <p className="mt-5 text-muted-foreground">Created</p>
          <p>{new Date(lb.created_at).toUTCString().replace("GMT", "UTC")}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Request</p>
          <p className="font-mono text-xs break-all">{lb.request_id || "-"}</p>
          {lb.request_id ? (
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={onViewRequest}
            >
              View request
            </Button>
          ) : null}
        </div>
      </div>
      <div className="grid md:grid-cols-2 border-t">
        <div className="p-5 border-r">
          <p className="text-muted-foreground text-sm">Security Groups</p>
          <p className="text-sm mt-1">{(lb.security_group_ids ?? []).join(", ") || "-"}</p>
        </div>
        <div className="p-5">
          <p className="text-muted-foreground text-sm">Justification</p>
          <p className="text-sm mt-1">{lb.justification || "-"}</p>
        </div>
      </div>
    </div>
  );
}
