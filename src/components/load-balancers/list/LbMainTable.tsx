/**
 * LbMainTable.tsx
 * The main data table for the Load Balancers list page.
 */

import { Trash2 } from "lucide-react";

export type LbRow = {
  id: string;
  requestId: string;
  name: string;
  state: string;
  statusColor: string;
  type: string;
  scheme: string;
  ipType: string;
  vpcId: string;
  vpc: string;
  subnets: string;
  region: string;
  created: string;
  azs: string;
  securityGroups: string;
  dnsName: string;
  arn: string;
  dateCreated: string;
};

interface LbMainTableProps {
  rows: LbRow[];
  onNavigate: (id: string) => void;
  onRemove: (id: string, name: string, requestId: string) => void;
}

export function LbMainTable({ rows, onNavigate, onRemove }: LbMainTableProps) {
  return (
    <div className="rounded-lg border border-border/50 bg-card/50 backdrop-blur overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[1200px]">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-muted-foreground border-b border-border/50">
              {[
                "Request ID",
                "LB Name",
                "Type",
                "VPC",
                "Region",
                "Created",
                "Status",
              ].map((h) => (
                <th
                  key={h}
                  className="px-5 py-3 text-left font-medium whitespace-nowrap"
                >
                  {h}
                </th>
              ))}

              <th className="px-5 py-3 text-right font-medium">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={11} className="px-5 py-16 text-center text-muted-foreground">
                  No Load Balancers found.
                </td>
              </tr>
            )}

            {rows.map((r) => (
              <tr
                key={r.id}
                className="border-b border-border/40 hover:bg-accent/20"
              >
                <td className="px-5 py-4 font-mono text-muted-foreground text-xs">
                  {r.requestId}
                </td>

                <td className="px-5 py-4 font-medium">
                  <button
                    onClick={() => onNavigate(r.id)}
                    className="text-primary hover:underline text-left"
                  >
                    {r.name}
                  </button>
                </td>

                <td className="px-5 py-4">
                  <span className="inline-flex items-center rounded-full bg-orange-500 px-2.5 py-1 text-xs font-medium text-white">
                    {r.type}
                  </span>
                </td>

                <td className="px-5 py-4 font-mono text-muted-foreground">
                  {r.vpc}
                </td>

                <td className="px-5 py-4">
                  {r.region}
                </td>

                <td className="px-5 py-4">
                  {r.created}
                </td>

                <td className="px-5 py-4">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs capitalize ${r.statusColor}`}
                  >
                    {r.state}
                  </span>
                </td>

                <td className="px-5 py-4 text-right">
                  <button
                    onClick={() => onRemove(r.id, r.name, r.requestId)}
                    disabled={r.state.toLowerCase() === "provisioning"}
                    className={`p-1.5 rounded-md transition-colors ${r.state.toLowerCase() === "provisioning"
                      ? "cursor-not-allowed opacity-50 text-muted-foreground"
                      : "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      }`}
                    title={
                      r.state.toLowerCase() === "provisioning"
                        ? "Cannot delete while provisioning"
                        : "Delete Load Balancer"
                    }
                  >
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
