import {
  Server,
  Database,
  Network,
  Globe,
  GitBranch,
  Boxes,
  HardDrive,
} from "lucide-react";

import { Progress } from "@/components/ui/progress";

interface ResourceItem {
  label: string;
  count: number;
  icon: any;
}

interface Props {
  resources: ResourceItem[];
}

export function DashboardResourceOverview({
  resources,
}: Props) {
  const max = Math.max(
    ...resources.map((item) => item.count),
    1
  );

  return (
    <div className="glass-panel rounded-xl p-6 h-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold">
          Resources by Service
        </h2>

        <span className="text-xs text-muted-foreground">
          live
        </span>
      </div>

      <div className="space-y-5">
        {resources.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.label}
              className="flex items-center gap-4"
            >
              <div className="w-44 flex items-center gap-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {item.label}
                </span>
              </div>

              <div className="flex-1">
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-blue-500 transition-all duration-300"
                    style={{
                      width: `${Math.min((item.count / max) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>

              <div className="w-6 text-right font-medium">
                {item.count}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const RESOURCE_ICONS = {
  Server,
  Database,
  Network,
  Globe,
  GitBranch,
  Boxes,
  HardDrive,
};