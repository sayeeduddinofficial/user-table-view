import { useState } from "react";
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
} from "recharts";
import { format, parse } from "date-fns";
import { ChartTooltip } from "./LeadershipCharts";

type ServiceCostRow = {
    date: string;
    ec2: number;
    vpc: number;
    s3: number;
    lb: number;
    rds: number;
    route53: number;
    eks: number;
    total?: number;
};

type ChartRow = {
    date: string;
    [serviceName: string]: string | number;
};

interface Props {
    data: ServiceCostRow[];
}

const SERVICE_COLORS: Record<string, string> = {
  "EC2-Instances": "#4E79A7",            // Blue
  "S3": "#F28E2B",                       // Orange
  "VPC": "#59A14F",                      // Green
  "Elastic Load Balancing": "#E15759",   // Red
  "RDS": "#9C6ADE",                      // Purple
  "Route 53": "#76B7B2",                 // Cyan
  "EKS": "#EDC948",                      // Yellow
};

const SERVICE_ORDER = [
    "EC2-Instances",
    "VPC",
    "Elastic Load Balancing",
    "S3",
    "RDS",
    "Route 53",
    "EKS",
];

function buildChartData(rows: ServiceCostRow[]) {
    return rows
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((row) => {
            // Monthly rows have "yyyy-MM", daily rows have "yyyy-MM-dd"
            const isMonthly = /^\d{4}-\d{2}$/.test(row.date);
            const parsed = isMonthly
                ? parse(row.date, "yyyy-MM", new Date())
                : parse(row.date, "yyyy-MM-dd", new Date());
            const label = isMonthly ? format(parsed, "MMM yyyy") : format(parsed, "MMM dd");

            return {
                label,
                date: row.date,
                "EC2-Instances": row.ec2,
                VPC: row.vpc,
                S3: row.s3,
                "Elastic Load Balancing": row.lb,
                RDS: row.rds,
                "Route 53": row.route53,
                EKS: row.eks,
            };
        });
}

function getServices(chartData: ChartRow[]) {
    const set = new Set<string>();

    chartData.forEach((row) => {
        Object.keys(row).forEach((key) => {
            if (key !== "date" && key !== "label") {
                set.add(key);
            }
        });
    });

    const present = Array.from(set);

    // Keep known services in fixed order, then append any unknown services
    const ordered = [
        ...SERVICE_ORDER.filter((s) => present.includes(s)),
        ...present.filter((s) => !SERVICE_ORDER.includes(s)),
    ];

    return ordered;
}

function formatYAxis(value: number) {
    if (value >= 1000) {
        const formatted = value / 1000;
        return Number.isInteger(formatted) ? `${formatted}K` : `${formatted.toFixed(1)}K`;
    }
    return `${value}`;
}


function lightenColor(hex: string, amount = 0.18) {
    const color = hex.replace("#", "");
    const num = parseInt(color, 16);

    let r = (num >> 16) & 255;
    let g = (num >> 8) & 255;
    let b = num & 255;

    r = Math.min(255, Math.round(r + (255 - r) * amount));
    g = Math.min(255, Math.round(g + (255 - g) * amount));
    b = Math.min(255, Math.round(b + (255 - b) * amount));

    return `rgb(${r}, ${g}, ${b})`;
}

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
            tickInterval: 0,
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
function renderBarShape({
    fill,
    x,
    y,
    width,
    height,
    payload,
    service,
    hoveredSegment,
}: any) {
    const isHovered =
        hoveredSegment?.service === service &&
        hoveredSegment?.label === payload?.label;

    const finalFill = isHovered ? lightenColor(fill, 0.18) : fill;

    return (
        <rect
            x={x}
            y={y}
            width={width}
            height={height}
            fill={finalFill}
            rx={0}
            ry={0}
        />
    );
}

export function ServiceCostStackedChart({
    data,
}: Props) {
    const chartData = buildChartData(data);
    const services = getServices(chartData);
    const [hoveredSegment, setHoveredSegment] = useState<{
        service: string;
        label: string;
    } | null>(null);
    const layout = getBarLayout(chartData.length);

    return (
        <>
            {chartData.length === 0 ? (
                <div className="flex items-center justify-center text-sm text-muted-foreground">
                    No billing data available
                </div>
            ) : (
                <>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={chartData}
                            margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                            barCategoryGap={layout.barCategoryGap}
                            barGap={0}
                        >
                            <CartesianGrid
                                strokeDasharray="3 3"
                                vertical={false}
                                stroke="hsl(var(--border) / 0.15)"
                                opacity={0.5}
                            />

                            <XAxis
                                dataKey="label"
                                axisLine={false}
                                tickLine={false}
                                interval={layout.tickInterval}
                                minTickGap={12}
                                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                            />

                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                                tickFormatter={formatYAxis}
                            />

                            <Tooltip
                                cursor={{ fill: "hsl(var(--muted) / 0.18)" }}
                                content={
                                    <ChartTooltip
                                        suffix="$"
                                        showTotal
                                        hoveredSegment={hoveredSegment}
                                        services={services}
                                    />
                                }
                            />

                            {services.map((service) => {
                                const baseColor = SERVICE_COLORS[service] || "#8884d8";

                                return (
                                    <Bar
                                        key={service}
                                        dataKey={service}
                                        name={service}
                                        stackId="cost"
                                        fill={baseColor}
                                        radius={[0, 0, 0, 0]}
                                        maxBarSize={layout.maxBarSize}
                                        isAnimationActive={false}
                                        shape={(props: any) =>
                                            renderBarShape({
                                                ...props,
                                                fill: baseColor,
                                                service,
                                                hoveredSegment,
                                            })
                                        }
                                        onMouseEnter={(data: any) => {
                                            const label = data?.payload?.label;
                                            if (!label) return;

                                            setHoveredSegment({
                                                service,
                                                label: data?.payload?.label,
                                            })
                                        }}
                                        onMouseLeave={() => setHoveredSegment(null)}
                                    />
                                );
                            })}
                        </BarChart>
                    </ResponsiveContainer>

                    {/* Legend */}
                    <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 justify-center">
                        {services.map((service) => (
                            <div key={service} className="flex items-center gap-2 text-xs">
                                <span
                                    className="h-3 w-3 rounded-sm"
                                    style={{
                                        backgroundColor: SERVICE_COLORS[service] || "#8884d8",
                                    }}
                                />
                                <span className="text-muted-foreground">{service}</span>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </>
    );
}