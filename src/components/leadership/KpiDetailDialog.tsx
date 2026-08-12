import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Area, Bar, BarChart, Line, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, AreaChart, Legend } from "recharts";

type DataPoint = {
  label: string;
  value?: number;

  ec2?: number;
  vpc?: number;
  s3?: number;
  lb?: number;
  rds?: number;
  route53?: number;
  eks?: number;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  data: DataPoint[];
  variant: 'bar' | 'area';
  color: string;
  prefix?: string;
};

const serviceLabels: Record<string, string> = {
  ec2: "EC2",
  vpc: "VPC",
  s3: "S3",
  lb: "Load Balancer",
  rds: "RDS",
  route53: "Route 53",
  eks: "EKS",
};

const SERVICE_COLORS: Record<string, string> = {
  ec2: "#4E79A7",
  vpc: "#59A14F",
  s3: "#F28E2B",
  lb: "#E15759",
  rds: "#9C6ADE",
  route53: "#76B7B2",
  eks: "#EDC948",
};

export function KpiDetailDialog({ open, onOpenChange, title, data, variant, color, prefix = '' }: Props) {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;

    return (
      <div className="rounded-xl border border-border/60 bg-popover/95 backdrop-blur-2xl px-3 py-2.5 shadow-2xl">
        <p className="text-[11px] font-semibold text-foreground mb-1.5">
          {label}
        </p>

        {payload.map((entry: any) => (
          <div
            key={entry.dataKey}
            className="flex items-center gap-2.5 py-0.5"
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />

            <span className="text-[11px] text-muted-foreground">
              {serviceLabels[entry.dataKey] || entry.dataKey}
            </span>

            <span className="font-mono text-[11px] font-bold text-foreground ml-auto">
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">{title}</DialogTitle>
        </DialogHeader>
        <div className="mt-6 bg-muted/20 rounded-xl p-6 border border-border/40">
          <ResponsiveContainer width="100%" height={360}>
            {variant === 'bar' ? (
              <BarChart data={data} margin={{ top: 20, right: 20, left: -10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.2)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 13, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={{ stroke: 'hsl(var(--border) / 0.3)' }}
                  tickLine={false}
                  dy={10}
                />
                <YAxis
                  tick={{ fontSize: 13, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={{ stroke: 'hsl(var(--border) / 0.3)' }}
                  tickLine={false}
                  dx={-10}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ fill: 'hsl(var(--muted) / 0.15)', radius: 8 }}
                />
                <Bar
                  dataKey="value"
                  fill={color}
                  radius={[8, 8, 0, 0]}
                  maxBarSize={70}
                  animationDuration={600}
                />
              </BarChart>
            ) : (
              <AreaChart data={data} margin={{ top: 20, right: 20, left: -10, bottom: 20 }}>
                <defs>
                  <linearGradient id="gEC2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4E79A7" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#4E79A7" stopOpacity={0} />
                  </linearGradient>

                  <linearGradient id="gVPC" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#59A14F" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#59A14F" stopOpacity={0} />
                  </linearGradient>

                  <linearGradient id="gS3" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F28E2B" stopOpacity={0.30} />
                    <stop offset="100%" stopColor="#F28E2B" stopOpacity={0} />
                  </linearGradient>

                  <linearGradient id="gLB" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#E15759" stopOpacity={0.30} />
                    <stop offset="100%" stopColor="#E15759" stopOpacity={0} />
                  </linearGradient>

                  <linearGradient id="gRDS" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#9C6ADE" stopOpacity={0.30} />
                    <stop offset="100%" stopColor="#9C6ADE" stopOpacity={0} />
                  </linearGradient>

                  <linearGradient id="gRoute53" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#76B7B2" stopOpacity={0.30} />
                    <stop offset="100%" stopColor="#76B7B2" stopOpacity={0} />
                  </linearGradient>

                  <linearGradient id="gEKS" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#EDC948" stopOpacity={0.30} />
                    <stop offset="100%" stopColor="#EDC948" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.2)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 13, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={{ stroke: 'hsl(var(--border) / 0.3)' }}
                  tickLine={false}
                  dy={10}
                />
                <YAxis
                  tick={{ fontSize: 13, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={{ stroke: 'hsl(var(--border) / 0.3)' }}
                  tickLine={false}
                  dx={-10}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{
                    stroke: "hsl(var(--border))",
                    strokeDasharray: "3 3",
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  align="center"
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{
                    paddingTop: 20,
                    fontSize: 11,
                  }}
                  formatter={(value) => (
                    <span className="text-[11px] text-muted-foreground">
                      {serviceLabels[value as string] || value}
                    </span>
                  )}
                />
                {title === "Total Resources" ? (
                  <>
                    <Area
                      type="monotone"
                      dataKey="ec2"
                      stroke="#4E79A7"
                      strokeWidth={2.5}
                      fill="url(#gEC2)"
                    />

                    <Area
                      type="monotone"
                      dataKey="vpc"
                      stroke="#59A14F"
                      strokeWidth={2.5}
                      fill="url(#gVPC)"
                    />

                    <Area
                      type="monotone"
                      dataKey="s3"
                      stroke="#F28E2B"
                      strokeWidth={2.5}
                      fill="url(#gS3)"
                    />

                    <Area
                      type="monotone"
                      dataKey="lb"
                      stroke="#E15759"
                      strokeWidth={2.5}
                      fill="url(#gLB)"
                    />

                    <Area
                      type="monotone"
                      dataKey="rds"
                      stroke="#9C6ADE"
                      strokeWidth={2.5}
                      fill="url(#gRDS)"
                    />

                    <Area
                      type="monotone"
                      dataKey="route53"
                      stroke="#76B7B2"
                      strokeWidth={2.5}
                      fill="url(#gRoute53)"
                    />

                    <Area
                      type="monotone"
                      dataKey="eks"
                      stroke="#EDC948"
                      strokeWidth={2.5}
                      fill="url(#gEKS)"
                    />
                  </>
                ) : (
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={color}
                    strokeWidth={3}
                    fill="url(#colorKpi)"
                    animationDuration={600}
                  />
                )}
              </AreaChart >
            )}
          </ResponsiveContainer>
        </div>
      </DialogContent>
    </Dialog>
  );
}
