import { useEffect, useMemo, useState } from "react";
import { Search, RefreshCw, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDialog } from "@/components/ui/dialog-context";
import { DataTable, type Column, type Pagination } from "@/components/common/DataTable";
import { lbApi } from "@/services/lbApi";
import type { InstanceRow, PendingTarget } from "./targetGroup.types";

const INSTANCES_PAGE_SIZE = 10;
const TARGETS_PAGE_SIZE = 10;

export type { InstanceRow, PendingTarget };

type Props = {
  region: string;
  vpcId: string;
  defaultPort: string;
  pendingTargets: PendingTarget[];
  onPendingTargetsChange: (targets: PendingTarget[]) => void;
  onCancel: () => void;
  onPrevious: () => void;
  onNext: () => void;
};

export function RegisterTargetsStep({ region, vpcId, defaultPort, pendingTargets, onPendingTargetsChange, onCancel, onPrevious, onNext }: Props) {
  const { alert } = useDialog();
  const [instanceFilter, setInstanceFilter] = useState("");
  const [instancePage, setInstancePage] = useState(1);
  const [selectedInstances, setSelectedInstances] = useState<Set<string>>(new Set());
  const [registerPorts, setRegisterPorts] = useState(defaultPort || "80");
  const [targetFilter, setTargetFilter] = useState("");
  const [targetPage, setTargetPage] = useState(1);
  const [showOnlyPending, setShowOnlyPending] = useState(false);

  const [instances, setInstances] = useState<InstanceRow[]>([]);
  const [instancesLoading, setInstancesLoading] = useState(false);

  const loadInstances = () => {
    if (!region || !vpcId) return;
    setInstancesLoading(true);
    lbApi.instances(region, vpcId)
      .then((res) => setInstances(res.instances))
      .catch(() => {
        setInstances([]);
        alert({ title: "Failed to load instances", severity: "error" });
      })
      .finally(() => setInstancesLoading(false));
  };

  useEffect(() => {
    loadInstances();
  }, [region, vpcId]);

  // Instance IDs that are already included as pending targets — these should
  // disappear from the "Available instances" table until removed from pending.
  const pendingInstanceIds = useMemo(
    () => new Set(pendingTargets.map((t) => t.instanceId)),
    [pendingTargets]
  );

  const filteredInstances = useMemo(() => {
    const q = instanceFilter.trim().toLowerCase();
    return instances.filter((i) => {
      if (pendingInstanceIds.has(i.instanceId)) return false;
      return !q || Object.values(i).some((v) => String(v).toLowerCase().includes(q));
    });
  }, [instances, instanceFilter, pendingInstanceIds]);

  const instancesTotalPages = Math.max(1, Math.ceil(filteredInstances.length / INSTANCES_PAGE_SIZE));
  const currentInstancePage = Math.min(instancePage, instancesTotalPages);

  const paginatedInstances = useMemo(() => {
    const start = (currentInstancePage - 1) * INSTANCES_PAGE_SIZE;
    return filteredInstances.slice(start, start + INSTANCES_PAGE_SIZE);
  }, [filteredInstances, currentInstancePage]);

  const instancesPagination: Pagination = {
    total: filteredInstances.length,
    page: currentInstancePage,
    limit: INSTANCES_PAGE_SIZE,
    totalPages: instancesTotalPages,
    hasNext: currentInstancePage < instancesTotalPages,
    hasPrev: currentInstancePage > 1,
  };

  const handleInstanceFilterChange = (value: string) => {
    setInstanceFilter(value);
    setInstancePage(1);
  };

  const allInstancesSelected = paginatedInstances.length > 0 && paginatedInstances.every((i) => selectedInstances.has(i.id));
  const toggleAllInstances = () => {
    const next = new Set(selectedInstances);
    if (allInstancesSelected) paginatedInstances.forEach((i) => next.delete(i.id));
    else paginatedInstances.forEach((i) => next.add(i.id));
    setSelectedInstances(next);
  };
  const toggleOneInstance = (id: string) => {
    const next = new Set(selectedInstances);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedInstances(next);
  };

  const includeAsPending = (): boolean => {
    const portNum = Number(registerPorts);
    if (!registerPorts || portNum < 1 || portNum > 65535) {
      alert({ title: "Enter a valid port (1-65535) before including instances.", severity: "error" });
      return false;
    }
    const picked = instances.filter((i) => selectedInstances.has(i.id));
    const additions: PendingTarget[] = picked
      .filter((i) => !pendingTargets.some((p) => p.instanceId === i.instanceId && p.port === registerPorts))
      .map((i) => ({
        ...i,
        id: `${i.id}-${registerPorts}`,
        port: registerPorts,
        launchTime: new Date().toISOString(),
      }));
    onPendingTargetsChange([...pendingTargets, ...additions]);
    setSelectedInstances(new Set());
    return true;
  };

  const handleNext = () => {
    // Do not implicitly include selected instances when advancing.
    // Users must click "Include as pending below" to add instances.
    onNext();
  };

  const visibleTargets = useMemo(() => {
    const q = targetFilter.trim().toLowerCase();
    return pendingTargets.filter((t) => {
      if (showOnlyPending && t.state !== "pending") return false; // adjust condition to whatever "pending" means in your data model
      return !q || Object.values(t).some((v) => String(v).toLowerCase().includes(q));
    });
  }, [pendingTargets, targetFilter, showOnlyPending]);

  const targetsTotalPages = Math.max(1, Math.ceil(visibleTargets.length / TARGETS_PAGE_SIZE));
  const currentTargetPage = Math.min(targetPage, targetsTotalPages);

  const paginatedTargets = useMemo(() => {
    const start = (currentTargetPage - 1) * TARGETS_PAGE_SIZE;
    return visibleTargets.slice(start, start + TARGETS_PAGE_SIZE);
  }, [visibleTargets, currentTargetPage]);

  const targetsPagination: Pagination = {
    total: visibleTargets.length,
    page: currentTargetPage,
    limit: TARGETS_PAGE_SIZE,
    totalPages: targetsTotalPages,
    hasNext: currentTargetPage < targetsTotalPages,
    hasPrev: currentTargetPage > 1,
  };

  const handleTargetFilterChange = (value: string) => {
    setTargetFilter(value);
    setTargetPage(1);
  };

  const removeAllPending = () => {
    onPendingTargetsChange([]);
    setTargetPage(1);
  };

  const instanceColumns: Column<InstanceRow>[] = [
    {
      key: "select",
      header: (
        <input
          type="checkbox"
          checked={allInstancesSelected}
          onChange={toggleAllInstances}
          className="h-4 w-4 rounded border-border"
        />
      ),
      render: (i) => (
        <input
          type="checkbox"
          checked={selectedInstances.has(i.id)}
          onChange={() => toggleOneInstance(i.id)}
          className="h-4 w-4 rounded border-border"
        />
      ),
    },
    { key: "instanceId", header: "Instance ID" },
    { key: "name", header: "Name" },
    { key: "state", header: "State" },
    { key: "securityGroups", header: "Security groups" },
    { key: "zone", header: "Zone" },
    { key: "subnetId", header: "Subnet ID" },
    { key: "privateIpv4", header: "Private IPv4 address" },
  ];

  const targetColumns: Column<PendingTarget>[] = [
    { key: "instanceId", header: "Instance ID" },
    { key: "name", header: "Name" },
    { key: "port", header: "Port" },
    { key: "state", header: "State" },
    { key: "securityGroups", header: "Security groups" },
    { key: "zone", header: "Zone" },
    { key: "subnetId", header: "Subnet ID" },
    { key: "launchTime", header: "Launch time" },
  ];

  return (
    <>
      <div className="mb-2">
        <h1 className="text-2xl font-semibold">
          Register targets
        </h1>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-5xl">
          This is an optional step to create a target group. However, to ensure that your load balancer
          routes traffic to this target group you must register your targets.
        </p>
      </div>

      <section className="glass-panel rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">
              Available instances <span className="text-muted-foreground font-normal">({filteredInstances.length})</span>
            </h2>
          </div>
          <button
            type="button"
            onClick={loadInstances}
            className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-border hover:bg-accent/40"
            title="Refresh"
          >
            <RefreshCw size={14} className={instancesLoading ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={instanceFilter}
              onChange={(e) => handleInstanceFilterChange(e.target.value)}
              placeholder="Filter instances"
              className="w-full bg-input/40 border border-border rounded-md pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>

        </div>

        <DataTable
          columns={instanceColumns}
          data={paginatedInstances}
          emptyMessage={instancesLoading ? "Loading instances..." : "No instances found in this region"}
          rowKey={(i) => i.id}
          pagination={instancesPagination}
          onPageChange={setInstancePage}
        />

        <div className="px-6 py-6 border-t border-border space-y-4">
          <p className="text-center text-sm font-medium text-foreground">{selectedInstances.size} selected</p>

          <div className="max-w-sm mx-auto space-y-2">
            <Label htmlFor="register-ports">Ports for the selected instances</Label>
            <p className="text-xs text-muted-foreground">Ports for routing traffic to the selected instances.</p>
            <Input
              id="register-ports"
              value={registerPorts}
              onChange={(e) => setRegisterPorts(e.target.value.replace(/[^0-9]/g, ""))}
              className="bg-muted/50"
            />
            <p className="text-xs text-muted-foreground">1-65535 (separate multiple ports with commas)</p>
          </div>

          <div className="flex justify-center">
            <Button
              variant="outline"
              disabled={selectedInstances.size === 0}
              onClick={includeAsPending}
            >
              Include as pending below
            </Button>
          </div>
        </div>
      </section>

      <section className="glass-panel rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">
            Targets <span className="text-muted-foreground font-normal">({pendingTargets.length})</span>
          </h2>
          <Button variant="outline" size="sm" disabled={pendingTargets.length === 0} onClick={removeAllPending}>
            Remove all pending
          </Button>
        </div>

        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={targetFilter}
              onChange={(e) => handleTargetFilterChange(e.target.value)}
              placeholder="Filter targets"
              className="w-full bg-input/40 border border-border rounded-md pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>
        </div>

        <DataTable
          columns={targetColumns}
          data={paginatedTargets}
          emptyMessage="No instances added yet. Specify instances above, or leave the group empty if you prefer to add targets later."
          rowKey={(t) => t.id}
          pagination={targetsPagination}
          onPageChange={setTargetPage}
        />
      </section>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{pendingTargets.length} pending</p>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="outline" onClick={onPrevious}>
            Previous
          </Button>
          <Button onClick={handleNext} className="min-w-[100px]">
            Next
          </Button>
        </div>
      </div>
    </>
  );
}