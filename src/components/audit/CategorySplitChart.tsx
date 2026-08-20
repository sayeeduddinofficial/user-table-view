import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, Sector } from "recharts";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { PieChart as PieChartIcon } from "lucide-react";

const CATEGORY_COLORS = {
  Auth: "#60a5fa",
  "AWS Ops": "#34d399",
  "User Mgmt": "#f472b6",
  Settings: "#fb923c",
  Requests: "#818cf8",
  "Load Balancer": "#facc15",
};

const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 5}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
    </g>
  );
};

function DonutPortalTooltip({ hover, total }: { hover: { name: string; value: number; fill: string; x: number; y: number }; total: number }) {
  const pct = total > 0 ? ((hover.value / total) * 100).toFixed(1) : '0';
  const W = 180, H = 78, GAP = 12;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  
  let left = hover.x + GAP;
  if (left + W > vw - 8) left = hover.x - W - GAP;
  if (left < 8) left = 8;
  
  let top = hover.y + GAP;
  if (top + H > vh - 8) top = hover.y - H - GAP;
  if (top < 8) top = 8;
  
  return (
    <div
      style={{
        position: 'fixed', left, top, width: W, zIndex: 9999,
        pointerEvents: 'none',
      }}
      className="rounded-xl border border-border/60 bg-popover/95 backdrop-blur-2xl px-3 py-2 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-150"
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: hover.fill }} />
        <span className="text-[11px] font-semibold text-foreground">{hover.name}</span>
      </div>
      <div className="flex items-center gap-3 pl-4">
        <span className="text-[10px] text-muted-foreground">Count</span>
        <span className="font-mono text-[11px] font-bold text-foreground ml-auto">{hover.value.toLocaleString()}</span>
      </div>
      <div className="flex items-center gap-3 pl-4">
        <span className="text-[10px] text-muted-foreground">Share</span>
        <span className="font-mono text-[11px] font-bold text-foreground ml-auto">{pct}%</span>
      </div>
    </div>
  );
}

export const CategorySplitChart = ({ data }) => {
  const [donutHover, setDonutHover] = useState<{ name: string; value: number; fill: string; x: number; y: number } | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

  useEffect(() => {
    const handleScroll = () => {
      if (donutHover) {
        setDonutHover(null);
        setActiveIndex(undefined);
      }
    };

    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [donutHover]);

  const chartData = Object.entries(data).map(([category, count]) => ({
    name: category,
    value: count,
    color: CATEGORY_COLORS[category] || "#64748b",
  }));

  const total = chartData.reduce((sum, item) => sum + (+item.value), 0);
  const hasData = total > 0;

  return (
    <Card className="glass-panel rounded-xl">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <PieChartIcon className="w-4 h-4 text-muted-foreground" />
          <CardTitle className="text-base font-semibold">Category split</CardTitle>
        </div>
        <p className="text-xs text-muted-foreground">Distribution by category</p>
      </CardHeader>
      <CardContent className="pt-0">
        {hasData ? (
          <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10">
            {/* Donut Chart */}
            <div className="relative flex-shrink-0" style={{ width: 200, height: 200 }}>
              <PieChart width={200} height={200}>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                  cornerRadius={4}
                  activeIndex={activeIndex}
                  activeShape={renderActiveShape}
                  onMouseLeave={() => {
                    setDonutHover(null);
                    setActiveIndex(undefined);
                  }}
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color}
                      onMouseEnter={(e: any) => {
                        setActiveIndex(index);
                        setDonutHover({
                          name: entry.name, 
                          value: entry.value, 
                          fill: entry.color,
                          x: e?.clientX ?? 0, 
                          y: e?.clientY ?? 0,
                        });
                      }}
                    />
                  ))}
                </Pie>
              </PieChart>
              {/* Center Total */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="text-2xl font-bold">{total.toLocaleString()}</div>
                <div className="text-[10px] text-muted-foreground uppercase">Total</div>
              </div>
            </div>

            {/* Legend with Progress Bars */}
            <div className="flex-1 w-full md:w-auto space-y-3">
              {chartData.map((item) => {
                const percentage = ((+item.value / total) * 100).toFixed(1);
                return (
                  <div key={item.name} className="flex items-center gap-3 text-xs">
                    {/* Dot and Label */}
                    <div className="flex items-center gap-2.5 min-w-[100px]">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-foreground">{item.name}</span>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="flex-1 h-1.5 bg-muted/30 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    </div>
                    
                    {/* Percentage and Count */}
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground min-w-[45px] text-right">{percentage}%</span>
                      <span className="font-semibold text-foreground min-w-[40px] text-right">{+item.value}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-[200px] text-muted-foreground">
            <div className="text-center">
              <PieChartIcon className="w-12 h-12 mx-auto mb-2 opacity-20" />
              <p className="text-sm">No category data available</p>
            </div>
          </div>
        )}
      </CardContent>
      {donutHover && typeof document !== 'undefined' && createPortal(
        <DonutPortalTooltip hover={donutHover} total={total} />,
        document.body,
      )}
    </Card>
  );
};
