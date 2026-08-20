import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer, Tooltip } from "recharts";
import { format, parseISO } from "date-fns";
import { createPortal } from "react-dom";
import { Activity } from "lucide-react";
import { LinePortalTooltip } from "@/components/charts/LinePortalTooltip";
import { useChartTooltip } from "@/components/charts/useChartTooltip";

const CATEGORY_COLORS = {
  Auth: "#60a5fa",
  "AWS Ops": "#34d399",
  "User Mgmt": "#f472b6",
  Settings: "#fb923c",
  Requests: "#818cf8",
};

export const ActivityTimelineChart = ({ data }) => {
  const { tooltipData, handleMouseMove, handleContainerMouseMove, clearTooltip } = useChartTooltip();

  const transformedData = {};
  
  data.forEach(item => {
    const dateKey = item.date;
    if (!transformedData[dateKey]) {
      transformedData[dateKey] = { date: dateKey };
    }
    transformedData[dateKey][item.category] = item.count;
  });

  const chartData = Object.values(transformedData).map((item: any) => {
    const filledItem: any = {
      ...item,
      date: format(parseISO(item.date), "MMM d"),
    };
    
    // Fill in zeros for all categories on each date
    Object.keys(CATEGORY_COLORS).forEach(category => {
      if (filledItem[category] === undefined) {
        filledItem[category] = 0;
      }
    });
    
    return filledItem;
  });

  const hasData = data.length > 0;

  return (
    <Card className="glass-panel rounded-xl">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-base font-semibold">Activity timeline</CardTitle>
            </div>
            <p className="text-xs text-muted-foreground">Events per day, grouped by category</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <div onMouseMove={handleContainerMouseMove}>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart 
                data={chartData} 
                margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                onMouseMove={(e) => handleMouseMove(e)}
                onMouseLeave={clearTooltip}
              >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" vertical={false} />
              <XAxis 
                dataKey="date" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                content={() => null}
                cursor={{
                  stroke: 'rgba(255, 255, 255, 0.3)',
                  strokeWidth: 1,
                  strokeDasharray: '5 5',
                }}
              />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                iconType="line"
                wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }}
              />
              {Object.keys(CATEGORY_COLORS).map(category => (
                <Line
                  key={category}
                  type="monotone"
                  dataKey={category}
                  stroke={CATEGORY_COLORS[category]}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ 
                    r: 5,
                    fill: CATEGORY_COLORS[category],
                    strokeWidth: 0,
                  }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex items-center justify-center h-[400px] text-muted-foreground">
            <div className="text-center">
              <Activity className="w-12 h-12 mx-auto mb-2 opacity-20" />
              <p className="text-sm">No activity data available</p>
            </div>
          </div>
        )}
      </CardContent>
      {tooltipData && typeof document !== 'undefined' && createPortal(
        <LinePortalTooltip 
          date={tooltipData.date}
          items={tooltipData.items}
          x={tooltipData.x}
          y={tooltipData.y}
        />,
        document.body,
      )}
    </Card>
  );
};
