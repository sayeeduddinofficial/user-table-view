import { forwardRef, useMemo } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import {
  Activity, Globe2, LineChart as LineIcon, PieChart as PieIcon,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ServiceCostStackedChart } from './ServiceCostStackedChart';

type TooltipItem = {
  name: string;
  value: number;
  color?: string;
  payload?: any;
};

const PALETTE = ['#6b8caf', '#4a9d7c', '#b89968', '#8a7bb0', '#c47a7a', '#5aa890', '#9c8b6b', '#7da3c0'];

function GlassCard({ children, className, style }: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div className={cn(
      'relative rounded-2xl border border-border/50 overflow-hidden bg-card/40 backdrop-blur-xl',
      className,
    )}
      style={style}
    >
      <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{ boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.03)' }} />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

function CardHeader({ icon: Icon, title, subtitle, right, iconColor }: {
  icon: any; title: string; subtitle?: string; right?: React.ReactNode; iconColor?: string;
}) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-start gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted/40 mt-0.5">
          <Icon className="h-3.5 w-3.5" style={{ color: iconColor || 'hsl(var(--muted-foreground))' }} />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground tracking-tight">{title}</h3>
          {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {right}
    </div>
  );
}

export const ChartTooltip = ({
  active,
  payload,
  label,
  suffix = "",
  showTotal = false,
  hoveredSegment,
  services,
}: any) => {
  if (!active || !payload?.length) return null;

  const payloadMap = new Map<string, TooltipItem>(
    payload.map((p: TooltipItem) => [p.name, p])
  );

  const items =
    services && services.length > 0
      ? services.map((service: string) => {
        const item = payloadMap.get(service);

        return {
          name: service,
          value: Number(item?.value || 0),
          color: item?.color,
          payload: item?.payload,
        };
      })
      : payload;

  const total = items.reduce(
    (sum: number, item: TooltipItem) => sum + Number(item.value || 0),
    0
  );

  return (
    <div className="rounded-xl border border-border/60 bg-popover/95 backdrop-blur-2xl px-3 py-2.5 shadow-2xl">
      {label && (
        <p className="text-[11px] font-semibold text-foreground mb-1.5">
          {label}
        </p>
      )}

      {items.map((entry: any, i: number) => {
        const isHovered =
          hoveredSegment?.service === entry.name &&
          hoveredSegment?.label === label;

        return (
          <div
            key={i}
            className={cn(
              "flex items-center justify-between gap-2.5 rounded-md px-1 py-0.5 transition-colors",
              isHovered && "bg-muted/40"
            )}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{
                backgroundColor: entry.color || entry.payload?.fill,
              }}
            />

            <span
              className={cn(
                "text-[11px]",
                isHovered
                  ? "font-medium text-foreground"
                  : "text-muted-foreground"
              )}
            >
              {entry.name}
            </span>

            <span
              className={cn(
                "font-mono text-[11px] ml-auto",
                isHovered
                  ? "font-semibold text-foreground"
                  : "font-bold text-foreground"
              )}
            >
              {suffix === "$"
                ? `$${Number(entry.value).toFixed(2)}`
                : Number(entry.value).toLocaleString()}
            </span>
          </div>
        )
      })}

      {showTotal && (
        <>
          <div className="my-2 border-t border-border/50" />
          <div className="flex justify-between text-[11px] font-semibold">
            <span>Total costs</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </>
      )}
    </div>
  );
};

function getBarLayout(pointCount: number) {
  if (pointCount <= 7) {
    return {
      barCategoryGap: "8%",
      maxBarSize: 65,
      tickInterval: 0,
    };
  }

  if (pointCount <= 15) {
    return {
      barCategoryGap: "12%",
      maxBarSize: 52,
      tickInterval: 0,
    };
  }

  if (pointCount <= 31) {
    return {
      barCategoryGap: "14%",
      maxBarSize: 30,
      tickInterval: 1,
    };
  }

  if (pointCount <= 60) {
    return {
      barCategoryGap: "6%",
      maxBarSize: 18,
      tickInterval: 3,
    };
  }

  return {
    barCategoryGap: "3%",
    maxBarSize: 14,
    tickInterval: 6,
  };
}
interface UnifiedData {
  costTrend: Array<{ date: string; cost: number }>;
  usageTrends: Array<{ date: string; active_count: number; created_count: number; terminated_count: number }>;
  activeVMs: Array<{ date: string; active_count: number }>;
  operations: Array<{ date: string; started_count: number; stopped_count: number }>;
  costByUser: Array<{ user_id: number; user_email: string; user_name: string; total_cost: number }>;
  costByRegion: Array<{ region: string; total_cost: number }>;
  costByInstanceType: Array<{ instance_type: string; total_cost: number }>;

  costByService: Array<{ date: string; ec2: number; vpc: number; s3: number; lb: number; total: number;}>;
}

interface Props {
  data: UnifiedData;
  rangeDays: 7 | 30 | 90;
  exportMode?: boolean;
}

export const LeadershipCharts = forwardRef<HTMLDivElement, Props>(function LeadershipCharts({ data, rangeDays, exportMode = false }, ref) {

  // Transform unified data for charts
  const trendData = useMemo(() => {
    // Use usageTrends from aws_billing_history which has created_count and terminated_count
    if (!data.usageTrends || data.usageTrends.length === 0) {
      return [];
    }
    return data.usageTrends
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(d => ({
        day: format(parseISO(d.date), rangeDays > 30 ? 'MMM dd' : 'MMM dd'),
        date: d.date,
        Created: d.created_count || 0,
        Terminated: d.terminated_count || 0,
        Active: d.active_count || 0,
      }));
  }, [data.usageTrends, rangeDays]);

  const opsData = useMemo(() => {
    return data.operations
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(d => ({
        day: format(parseISO(d.date), rangeDays > 30 ? 'MMM dd' : 'MMM dd'),
        Start: d.started_count,
        Stop: d.stopped_count,
      }));
  }, [data.operations, rangeDays]);

  const opsLayout = useMemo(
    () => getBarLayout(opsData.length),
    [opsData.length]
  );

  const shapeCost = useMemo(() => {
    return data.costByInstanceType
      .filter(item => item.total_cost > 0)
      .map((item, i) => ({
        name: item.instance_type,
        value: item.total_cost,
        fill: PALETTE[i % PALETTE.length]
      }));
  }, [data.costByInstanceType]);

  const regionCost = useMemo(() => {
    return data.costByRegion
      .filter(item => item.total_cost > 0)
      .map((item, i) => ({
        region: item.region,
        cost: item.total_cost,
        fill: PALETTE[i % PALETTE.length],
        _key: `${item.region}-${item.total_cost}-${i}`
      }));
  }, [data.costByRegion]);

  const topUsers = useMemo(() => {
    return data.costByUser
      .slice(0, 5)
      .map((u, i) => ({
        name: u.user_name,
        email: u.user_email,
        cost: u.total_cost,
        color: PALETTE[i % PALETTE.length]
      }));
  }, [data.costByUser]);

  const totalCost = useMemo(() => shapeCost.reduce((s, r) => s + r.value, 0), [shapeCost]);

  if (!data || (trendData.length === 0 && shapeCost.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Activity className="h-12 w-12 mb-3 opacity-30" />
        <p className="text-sm">No billing data available for the selected filters.</p>
      </div>
    );
  }

  const shapeCardHeight = exportMode
    ? Math.max(320, 320 + (shapeCost.length - 8) * 24)
    : 320;

  return (
    <div ref={ref} className="space-y-3 w-full">
      <GlassCard className="p-5">
        <CardHeader
          icon={LineIcon}
          title="Usage trend"
          subtitle="VMs created, terminated and active (system-wide from snapshots)"
          iconColor="#6b8caf"
          right={
            <div className="text-[10px] font-mono text-muted-foreground border border-border/50 rounded-md px-2 py-1">
              {trendData.length} days
            </div>
          }
        />
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="gActive" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4a9d7c" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#4a9d7c" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gCreated" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6b8caf" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#6b8caf" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gTerm" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#c47a7a" stopOpacity={0.30} />
                  <stop offset="100%" stopColor="#c47a7a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.15)" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'hsl(var(--border))', strokeDasharray: '3 3' }} />
              <Area type="monotone" dataKey="Active" stroke="#4a9d7c" strokeWidth={2.5} fill="url(#gActive)" />
              <Area type="monotone" dataKey="Created" stroke="#6b8caf" strokeWidth={2.5} fill="url(#gCreated)" />
              <Area type="monotone" dataKey="Terminated" stroke="#c47a7a" strokeWidth={2.5} fill="url(#gTerm)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-4 mt-3 flex-wrap">
          {[['Active', '#4a9d7c'], ['Created', '#6b8caf'], ['Terminated', '#c47a7a']].map(([n, c], i) => (
            <div key={`${n}-${i}`} className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c }} />
              <span className="text-[10px] text-muted-foreground">{n}</span>
            </div>
          ))}
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <GlassCard
          className="p-5"
          style={exportMode ? { minHeight: shapeCardHeight } : undefined}
        >
          <CardHeader icon={PieIcon} title="Cost by shape" subtitle="Spend distribution by instance type" iconColor="#8a7bb0" />
          {shapeCost.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
              <PieIcon className="h-10 w-10 mb-2 opacity-30" />
              <p className="text-xs">No cost data available</p>
            </div>
          ) : (
            <div className="flex items-center gap-6">
              <div className="relative h-[200px] w-[200px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={shapeCost} cx="50%" cy="50%" innerRadius={62} outerRadius={92}
                      paddingAngle={2} dataKey="value" stroke="none" cornerRadius={4}>
                      {shapeCost.map((e, i) => <Cell key={`shape-cell-${i}`} fill={e.fill} />)}
                    </Pie>
                    <Tooltip content={<ChartTooltip suffix="$" />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <p className="text-xl font-bold text-foreground leading-none">${totalCost.toFixed(2)}</p>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-1">Total</p>
                  </div>
                </div>
              </div>
              <div
                className={cn(
                  "flex-1 space-y-2 min-w-0 pr-1",
                  exportMode
                    ? ""
                    : "max-h-[200px] overflow-y-auto"
                )}
              >
                {shapeCost.map((s) => {
                  const pct = totalCost > 0 ? ((s.value / totalCost) * 100).toFixed(1) : '0';
                  return (
                    <div key={s.name} className="flex items-center gap-2 text-[11px]">
                      <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: s.fill }} />
                      <span className="text-muted-foreground flex-1 truncate font-mono">{s.name}</span>
                      <span className="text-[10px] text-muted-foreground/70 font-mono">{pct}%</span>
                      <span className="font-mono font-semibold text-foreground w-16 text-right">${s.value.toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </GlassCard>

        <GlassCard
          className="p-5"
          style={exportMode ? { minHeight: shapeCardHeight } : undefined}
        >
          <CardHeader icon={Users} title="Top 5 users by cost" subtitle="Highest-spending consumers (AWS billing)" iconColor="#b89968" />
          <div className="space-y-3">
            {topUsers.length === 0 ? (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
                No billing data available
              </div>
            ) : (
              topUsers.map((u) => {
                const max = topUsers[0]?.cost || 1;
                const pct = (u.cost / max) * 100;
                const initials = u.name.split(/[\s@]/)[0].slice(0, 2).toUpperCase();
                return (
                  <div key={u.email} className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg text-[11px] font-bold text-white shrink-0" style={{ backgroundColor: u.color }}>
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[12px] font-medium text-foreground truncate">{u.name}</p>
                      </div>
                      <div className="h-1.5 mt-1 rounded-full bg-muted/30 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: u.color }} />
                      </div>
                    </div>
                    <span className="text-[12px] font-mono font-bold text-foreground shrink-0 w-20 text-right">${u.cost.toFixed(2)}</span>
                  </div>
                );
              })
            )}
          </div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <GlassCard className="p-5">
          <CardHeader icon={Activity} title="Start / Stop operations" subtitle="Daily lifecycle activity (system-wide from snapshots)" iconColor="#4a9d7c" />
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={opsData}
                margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                barCategoryGap={opsLayout.barCategoryGap}
                barGap={0}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.25)" vertical={false} />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  interval={opsLayout.tickInterval}
                  minTickGap={12}
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(var(--muted) / 0.3)' }} />
                <Bar
                  dataKey="Start"
                  stackId="a"
                  fill="#4a9d7c"
                  radius={[0, 0, 0, 0]}
                  maxBarSize={opsLayout.maxBarSize}
                />

                <Bar
                  dataKey="Stop"
                  stackId="a"
                  fill="#b89968"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={opsLayout.maxBarSize}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-4 mt-2">
            {[['Start', '#4a9d7c'], ['Stop', '#b89968']].map(([label, color], i) => (
              <div key={`${label}-${i}`} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} /><span className="text-[10px] text-muted-foreground">{label}</span></div>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <CardHeader icon={Globe2} title="Cost by region" subtitle="Spend distribution by AWS region" iconColor="#6b8caf" />
          {regionCost.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[260px] text-muted-foreground">
              <Globe2 className="h-10 w-10 mb-2 opacity-30" />
              <p className="text-xs">No cost data available</p>
            </div>
          ) : (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={regionCost.slice(0, 10)} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.25)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="region" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={90} />
                  <Tooltip content={<ChartTooltip suffix="$" />} cursor={{ fill: 'hsl(var(--muted) / 0.3)' }} />
                  <Bar dataKey="cost" radius={[0, 4, 4, 0]}>
                    {regionCost.slice(0, 10).map((e, i) => <Cell key={`cell-${i}`} fill={e.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </GlassCard>
      </div>

      <GlassCard className="p-5">
        <CardHeader
          icon={LineIcon}
          title="Cost and usage"
          subtitle="Daily AWS service costs"
          iconColor="#6b8caf"
        />

        <div className="h-[280px]">
          <ServiceCostStackedChart
            data={data.costByService}
          />
        </div>
      </GlassCard>
    </div>
  );
});
