import { useMemo, useRef, useState } from 'react';
import { format, subDays } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { toast } from 'sonner';
import { exportGraphsAsPNG } from '@/utils/exportGraphs';
import {
  Activity, ArrowDownRight, ArrowUpRight, DollarSign, Download,
  Globe2, Server, Users, Cpu,
  Box,
} from 'lucide-react';
import {env} from '@/lib/env';
import { Header } from '@/components/layout/Header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultiSelect } from '@/components/ui/multi-select';
import { DatePresetPicker } from '@/components/audit/DatePresetPicker';
import { LeadershipCharts } from '@/components/leadership/LeadershipCharts';
import { KpiDetailDialog } from '@/components/leadership/KpiDetailDialog';
import { BillingDetailDialog } from '@/components/leadership/BillingDetailDialog';
import { useUnifiedDashboard } from '@/hooks/useUnifiedDashboard';
import { useKPIData } from '@/hooks/useKPIData';
import { useAuditFilters } from '@/hooks/useAuditLogs';
import { cn } from '@/lib/utils';
import { INSTANCE_TYPES, AWS_REGIONS, AWS_SERVICES } from '@/types';

type RangeDays = 7 | 30 | 90;

type StatTrend = {
  value: number;
  display: string;
  tooltip: string;
  showTooltip: boolean;
};

type StatCard = {
  key: 'running' | 'launches' | 'spend' | 'totals';
  label: string;
  value: string;
  sub: string;
  icon: typeof Server;
  color: string;
  trend?: StatTrend | number;
  series: Array<{ label: string; value: number }>;
  chartColor: string;
  variant: 'bar' | 'area';
  prefix?: string;
};

export default function Leadership() {
  const { data: filters } = useAuditFilters();

  // Initialize date range to match "This Month" preset (1st of current month to today)
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const today = new Date();
    const from = new Date(today.getFullYear(), today.getMonth(), 1);
    return { from, to: today };
  });
  const [userFilters, setUserFilters] = useState<string[]>([]);
  const [shapeFilters, setShapeFilters] = useState<string[]>([]);
  const [regionFilters, setRegionFilters] = useState<string[]>([]);
  const [serviceFilters, setServiceFilters] = useState<string[]>([]);
  const [rangeDays] = useState<RangeDays>(30);
  const [openKpi, setOpenKpi] = useState<null | 'running' | 'launches' | 'spend' | 'totals'>(null);

  const chartsRef = useRef<HTMLDivElement>(null);

  // Stable date range for KPI data (1st of current month to today for MTD)
  const kpiDateRange = useMemo(() => {
    const now = new Date();
    return {
      from: new Date(now.getFullYear(), now.getMonth(), 1), // 1st of current month
      to: now
    };
  }, []);

  const uniqueUsers = useMemo(() => {
    if (filters?.users) {
      return filters.users.map(u => ({ id: u.user_id, name: u.user_name }));
    }
    return [];
  }, [filters]);

  const uniqueShapes = useMemo(() => INSTANCE_TYPES.map(t => t.value), []);
  const uniqueRegions = useMemo(() => AWS_REGIONS, []);
  const uniqueServices = useMemo(() => AWS_SERVICES, []);

  // Get user IDs from selected user names
  const selectedUserIds = useMemo(() => {
    if (userFilters.length === 0) return undefined;
    return userFilters
      .map(name => uniqueUsers.find(u => u.name === name)?.id)
      .filter((id): id is number => id !== undefined);
  }, [userFilters, uniqueUsers]);

  // Fetch KPI data from new endpoint
  const { data: kpiDataFromAPI } = useKPIData();

  // Fetch unified dashboard data with filters for charts
  const { data: unifiedData, loading, error } = useUnifiedDashboard({
    startDate: dateRange?.from || subDays(new Date(), 30),
    endDate: dateRange?.to || new Date(),
    userIds: selectedUserIds,
    instanceTypes: shapeFilters.length > 0 ? shapeFilters : undefined,
    regions: regionFilters.length > 0 ? regionFilters : undefined,
    services: serviceFilters.length > 0 ? serviceFilters : undefined
  });

  // Fetch unfiltered data for KPIs (always current data)
  const { data: kpiData } = useUnifiedDashboard({
    startDate: kpiDateRange.from,
    endDate: kpiDateRange.to,
    userIds: undefined,
    instanceTypes: undefined,
    regions: undefined,
    services: undefined
  });

  // MTD cost from database (aws_billing_history table, development only)
  const mtdCostFromDB = useMemo(() => {
    return kpiData.costTrend.reduce((sum, d) => sum + d.cost, 0);
  }, [kpiData]);

  // Calculate KPIs from new API endpoint
  const kpis = useMemo(() => {
    if (!kpiDataFromAPI || !kpiDataFromAPI.totalVMs) {
      return {
        running: 0,
        launchedToday: 0,
        launchedYesterday: 0,
        launchTrend: { value: 0, display: '0%', tooltip: '0%', showTooltip: false },
        mtdCost: 0,
        activeUsers: 0,
        totalResources: 0
      };
    }

    // Running VMs today
    const running = kpiDataFromAPI.runningVMs.today;
    
    // Launched today and yesterday
    const launchedToday = kpiDataFromAPI.launchedVMs.today;
    const yesterdayData = kpiDataFromAPI.launchedVMs.last7Days[kpiDataFromAPI.launchedVMs.last7Days.length - 2];
    const launchedYesterday = yesterdayData?.count || 0;
    
    // Calculate percentage trend using same logic as Active VMs card in main dashboard
    const launchTrend = (() => {
      if (launchedYesterday === 0) {
        if (launchedToday === 0) {
          return { value: 0, display: '0%', tooltip: '0%', showTooltip: false };
        }
        return { value: 100, display: 'New', tooltip: 'New activity compared to yesterday', showTooltip: false };
      }
      
      const rawPercent = ((launchedToday - launchedYesterday) / launchedYesterday) * 100;
      const absPercent = Math.abs(rawPercent);
      const overHundred = absPercent > 100;
      
      return {
        value: rawPercent,
        display: overHundred ? '100%+' : `${absPercent.toFixed(0)}%`,
        tooltip: `${absPercent.toFixed(2)}%`,
        showTooltip: overHundred
      };
    })();

    // MTD cost from database (aws_billing_history, development only)
    const mtdCost = mtdCostFromDB;

    // Active users from API (distinct users with running VMs)
    const activeUsers = kpiDataFromAPI.activeUsers || 0;

    // Total VMs today
    const totalResources = kpiDataFromAPI.totalVMs.today;

    return { running, launchedToday, launchedYesterday, launchTrend, mtdCost, activeUsers, totalResources };
  }, [kpiDataFromAPI, mtdCostFromDB]);


  const handleExportCsv = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      const startDate = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : format(subDays(new Date(), 30), 'yyyy-MM-dd');
      const endDate = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');

      const params = new URLSearchParams();
      params.append('startDate', startDate);
      params.append('endDate', endDate);
      
      if (selectedUserIds && selectedUserIds.length > 0) {
        selectedUserIds.forEach(id => params.append('userId', id.toString()));
      }
      if (shapeFilters.length > 0) {
        shapeFilters.forEach(shape => params.append('instanceType', shape));
      }
      if (regionFilters.length > 0) {
        regionFilters.forEach(region => params.append('region', region));
      }
      if (serviceFilters.length > 0) {
        serviceFilters.forEach(service => params.append('service', service));
      }

      const API_BASE = env.vmRequest;
      const url = `${API_BASE}/api/leadership-billing/unified-export-csv?${params.toString()}`;

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Failed to export CSV');
      }

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `leadership-billing-${startDate}-to-${endDate}.csv`;
      a.click();
      URL.revokeObjectURL(downloadUrl);
      toast.success('CSV downloaded');
    } catch (error) {
      console.error('CSV export error:', error);
      toast.error('Failed to export CSV');
    }
  };

  const handleExportPng = async () => {
    try {
      await exportGraphsAsPNG('leadership-graphs-container');
      toast.success('PNG downloaded');
    } catch (err) {
      console.error('PNG export failed', err);
      toast.error('Failed to export PNG');
    }
  };

  const onExport = (v: string) => {
    if (v === 'csv') handleExportCsv();
    if (v === 'png') handleExportPng();
  };

  const last7Days = useMemo(() => {
    const days: string[] = [];
    for (let i = 6; i >= 0; i--) days.push(format(subDays(new Date(), i), 'yyyy-MM-dd'));
    return days;
  }, []);

  const kpiSeries = useMemo(() => {
    const labels = last7Days.map((d) => format(new Date(d), 'EEE'));

    if (!kpiDataFromAPI || !kpiDataFromAPI.totalVMs || !kpiDataFromAPI.runningVMs || !kpiDataFromAPI.launchedVMs) {
      return { running: [], launches: [], spend: [], totals: [] };
    }

    // Use last 7 days from KPI API (excluding today)
    const running = kpiDataFromAPI.runningVMs.last7Days.map((d) => ({
      label: format(new Date(d.date), 'EEE'),
      value: d.count
    }));

    const launches = kpiDataFromAPI.launchedVMs.last7Days.map((d) => ({
      label: format(new Date(d.date), 'EEE'),
      value: d.count
    }));

    const spend = last7Days.map((d, i) => {
      const dailyCost = kpiData.costTrend.find(c => c.date === d);
      return { label: labels[i], value: dailyCost?.cost || 0 };
    });

    const totals = kpiDataFromAPI.totalVMs.last7Days.map((d) => ({
      label: format(new Date(d.date), 'EEE'),
      ec2: d.ec2 || 0,
      vpc: d.vpc || 0,
      s3: d.s3 || 0,
      lb: d.lb || 0,
      rds: d.rds || 0,
      route53: d.route53 || 0,
      eks: d.eks || 0,
    }));

    return { running, launches, spend, totals };
  }, [kpiDataFromAPI, kpiData, last7Days]);

  const statCards: StatCard[] = [
    {
      key: 'running',
      label: 'VMs running', value: kpis.running.toLocaleString(),
      sub: `${kpis.activeUsers} active users`, icon: Server, color: 'text-emerald-400',
      trend: undefined,
      series: kpiSeries?.running || [], chartColor: '#4a9d7c', variant: 'bar',
    },
    {
      key: 'launches' as const,
      label: 'VMs launched today', value: kpis.launchedToday.toLocaleString(),
      sub: `vs ${kpis.launchedYesterday} yesterday`,
      icon: Cpu, color: 'text-sky-400',
      trend: kpis.launchTrend,
      series: kpiSeries?.launches || [], chartColor: '#6b8caf', variant: 'bar' as const,
    },
    {
      key: 'spend' as const,
      label: 'MTD spend', value: `$${kpis.mtdCost.toFixed(2)}`,
      sub: 'Month to date', icon: DollarSign, color: 'text-amber-400',
      trend: undefined,
      series: kpiSeries?.spend || [], chartColor: '#b89968', variant: 'bar' as const, prefix: '$',
    },
    {
      key: 'totals' as const,
      label: 'Total Resources (window)', value: kpis.totalResources.toLocaleString(),
      sub: '', icon: Activity, color: 'text-violet-400',
      trend: undefined,
      series: kpiSeries?.totals || [], chartColor: '#8a7bb0', variant: 'area' as const,
    },
  ];

  const activeKpi = statCards.find((c) => c.key === openKpi);


  if (error) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header
          title="FinOps Overview"
          subtitle="Cloud cost analytics, usage insights and spend visibility"
          showNewRequest={false}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Activity className="h-12 w-12 mx-auto mb-3 opacity-30 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Failed to load dashboard data</p>
            <p className="text-xs text-muted-foreground mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        title="FinOps Overview"
        subtitle="Cloud cost analytics, usage insights and spend visibility"
        showNewRequest={false}
      />

      <div className="px-4 md:px-6 pt-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {statCards.map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => setOpenKpi(s.key)}
              className="text-left rounded-xl border border-border/50 bg-card/50 backdrop-blur px-4 py-4 transition-all hover:border-primary/40 hover:bg-card/70 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <div className="flex items-center justify-between">
                <div className={cn('flex h-9 w-9 items-center justify-center rounded-xl bg-muted/30')}>
                  <s.icon className={cn('h-4 w-4', s.color)} />
                </div>
                {typeof s.trend === 'object' && s.trend !== null && 'value' in s.trend ? (
                  <div className="relative group">
                    <Badge variant="outline" className={cn(
                      'gap-1 text-[10px] font-mono border',
                      s.trend.value > 0 ? 'text-rose-400 border-rose-500/30 bg-rose-500/10'
                        : 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
                    )}>
                      {s.trend.value >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      {s.trend.display}
                    </Badge>
                    {s.trend.showTooltip && (
                      <div className="absolute right-0 top-full mt-2 hidden group-hover:block z-50">
                        <div className="bg-[#1f2937] text-white text-xs px-3 py-1.5 rounded-lg shadow-lg border border-white/10 whitespace-nowrap">
                          {s.trend.tooltip}
                        </div>
                      </div>
                    )}
                  </div>
                ) : typeof s.trend === 'number' ? (
                  <Badge variant="outline" className={cn(
                    'gap-1 text-[10px] font-mono border',
                    s.trend > 0 ? 'text-rose-400 border-rose-500/30 bg-rose-500/10'
                      : 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
                  )}>
                    {s.trend >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    {Math.abs(s.trend).toFixed(0)}%
                  </Badge>
                ) : null}
              </div>
              <p className="mt-3 text-2xl font-bold text-foreground tracking-tight">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              <p className="text-[10px] text-muted-foreground/70 mt-0.5">{s.sub}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="pt-6 pr-6 pl-6">
        <Card className="glass-panel rounded-xl">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4 items-center">
              {/* Date Range Picker */}
              <DatePresetPicker dateRange={dateRange} onDateRangeChange={setDateRange} />

              {/* Filters */}
              <div className="flex gap-3 flex-wrap items-center">
                {/* All Users dropdown */}
                <MultiSelect
                  options={uniqueUsers.map((u) => ({
                    label: u.name,
                    value: String(u.id),
                  }))}
                  selected={userFilters.map(name => {
                    const user = uniqueUsers.find(u => u.name === name);
                    return user ? String(user.id) : '';
                  }).filter(Boolean)}
                  onChange={(values) => {
                    const names = values.map(id => uniqueUsers.find(u => String(u.id) === id)?.name).filter(Boolean) as string[];
                    setUserFilters(names);
                  }}
                  placeholder="All Users"
                  selectedLabel="Users"
                  icon={Users}
                  className="w-auto min-w-[140px]"
                />

                {/* All Shapes dropdown */}
                <MultiSelect
                  options={uniqueShapes.map((s) => ({
                    label: s,
                    value: s,
                  }))}
                  selected={shapeFilters}
                  onChange={(values) => setShapeFilters(values)}
                  placeholder="All Shapes"
                  selectedLabel="Shapes"
                  icon={Cpu}
                  className="w-auto min-w-[140px]"
                />

                {/* All Regions dropdown */}
                <MultiSelect
                  options={uniqueRegions.map((r) => ({
                    label: r.label,
                    value: r.value,
                  }))}
                  selected={regionFilters}
                  onChange={(values) => setRegionFilters(values)}
                  placeholder="All Regions"
                  selectedLabel="Regions"
                  icon={Globe2}
                  className="w-auto min-w-[150px]"
                />

                <MultiSelect
                  options={uniqueServices.map((service) => ({
                    label: service.label,
                    value: service.value,
                  }))}
                  selected={serviceFilters}
                  onChange={(values) => setServiceFilters(values)}
                  placeholder="All Services"
                  selectedLabel="Services"
                  icon={Box}
                  className="w-auto min-w-[150px]"
                />
              </div>

              {/* Export dropdown - pushed to right */}
              <div className="lg:ml-auto">
                <Select value="" onValueChange={onExport} disabled={loading}>
                  <SelectTrigger className="w-[130px] focus:ring-0 focus:ring-offset-0 cursor-pointer">
                    <Download className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Export" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv" className="pl-3 cursor-pointer">
                      Export as CSV
                    </SelectItem>
                    <SelectItem value="png" className="pl-3 cursor-pointer">
                      Download as PNG
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">Loading billing data…</div>
        ) : (
          <>
            <LeadershipCharts ref={chartsRef} data={unifiedData} rangeDays={rangeDays} />
          </>
        )}
      </div>

      <KpiDetailDialog
        open={!!openKpi && openKpi !== 'spend'}
        onOpenChange={(o) => !o && setOpenKpi(null)}
        title={activeKpi?.label || ''}
        subtitle={activeKpi ? `${activeKpi.value} · ${activeKpi.sub}` : ''}
        data={activeKpi?.series || []}
        variant={activeKpi?.variant || 'bar'}
        color={activeKpi?.chartColor || ''}
        prefix={(activeKpi as any)?.prefix || ''}
      />

      <BillingDetailDialog
        open={openKpi === 'spend'}
        onOpenChange={(o) => !o && setOpenKpi(null)}
        title="MTD Spend"
        subtitle="Month to date from aws_billing_history"
        color="#b89968"
      />

      {/* Hidden export container */}
      <div style={{ position: 'fixed', left: '-9999px', top: '0', width: '1200px' }}>
        <div id="leadership-graphs-container" className="bg-background p-6 space-y-6">
          {/* Metadata Header */}
          <div className="rounded-2xl border border-border/50 bg-card/40 p-4">
            <h2 className="text-lg font-bold text-foreground mb-2">Leadership Dashboard Export</h2>
            <div className="grid grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-muted-foreground">Date Range: </span>
                <span className="text-foreground font-medium">
                  {dateRange?.from && dateRange?.to 
                    ? `${format(dateRange.from, 'LLL dd, y')} - ${format(dateRange.to, 'LLL dd, y')}`
                    : 'Last 30 days'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Users: </span>
                <span className="text-foreground font-medium">
                  {userFilters.length > 0 ? userFilters.join(', ') : 'All Users'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Filters: </span>
                <span className="text-foreground font-medium">
                  {[
                    shapeFilters.length > 0 && `${shapeFilters.length} shapes`,
                    regionFilters.length > 0 && `${regionFilters.length} regions`,
                    serviceFilters.length > 0 && `${serviceFilters.length} services`
                  ].filter(Boolean).join(', ') || 'None'}
                </span>
              </div>
            </div>
          </div>

          {/* Reuse actual UI components */}
          <LeadershipCharts 
            data={unifiedData} 
            rangeDays={rangeDays}
            exportMode={true}
          />
        </div>
      </div>
    </div>
  );
}
