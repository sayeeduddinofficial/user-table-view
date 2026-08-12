/**
 * LbToolbar.tsx
 * Search input + refresh/create actions card for the Load Balancers list page.
 */

import { Search, RefreshCw, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface LbToolbarProps {
  globalFilter: string;
  onGlobalFilterChange: (value: string) => void;
  onRefresh: () => void;
  onCreate: () => void;
  createDisabled: boolean;
  createDisabledReason?: string;
  loading: boolean;
}

export function LbToolbar({
  globalFilter,
  onGlobalFilterChange,
  onRefresh,
  onCreate,
  createDisabled,
  createDisabledReason,
  loading,
}: LbToolbarProps) {
  return (
    <Card className="sticky top-16 z-30 glass-panel backdrop-blur border-border/50 p-0">
      <CardContent className="py-0 px-0">
        <div className="flex items-center gap-3 p-4 px-6">
          <div className="relative flex-1">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />

            <Input
              value={globalFilter}
              onChange={(e) => onGlobalFilterChange(e.target.value)}
              placeholder="Search by name, region, or request ID..."
              className="pl-9 bg-background/50"
            />
          </div>

          <Button
            variant="outline"
            size="icon"
            className="rounded-full shrink-0"
            onClick={onRefresh}
          >
            <RefreshCw size={14} />
          </Button>

          <Button
            className="bg-primary hover:bg-primary/90 text-white gap-1.5 shrink-0"
            title={!loading ? createDisabledReason ?? undefined : undefined}
            tooltip={
              !loading && createDisabledReason
                ? createDisabledReason
                : undefined
            }
            onClick={() => {
              if (!loading && !createDisabled) {
                onCreate();
              }
            }}
            disabled={loading || createDisabled}
          >
            <Plus size={14} />
            Create Load Balancer
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
