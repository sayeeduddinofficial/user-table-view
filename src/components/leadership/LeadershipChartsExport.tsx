import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { format, parseISO } from 'date-fns';

const PALETTE = ['#60a5fa', '#34d399', '#f472b6', '#fb923c', '#818cf8'];

type BillingRecord = {
  billed_on: string;
  vm_name: string;
  user_name: string;
  user_email: string;
  shape: string;
  region: string;
  environment: string;
  hours_run: number;
  hourly_rate: number;
  total_cost: number;
  lifecycle_event: string;
};

type Props = { data: BillingRecord[]; rangeDays: number };

export function LeadershipChartsExport({ data, rangeDays }: Props) {
  const usageTrend = useMemo(() => {
    const byDate: Record<string, number> = {};
    data.forEach((r) => {
      byDate[r.billed_on] = (byDate[r.billed_on] || 0) + 1;
    });
    return Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date: format(parseISO(date), 'MMM dd'), count }));
  }, [data]);

  const costByShape = useMemo(() => {
    const byShape: Record<string, number> = {};
    data.forEach((r) => {
      byShape[r.shape] = (byShape[r.shape] || 0) + r.total_cost;
    });
    return Object.entries(byShape)
      .map(([shape, cost]) => ({ shape, cost: Number(cost.toFixed(2)) }))
      .sort((a, b) => b.cost - a.cost);
  }, [data]);

  const topUsers = useMemo(() => {
    const byUser: Record<string, number> = {};
    data.forEach((r) => {
      byUser[r.user_name] = (byUser[r.user_name] || 0) + r.total_cost;
    });
    return Object.entries(byUser)
      .map(([user, cost]) => ({ user, cost: Number(cost.toFixed(2)) }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 5);
  }, [data]);

  const startStopOps = useMemo(() => {
    const byDate: Record<string, { starts: number; stops: number }> = {};
    data.forEach((r) => {
      if (!byDate[r.billed_on]) byDate[r.billed_on] = { starts: 0, stops: 0 };
      if (r.lifecycle_event === 'running') byDate[r.billed_on].starts++;
      if (r.lifecycle_event === 'stopped') byDate[r.billed_on].stops++;
    });
    return Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, ops]) => ({ date: format(parseISO(date), 'MMM dd'), starts: ops.starts, stops: ops.stops }));
  }, [data]);

  const costByRegion = useMemo(() => {
    const byRegion: Record<string, number> = {};
    data.forEach((r) => {
      byRegion[r.region] = (byRegion[r.region] || 0) + r.total_cost;
    });
    return Object.entries(byRegion)
      .map(([region, cost]) => ({ region, cost: Number(cost.toFixed(2)) }))
      .sort((a, b) => b.cost - a.cost);
  }, [data]);

  return (
    <div className="p-8 bg-background" style={{ width: '1440px' }}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">FinOps Overview</h1>
        <p className="text-sm text-muted-foreground">Cloud cost analytics, usage insights and spend visibility</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Usage Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={usageTrend}>
                <defs>
                  <linearGradient id="colorCountExport" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={PALETTE[0]} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={PALETTE[0]} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="date" stroke="#888" style={{ fontSize: 12 }} />
                <YAxis stroke="#888" style={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }} />
                <Area type="monotone" dataKey="count" stroke={PALETTE[0]} fillOpacity={1} fill="url(#colorCountExport)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cost by Shape</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie data={costByShape} dataKey="cost" nameKey="shape" cx="50%" cy="50%" outerRadius={80}>
                    {costByShape.map((_, i) => <Cell key={`cell-${i}`} fill={PALETTE[i % PALETTE.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1">
                {costByShape.slice(0, 5).map((s, i) => (
                  <div key={s.shape} className="flex items-center justify-between py-1.5 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: PALETTE[i % PALETTE.length] }} />
                      <span className="text-muted-foreground">{s.shape}</span>
                    </div>
                    <span className="font-mono text-foreground">${s.cost.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top 5 Users by Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={topUsers} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis type="number" stroke="#888" style={{ fontSize: 12 }} />
                <YAxis dataKey="user" type="category" stroke="#888" style={{ fontSize: 12 }} width={100} />
                <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }} />
                <Bar dataKey="cost" fill={PALETTE[1]} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Start/Stop Operations</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={startStopOps}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="date" stroke="#888" style={{ fontSize: 12 }} />
                <YAxis stroke="#888" style={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }} />
                <Bar dataKey="starts" stackId="a" fill={PALETTE[1]} />
                <Bar dataKey="stops" stackId="a" fill={PALETTE[2]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cost by Region</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={costByRegion} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis type="number" stroke="#888" style={{ fontSize: 12 }} />
                <YAxis dataKey="region" type="category" stroke="#888" style={{ fontSize: 12 }} width={100} />
                <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }} />
                <Bar dataKey="cost" fill={PALETTE[3]} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
