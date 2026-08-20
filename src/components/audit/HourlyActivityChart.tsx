import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Flame } from "lucide-react";

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

const getColor = (count: number, max: number) => {
  if (count === 0) return 'hsl(var(--muted))';
  const intensity = count / max;
  if (intensity < 0.2) return '#1e3a3a';
  if (intensity < 0.4) return '#2d5555';
  if (intensity < 0.6) return '#34d399';
  if (intensity < 0.8) return '#6ee7b7';
  return '#a7f3d0';
};

export const HourlyActivityChart = ({ data }) => {
  const maxCount = Math.max(...data.map(d => d.count), 1);
  const totalEvents = data.reduce((sum, d) => sum + d.count, 0);
  const hasData = data.length > 0 && totalEvents > 0;

  return (
    <Card className="glass-panel rounded-xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-base font-semibold">Activity heatmap</CardTitle>
            </div>
            <p className="text-xs text-muted-foreground">Peak usage by day of week and hour of day</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Events count</p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">0</span>
              <div className="flex gap-1">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#1e3a3a' }} />
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#2d5555' }} />
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#34d399' }} />
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#6ee7b7' }} />
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#a7f3d0' }} />
              </div>
              <span className="text-muted-foreground">{maxCount}</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <div className="relative">
            {/* Hour labels */}
            <div className="flex ml-12 mb-1">
              {HOURS.map(hour => (
                <div key={hour} className="flex-1 text-center text-[10px] text-muted-foreground">
                  {hour}
                </div>
              ))}
            </div>
            
            {/* Heatmap grid */}
            <div className="space-y-[2px]">
              {DAYS.map((day, dayIndex) => (
                <div key={day} className="flex items-center gap-2">
                  <div className="w-8 text-xs text-muted-foreground text-right">{day}</div>
                  <div className="flex gap-[2px] flex-1">
                    {HOURS.map(hour => {
                      const dataPoint = data.find(d => d.day === dayIndex && d.hour === hour);
                      const count = dataPoint?.count || 0;
                      return (
                        <div
                          key={hour}
                          className="flex-1 h-5 rounded transition-all hover:ring-1 hover:ring-white/50 cursor-pointer"
                          style={{ backgroundColor: getColor(count, maxCount) }}
                          title={`${day} ${hour}:00 - ${count} events`}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-[200px] text-muted-foreground">
            <div className="text-center">
              <Flame className="w-12 h-12 mx-auto mb-2 opacity-20" />
              <p className="text-sm">No hourly activity data available</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
