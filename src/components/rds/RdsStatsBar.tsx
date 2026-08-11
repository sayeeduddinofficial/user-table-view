/**
 * RdsStatsBar.tsx
 * Summary cards + quota widget for the RDS list page.
 */

import { Bell, Camera, Database, Monitor, Server } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/rds/rdsShared';

interface RdsStatsBarProps {
  clusterCount: number;
  instanceCount: number;
  snapshotCount: number;
  recentEventCount: number;
  remainingQuota: number;
  onRequestIncrease: () => void;
}

export function RdsStatsBar({
  clusterCount,
  instanceCount,
  snapshotCount,
  recentEventCount,
  remainingQuota,
  onRequestIncrease,
}: RdsStatsBarProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <StatCard
        icon={<Database className="h-4 w-4 text-primary" />}
        iconBg="bg-primary/10"
        value={clusterCount}
        label="DB Clusters"
      />
      <StatCard
        icon={<Server className="h-4 w-4 text-cyan-400" />}
        iconBg="bg-cyan-500/10"
        value={instanceCount}
        label="DB Instances"
      />
      <StatCard
        icon={<Camera className="h-4 w-4 text-emerald-400" />}
        iconBg="bg-emerald-500/10"
        value={snapshotCount}
        label="Snapshots"
      />
      <StatCard
        icon={<Bell className="h-4 w-4 text-amber-400" />}
        iconBg="bg-amber-500/10"
        value={recentEventCount}
        label="Recent Events"
      />

      <div className="flex items-center justify-between rounded-lg border border-border/50 bg-card/50 backdrop-blur px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Monitor className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground leading-tight">{remainingQuota}</p>
            <p className="text-xs text-muted-foreground">Quota Remaining</p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={onRequestIncrease}>
          Request Increase
        </Button>
      </div>
    </div>
  );
}
