import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users } from "lucide-react";
import type { TopUser } from "@/types/api";

interface TopUsersChartProps {
  data: TopUser[];
}

const USER_COLORS = [
  "#60a5fa",  // text-blue-400
  "#34d399",  // text-emerald-400
  "#f472b6",  // text-pink-400
  "#fb923c",  // text-orange-400
  "#818cf8",  // text-indigo-400
];

export const TopUsersChart = ({ data }: TopUsersChartProps) => {
  const totalActivity = data.reduce((sum, user) => sum + user.count, 0);
  const hasData = data.length > 0;

  return (
    <Card className="glass-panel rounded-xl">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-muted-foreground" />
          <CardTitle className="text-base font-semibold">Top users</CardTitle>
        </div>
        <p className="text-xs text-muted-foreground">Top 5 by event count</p>
      </CardHeader>
      <CardContent className="pt-0">
        {hasData ? (
          <div>
            {data.map((user, index) => {
              const initials = user.user_name
                ?.split(" ")
                .map((n: string) => n[0])
                .join("")
                .toUpperCase() || "?";

              const percentage = (user.count / totalActivity) * 100;
              const userColor = USER_COLORS[index % USER_COLORS.length];

              return (
                <div key={`${user.user_id}-${index}`} className="py-1.5 first:pt-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Avatar className="h-7 w-7 flex-shrink-0">
                      {user.avatar && <AvatarImage src={user.avatar} />}
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium truncate">{user.user_name || "Unknown"}</span>
                        <span className="text-xs font-semibold flex-shrink-0">{user.count.toLocaleString()}</span>
                      </div>
                      {/* Progress bar */}
                      <div className="h-1 bg-muted/10 rounded-full overflow-hidden mt-1.5">
                        <div 
                          className="h-full rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%`, backgroundColor: userColor }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center justify-center h-[200px] text-muted-foreground">
            <div className="text-center">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-20" />
              <p className="text-sm">No user activity data available</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
