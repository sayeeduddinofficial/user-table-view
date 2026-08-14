import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Server, Inbox, Cpu, Play, Square, Trash2 } from "lucide-react";

const LIFECYCLE_COLORS = {
  requested: "#60a5fa",    // text-blue-400
  created: "#34d399",      // text-emerald-400
  started: "#f472b6",      // text-pink-400
  stopped: "#fb923c",      // text-orange-400
  destroyed: "#818cf8",    // text-indigo-400
};

const LIFECYCLE_ICONS = {
  requested: Inbox,
  created: Cpu,
  started: Play,
  stopped: Square,
  destroyed: Trash2,
};

export const VMLifecycleChart = ({ data }: { data: Record<string, number> }) => {
  const chartData = [
    { name: "Requested", value: data.requested, color: LIFECYCLE_COLORS.requested, icon: LIFECYCLE_ICONS.requested },
    { name: "Created", value: data.created, color: LIFECYCLE_COLORS.created, icon: LIFECYCLE_ICONS.created },
    { name: "Started", value: data.started, color: LIFECYCLE_COLORS.started, icon: LIFECYCLE_ICONS.started },
    { name: "Stopped", value: data.stopped, color: LIFECYCLE_COLORS.stopped, icon: LIFECYCLE_ICONS.stopped },
    { name: "Destroyed", value: data.destroyed, color: LIFECYCLE_COLORS.destroyed, icon: LIFECYCLE_ICONS.destroyed },
  ];

  const maxValue = Math.max(...chartData.map(item => item.value));

  return (
    <Card className="glass-panel rounded-xl">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-muted-foreground" />
          <CardTitle className="text-base font-semibold">VM lifecycle</CardTitle>
        </div>
        <p className="text-xs text-muted-foreground">Event counts by action type</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {chartData.map((item, index) => {
          const Icon = item.icon;
          return (
            <div key={index} className="flex items-center gap-3">
              <div className="flex items-center gap-2 w-24 flex-shrink-0">
                <Icon className="w-3.5 h-3.5" style={{ color: item.color }} />
                <span className="text-sm font-medium">{item.name}</span>
              </div>
              <div className="flex-1 h-7 bg-muted/30 rounded-lg overflow-hidden">
                <div
                  className="h-full rounded-lg transition-all"
                  style={{
                    width: `${maxValue > 0 ? (item.value / maxValue) * 100 : 0}%`,
                    backgroundColor: item.color,
                  }}
                />
              </div>
              <span className="text-sm font-semibold w-12 text-right flex-shrink-0">{item.value}</span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
