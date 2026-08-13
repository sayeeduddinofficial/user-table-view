import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useResources } from "@/lib/lbLocalStore";
import {
  Search, ChevronDown, ChevronUp, X, Copy, RefreshCw, Trash2, MoreVertical, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDialog } from "@/components/ui/dialog-context";
import { LbTypeChooserDialog } from "./LbTypeChooserDialog";

type LbRow = {
  id: string;
  name: string;
  state: string;
  type: string;
  scheme: string;
  ipType: string;
  vpcId: string;
  azs: string;
  securityGroups: string;
  dnsName: string;
  arn: string;
  dateCreated: string;
};

type SortDir = "asc" | "desc" | null;

const COLUMNS: { key: keyof LbRow; label: string; link?: boolean; external?: boolean; copyable?: boolean; minWidth?: string }[] = [
  { key: "name", label: "Name", link: true, minWidth: "180px" },
  { key: "state", label: "State" },
  { key: "type", label: "Type" },
  { key: "scheme", label: "Scheme" },
  { key: "ipType", label: "IP address type" },
  { key: "vpcId", label: "VPC ID", link: true, external: true },
  { key: "azs", label: "Availability Zones" },
  { key: "securityGroups", label: "Security groups", link: true },
  { key: "dnsName", label: "DNS name" },
  { key: "arn", label: "ARN", link: true, copyable: true, minWidth: "320px" },
  { key: "dateCreated", label: "Date created" },
];

export function LoadBalancersTable() {
  const nav = useNavigate();
  const { resources, remove } = useResources("lb");
  const { alert, confirm } = useDialog();

  const [chooserOpen, setChooserOpen] = useState(false);
  const [globalFilter, setGlobalFilter] = useState("");
  const [sortBy, setSortBy] = useState<keyof LbRow | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const rows: LbRow[] = useMemo(
    () => resources.map((r, i) => {
      const meta = r.meta ?? {} as Record<string, any>;
      const type = (meta.type ?? "ALB") as string;
      const scheme = (meta.scheme ?? "internet-facing") as string;
      const safeName = r.name?.replace(/[^a-z0-9-]/gi, "-") ?? "unnamed";
      const status = r.status ?? "active";
      const createdAt = r.createdAt ?? new Date().toISOString();
      return {
        id: r.id,
        name: r.name,
        state: status === "active" ? "Active" : String(status).charAt(0).toUpperCase() + String(status).slice(1),
        type,
        scheme,
        ipType: meta.ipType ?? "ipv4",
        vpcId: meta.vpc ?? `vpc-0a${(i + 1).toString(16).padStart(4, "0")}`,
        azs: meta.azs ?? `${r.region}a, ${r.region}b`,
        securityGroups: meta.securityGroups ?? `default (sg-${(i + 1).toString().padStart(4, "0")})`,
        dnsName: meta.dnsName ?? `${safeName}-${1234567 + i}.${r.region}.elb.amazonaws.com`,
        arn: meta.arn ?? `arn:aws:elasticloadbalancing:${r.region}:123456789012:loadbalancer/${type.toLowerCase().startsWith("net") ? "net" : "app"}/${safeName}/${(0x10ab + i).toString(16)}`,
        dateCreated: new Date(createdAt).toUTCString().replace("GMT", "UTC"),
      };
    }),
    [resources],
  );

  const filtered = useMemo(() => {
    const g = globalFilter.trim().toLowerCase();
    return rows.filter((r) => {
      if (g && !Object.values(r).some((v) => String(v).toLowerCase().includes(g))) return false;
      return true;
    });
  }, [rows, globalFilter]);

  const sorted = useMemo(() => {
    if (!sortBy || !sortDir) return filtered;
    const out = [...filtered].sort((a, b) => String(a[sortBy]).localeCompare(String(b[sortBy])));
    return sortDir === "desc" ? out.reverse() : out;
  }, [filtered, sortBy, sortDir]);

  const cycleSort = (k: keyof LbRow) => {
    if (sortBy !== k) { setSortBy(k); setSortDir("asc"); return; }
    if (sortDir === "asc") { setSortDir("desc"); return; }
    if (sortDir === "desc") { setSortBy(null); setSortDir(null); return; }
    setSortDir("asc");
  };

  const clearAllFilters = () => {
    setGlobalFilter("");
    setSortBy(null);
    setSortDir(null);
  };

  const hasFilter = !!globalFilter || !!sortBy;

  const allSelected = sorted.length > 0 && sorted.every((r) => selected.has(r.id));
  const toggleAll = () => {
    const next = new Set(selected);
    if (allSelected) sorted.forEach((r) => next.delete(r.id));
    else sorted.forEach((r) => next.add(r.id));
    setSelected(next);
  };
  const toggleOne = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  return (
    <div>
      <div className="flex items-start justify-between m-5">
        <div>
          <h1 className="text-2xl font-semibold">Load balancers</h1>
          <p className="text-sm text-muted-foreground mt-1">Elastic Load Balancing scales your load balancer capacity automatically in response to changes in incoming traffic.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => alert({ title: "Refreshing load balancers...", severity: "loading" })}
            className="h-9 w-9 inline-flex items-center justify-center rounded-md border border-border hover:bg-accent/40"
            title="Refresh"
          >
            <RefreshCw size={14} />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="h-9 px-3 inline-flex items-center gap-1.5 rounded-md border border-border hover:bg-accent/40 text-sm"
                disabled={selected.size === 0}
              >
                Actions <ChevronDown size={14} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={async () => {
                  const confirmed = await confirm({
                    title: `Delete ${selected.size} selected load balancer(s)?`,
                    description: `This will remove ${selected.size} load balancer(s) from the list.`,
                    icon: "destroy",
                  });
                  if (!confirmed) return;

                  selected.forEach((id) => remove(id));
                  alert({
                    title: `Deleted ${selected.size} load balancer(s)`,
                    description: `${selected.size} load balancer(s) deleted`,
                    severity: "success",
                  });
                  setSelected(new Set());
                }}
              >
                <Trash2 size={14} className="mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => setChooserOpen(true)}>Create load balancer</Button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg">
        <div className="flex items-center gap-3 p-4 border-b border-border">
          <div className="relative flex-1 max-w-2xl">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder="Filter load balancers"
              className="w-full bg-input/40 border border-border rounded-md pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>
        </div>
        {hasFilter && (
          <div className="flex items-center flex-wrap gap-2 px-4 py-2 border-b border-border">
            {globalFilter && (
              <span className="inline-flex items-center gap-1.5 text-xs bg-accent/40 border border-border rounded-md px-2 py-1">
                {globalFilter}
                <button onClick={() => setGlobalFilter("")} className="hover:text-destructive" title="Remove filter">
                  <X size={12} />
                </button>
              </span>
            )}
            {sortBy && sortDir && (
              <span className="inline-flex items-center gap-1.5 text-xs bg-accent/40 border border-border rounded-md px-2 py-1">
                {COLUMNS.find((c) => c.key === sortBy)?.label}: {sortDir === "asc" ? "ascending" : "descending"}
                <button onClick={() => { setSortBy(null); setSortDir(null); }} className="hover:text-destructive" title="Remove sort">
                  <X size={12} />
                </button>
              </span>
            )}
            <button
              onClick={clearAllFilters}
              className="text-sm text-primary hover:underline px-2 py-1"
            >
              Clear filters
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-muted/20">
              <tr>
                <th className="px-4 py-3 border-b border-border w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-border"
                  />
                </th>
                {COLUMNS.map((c) => {
                  const isSorted = sortBy === c.key;
                  return (
                    <th
                      key={c.key}
                      style={c.minWidth ? { minWidth: c.minWidth } : undefined}
                      className="text-left font-semibold text-[13px] text-foreground px-4 py-3 whitespace-nowrap border-b border-border border-r last:border-r-0 border-border/60"
                    >
                      <button
                        onClick={() => cycleSort(c.key)}
                        className="inline-flex items-center gap-2 hover:text-primary"
                      >
                        <span>{c.label}</span>
                        {isSorted && sortDir === "asc" ? <ChevronUp size={14} /> :
                          isSorted && sortDir === "desc" ? <ChevronDown size={14} /> :
                          <ChevronDown size={14} className="opacity-50" />}
                      </button>
                    </th>
                  );
                })}
                <th className="px-3 py-3 border-b border-border w-12" />
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={COLUMNS.length + 2} className="text-center text-muted-foreground py-12 text-sm">
                    No load balancers match the current filters.
                  </td>
                </tr>
              )}
              {sorted.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0 hover:bg-accent/20">
                  <td className="px-4 py-3 align-middle">
                    <input
                      type="checkbox"
                      checked={selected.has(r.id)}
                      onChange={() => toggleOne(r.id)}
                      className="h-4 w-4 rounded border-border"
                    />
                  </td>
                  {COLUMNS.map((c) => {
                    const val = String(r[c.key]);
                    return (
                      <td key={c.key} className="px-4 py-3 align-middle whitespace-nowrap">
                        <div className="flex items-center gap-2 max-w-[360px]">
                          {c.key === "state" ? (
                            <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full border ${val === "Active" ? "bg-success/15 text-success border-success/30" : "bg-warning/15 text-warning border-warning/30"}`}>
                              <span className="h-1.5 w-1.5 rounded-full bg-current" />
                              {val}
                            </span>
                          ) : c.link ? (
                            <button
                              onClick={() => {
                                if (c.key === "name") alert({ title: `Opening ${val}`, severity: "warning" });
                                else alert({ title: `Navigate to ${c.label}: ${val}`, severity: "warning" });
                              }}
                              className="text-primary hover:underline truncate inline-flex items-center gap-1"
                              title={val}
                            >
                              <span className="truncate">{val}</span>
                              {c.external && <ExternalLink size={11} className="shrink-0" />}
                            </button>
                          ) : (
                            <span className="text-sm text-foreground truncate" title={val}>{val}</span>
                          )}
                          {c.copyable && (
                            <button
                              onClick={() => { navigator.clipboard.writeText(val); alert({ title: `${c.label} copied`, severity: "success" }); }}
                              className="p-1 rounded hover:bg-accent/40 text-muted-foreground hover:text-foreground shrink-0"
                              title={`Copy ${c.label}`}
                            >
                              <Copy size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                    );
                  })}
                  <td className="px-3 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1.5 rounded hover:bg-accent/40"><MoreVertical size={16} /></button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(r.arn); alert({ title: "ARN copied", severity: "success" }); }}>
                          <Copy size={14} className="mr-2" /> Copy ARN
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => alert({ title: `Refreshing ${r.name}...`, severity: "loading" })}>
                          <RefreshCw size={14} className="mr-2" /> Refresh
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={async () => {
                            const confirmed = await confirm({
                              title: `Delete load balancer ${r.name}?`,
                              description: "This will remove the selected load balancer from the list.",
                              icon: "destroy",
                            });
                            if (!confirmed) return;
                            remove(r.id);
                            alert({ title: `Deleted ${r.name}`, severity: "success" });
                          }}
                        >
                          <Trash2 size={14} className="mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <LbTypeChooserDialog
        open={chooserOpen}
        onOpenChange={setChooserOpen}
        onSelect={(type) => {
          setChooserOpen(false);
          nav(`/aws/load-balancers/create/${type}`);
        }}
      />

    </div>
  );
}