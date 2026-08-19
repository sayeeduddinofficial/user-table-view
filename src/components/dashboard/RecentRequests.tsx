import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/appStore";
import { useRecentRequests } from "@/hooks/useDashboard";
import { RecentRequestRow } from "./RecentRequestRow";
import { isStakeholderRole } from "./dashboardUtils";

export function RecentRequests() {
  const navigate = useNavigate();
  const { data: recentRequests = [], isLoading, error } = useRecentRequests();

  const currentUser = useAppStore((s) => s.currentUser);
  const isStakeholder = isStakeholderRole(currentUser?.role);

  return (
    <div className="glass-panel rounded-xl">
      <div className="flex items-center justify-between p-6 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground">
          Recent Requests
        </h2>
        <Button
          variant="ghost"
          size="sm"
          disabled={isStakeholder}
          onClick={() => !isStakeholder && navigate("/requests")}
          className={cn(
            "text-muted-foreground hover:text-foreground",
            isStakeholder && "opacity-50 cursor-not-allowed"
          )}
        >
          View All
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      <div className="divide-y divide-border">
        {isLoading ? (
          <div className="p-4 text-center text-muted-foreground">
            Loading requests...
          </div>
        ) : error ? (
          <div className="p-4 text-center text-destructive">
            Failed to load requests
          </div>
        ) : recentRequests.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            No recent requests
          </div>
        ) : (
          recentRequests.map((request) => (
            <RecentRequestRow
              key={request.request_id}
              request={request}
              currentUser={currentUser}
            />
          ))
        )}
      </div>
    </div>
  );
}