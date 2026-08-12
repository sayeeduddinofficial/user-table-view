import { useMemo, useState, useEffect } from 'react';
import { format, parseISO, startOfMonth } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { DatePresetPicker } from '@/components/audit/DatePresetPicker';
import { env } from '@/lib/env';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle: string;
  color: string;
};

export function BillingDetailDialog({ open, onOpenChange, title, subtitle, color }: Props) {
  const today = new Date();
  const monthStart = startOfMonth(today);

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: monthStart,
    to: today,
  });

  const [awsData, setAwsData] = useState<{ total: number; daily: Array<{ date: string; cost: number }> }>({ total: 0, daily: [] });
  const [loading, setLoading] = useState(true);

  // Fetch daily MTD spend from aws_billing_history table (development only)
  useEffect(() => {
    if (!open) {
      setDateRange({ from: monthStart, to: today });
      return;
    }
  }, [open]);

  useEffect(() => {
    const fetchDBData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        if (!token) return;

        const API_BASE = env.vmRequest;
        
        // Build query params with date range
        const params = new URLSearchParams();
        if (dateRange?.from) {
          params.append('startDate', format(dateRange.from, 'yyyy-MM-dd'));
        }
        if (dateRange?.to) {
          params.append('endDate', format(dateRange.to, 'yyyy-MM-dd'));
        }
        
        const url = `${API_BASE}/api/leadership-billing/mtd-daily-db?${params.toString()}`;
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.ok) {
          const data = await response.json();
          setAwsData(data);
        }
      } catch (error) {
        console.error('Failed to fetch daily MTD spend from database:', error);
      } finally {
        setLoading(false);
      }
    };

    if (open) {
      fetchDBData();
    }
  }, [open, dateRange]);

  const chartData = useMemo(() => {
    return awsData.daily.map((item) => ({
      label: format(parseISO(item.date), 'MMM dd'),
      value: item.cost,
    }));
  }, [awsData]);

  const totalCost = awsData.total;

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.[0]) return null;
    return (
      <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-lg px-3 py-2.5 shadow-xl">
        <p className="text-xs font-medium text-muted-foreground">{payload[0].payload.label}</p>
        <p className="text-base font-bold text-foreground mt-0.5">
          ${Number(payload[0].value).toFixed(2)}
        </p>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <div className="flex items-start justify-between gap-8 pr-8">
            <div className="flex-1">
              <DialogTitle className="text-xl font-semibold">{title}</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1.5">
                Total: ${Number(totalCost).toFixed(2)}
              </p>
            </div>
            <div className="flex items-center gap-2 pt-1 shrink-0">
              <DatePresetPicker dateRange={dateRange} onDateRangeChange={setDateRange} />
            </div>
          </div>
        </DialogHeader>
        <div className="mt-6 bg-muted/20 rounded-xl p-6 border border-border/40">
          {loading ? (
            <div className="flex items-center justify-center h-[360px] text-muted-foreground text-sm">
              Loading billing data...
            </div>
          ) : chartData.length === 0 ? (
            <div className="flex items-center justify-center h-[360px] text-muted-foreground text-sm">
              No billing data available for selected period
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={360}>
              <BarChart data={chartData} margin={{ top: 20, right: 20, left: -10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.2)" vertical={false} />
                <XAxis 
                  dataKey="label" 
                  tick={{ fontSize: 13, fill: 'hsl(var(--muted-foreground))' }} 
                  axisLine={{ stroke: 'hsl(var(--border) / 0.3)' }} 
                  tickLine={false}
                  dy={10}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  tick={{ fontSize: 13, fill: 'hsl(var(--muted-foreground))' }} 
                  axisLine={{ stroke: 'hsl(var(--border) / 0.3)' }} 
                  tickLine={false}
                  dx={-10}
                  tickFormatter={(value) => `$${value}`}
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
            </ResponsiveContainer>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
