import { CheckCircle2, AlertCircle, Clock3 } from "lucide-react";

interface Activity {
  id: string;
  title: string;
  action: string;
  user: string;
  timestamp: string;
  status?: string;
  service?: string;
  resourceName?: string;
}

interface Props {
  activities: Activity[];
}

function formatTimestamp(value?: string) {
  if (!value) return "Just now";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
}

export function DashboardRecentActivity({
  activities,
}: Props) {
  return (
    <div className="glass-panel rounded-xl p-6 h-full">
      <h2 className="text-lg font-semibold mb-6">
        Recent Activity
      </h2>

      <div className="space-y-5">
        {activities.map((activity) => {
          const statusTone = activity.status?.toLowerCase().includes("fail") || activity.status?.toLowerCase().includes("error")
            ? "bg-red-500/10 text-red-600"
            : activity.status?.toLowerCase().includes("provision") || activity.status?.toLowerCase().includes("create")
              ? "bg-blue-500/10 text-blue-600"
              : "bg-green-500/10 text-green-600";

          return (
            <div
              key={activity.id}
              className="flex gap-3"
            >
              <div className="mt-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${statusTone}`}>
                  {activity.status?.toLowerCase().includes("fail") || activity.status?.toLowerCase().includes("error") ? (
                    <AlertCircle className="h-4 w-4" />
                  ) : activity.status?.toLowerCase().includes("provision") || activity.status?.toLowerCase().includes("create") ? (
                    <Clock3 className="h-4 w-4" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                </div>
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-foreground">
                    {activity.title}
                  </p>
                </div>

                <p className="mt-1 text-xs text-muted-foreground">
                  {activity.service || "Platform"} • {activity.resourceName || "Resource"}
                </p>

                <p className="text-xs text-muted-foreground">
                  {activity.user} • {formatTimestamp(activity.timestamp)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}