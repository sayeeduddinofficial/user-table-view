import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { MultiSelect } from "@/components/ui/multi-select";
import { DataTable, Column } from "@/components/common/DataTable";
import { format } from "date-fns";
import {
  Shield,
  Server,
  Users,
  Settings,
  FileText,
  Search,
  CalendarIcon,
  Download,
  ChevronDown,
  ArrowLeft,
  ChevronRight,
  Filter,
  BarChart3,
  Table as TableIcon,
  Database,
} from "lucide-react";
import { CATEGORY_DISPLAY_LABELS, ACTION_DISPLAY_LABELS } from "@/types";
import {
  useAuditLogs,
  useAuditFilters,
  useAuditCategoryCounts,
  useAuditAnalytics,
} from "@/hooks/useAuditLogs";
import { AuditLogsCSV } from "@/hooks/useAuditLogs";
import { useDialog } from "@/components/ui/dialog-context";
import { ActivityTimelineChart } from "@/components/audit/ActivityTimelineChart";
import { CategorySplitChart } from "@/components/audit/CategorySplitChart";
import { TopUsersChart } from "@/components/audit/TopUsersChart";
import { VMLifecycleChart } from "@/components/audit/VMLifecycleChart";
import { RequestManagementChart } from "@/components/audit/RequestManagementChart";
import { HourlyActivityChart } from "@/components/audit/HourlyActivityChart";
import { exportGraphsAsPNG, exportGraphsAsPDF } from "@/utils/exportGraphs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
const CATEGORY_BADGE_CONFIG: Record<
  string,
  {
    icon: React.ElementType;
    className: string;
  }
> = {
  Auth: {
    icon: Shield,
    className: "bg-blue-500/15 text-blue-400 border border-blue-500/25",
  },
  "VM Ops": {
    icon: Server,
    className:
      "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25",
  },
  "User Mgmt": {
    icon: Users,
    className: "bg-pink-500/15 text-pink-400 border border-pink-500/25",
  },
  Settings: {
    icon: Settings,
    className: "bg-orange-500/15 text-orange-400 border border-orange-500/25",
  },
  Requests: {
    icon: FileText,
    className: "bg-indigo-500/15 text-indigo-400 border border-indigo-500/25",
  },
  S3: {
    icon: Database,
    className: "bg-purple-500/15 text-purple-400 border border-purple-500/25",
  },
};

// ─── Category config for stat cards ──────────────────────────────────────────
const CATEGORY_CONFIG = [
  {
    key: "Auth",
    label: "Auth",
    icon: Shield,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
  },
  {
    key: "VM Ops",
    label: "VM Ops",
    icon: Server,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
  },
  {
    key: "User Mgmt",
    label: "User Mgmt",
    icon: Users,
    color: "text-pink-400",
    bg: "bg-pink-500/10",
  },
  {
    key: "Settings",
    label: "Settings",
    icon: Settings,
    color: "text-orange-400",
    bg: "bg-orange-500/10",
  },
  {
    key: "Requests",
    label: "Requests",
    icon: FileText,
    color: "text-indigo-400",
    bg: "bg-indigo-500/10",
  },
  {
    key: "S3",
    label: "S3",
    icon: Database,
    color: "text-purple-400",
    bg: "bg-purple-500/10",
  }
];

export default function AuditLogs() {
  const { alert } = useDialog();
  const [search, setSearch] = useState("");
  const [userId, setUserId] = useState<string[]>([]);
  const [category, setCategory] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<"table" | "graph">("table");
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({ from: undefined, to: undefined });
  const [dateRangeOption, setDateRangeOption] = useState<string>("thisMonth");
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [hoveredDate, setHoveredDate] = useState<Date | undefined>(undefined);
  const [tempDateRange, setTempDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({ from: undefined, to: undefined });

  // ─── Replace all useCallback/useEffect fetch logic with these three lines ──
  const { data: logsData, isLoading } = useAuditLogs({
    search,
    userId,
    category,
    page,
    dateRangeOption: dateRangeOption !== "custom" ? dateRangeOption : undefined,
    startDate: dateRange.from ? format(dateRange.from, "yyyy-MM-dd") : undefined,
    endDate: dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : undefined,
  });
  const { data: filters } = useAuditFilters();
  const { data: categoryCounts } = useAuditCategoryCounts({
    userId,
    category,
    dateRangeOption: dateRangeOption !== "custom" ? dateRangeOption : undefined,
    startDate: dateRange.from ? format(dateRange.from, "yyyy-MM-dd") : undefined,
    endDate: dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : undefined,
  });
  const { data: analytics } = useAuditAnalytics({
    userId,
    category,
    dateRangeOption: dateRangeOption !== "custom" ? dateRangeOption : undefined,
    startDate: dateRange.from ? format(dateRange.from, "yyyy-MM-dd") : undefined,
    endDate: dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : undefined,
  });

  const logs = logsData?.data ?? [];
  const pagination = logsData?.pagination ?? {
    total: 0,
    page: 1,
    limit: 6,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  };
  const filterData = filters ?? { users: [], categories: [] };
  const categoryCountsData = categoryCounts ?? {};

  // ─── Search debounce — reset page on search change ───────────────────────
  useEffect(() => {
    const timer = setTimeout(() => setPage(1), 400);
    return () => clearTimeout(timer);
  }, [search]);

  // ─── Handle date range option change ──────────────────────────────────────
  const handleDateRangeChange = (value: string) => {
    if (value === "custom") {
      return;
    }
    
    setDateRangeOption(value);
    setPage(1);
    setDateRange({ from: undefined, to: undefined });
    setIsCalendarOpen(false);
  };

  // ─── Get display text for date range ──────────────────────────────────────
  const getDateRangeDisplay = () => {
    if (dateRangeOption === "custom" && dateRange.from && dateRange.to) {
      return `${format(dateRange.from, "LLL dd, y")} - ${format(dateRange.to, "LLL dd, y")}`;
    }
    
    const options: Record<string, string> = {
      last7days: "Last 7 days",
      last30days: "Last 30 days",
      thisMonth: format(new Date(), "MMMM yyyy"),
      lastMonth: "Last month",
      last3months: "Last 3 months",
      last6months: "Last 6 months",
      thisYear: "This year",
    };
    
    return options[dateRangeOption] || format(new Date(), "MMMM yyyy");
  };

  // ─── Format timestamp ────────────────────────────────────────────────────────
  const formatTs = (ts: string) =>
    new Date(ts).toLocaleString("sv-SE").replace("T", " ");

  const formatIp = (ip: string | null) => {
    if (!ip) return "—";
    return ip;
  };

  // ─── Define table columns ────────────────────────────────────────────────────
  const columns: Column<any>[] = [
    {
      key: "created_at",
      header: "Timestamp",
      render: (row) => (
        <span className="font-mono text-muted-foreground">{formatTs(row.created_at)}</span>
      ),
    },
    {
      key: "user_name",
      header: "User",
      render: (row) => <span className="text-foreground">{row.user_name ?? "—"}</span>,
    },
    {
      key: "action",
      header: "Action",
      render: (row) => (
        <span className="text-foreground">
          {ACTION_DISPLAY_LABELS[row.action] ?? row.action}
        </span>
      ),
    },
    {
      key: "target",
      header: "Target",
      render: (row) => (
        <span className="font-mono text-primary">{row.target ?? "—"}</span>
      ),
    },
    {
      key: "details",
      header: "Details",
      className: "w-[400px]",
      render: (row) => {
        const description = row.details?.description || "";
        const justification = row.details?.justification || "";

        const details =
          [
            description,
            justification ? `Justification: ${justification}` : null,
          ]
            .filter(Boolean)
            .join("\n") || "—";

        const showTooltip =
          description.length > 50 ||
          justification.length > 40;

        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="max-w-[350px] text-muted-foreground">
                  <div className="truncate">{description}</div>

                  {row.details?.justification && (
                    <div className="truncate">
                      Justification: {row.details.justification}
                    </div>
                  )}
                </div>
              </TooltipTrigger>

              {showTooltip && (
                <TooltipContent
                  side="top"
                  className="max-w-[300px] whitespace-pre-wrap break-words text-sm leading-relaxed"
                >
                  {details}
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        );
      },
    },
    {
      key: "category",
      header: "Category",
      render: (row) => {
        const cat = CATEGORY_DISPLAY_LABELS[row.category] ?? row.category;
        const config = CATEGORY_BADGE_CONFIG[row.category];
        const Icon = config?.icon;
        return (
          <span
            className={`inline-flex items-center whitespace-nowrap gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
              config?.className ??
              "bg-muted text-muted-foreground border border-border"
            }`}
          >
            {Icon && <Icon className="h-3 w-3" />}
            {cat}
          </span>
        );
      },
    },
    {
      key: "ip_address",
      header: "IP Address",
      render: (row) => (
        <span className="font-mono text-muted-foreground">
          {formatIp(row.ip_address)}
        </span>
      ),
    },
  ]; 


    const handleExportCSV = async () => { 
      try {
      await AuditLogsCSV({ 
       userId, 
       category, 
       dateRangeOption: dateRangeOption !== "custom" ? dateRangeOption : undefined,
       startDate: dateRange.from ? format(dateRange.from, "yyyy-MM-dd") : undefined,
       endDate: dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : undefined,
     });

    alert({
      title: "Download Completed",
      severity: "success",
    })
  } catch (err) {
    alert({
      title: "Failed to export CSV",
      severity: "error",
    })
    console.error("Export failed:", err);
  }
};

  const handleExportPNG = async () => {
    try {
      await exportGraphsAsPNG('audit-graphs-container');
      alert({
        title: "PNG Downloaded",
        severity: "success",
      });
    } catch (err) {
      alert({
        title: "Failed to export PNG",
        severity: "error",
      });
      console.error("Export failed:", err);
    }
  };

  const handleExportPDF = async () => {
    try {
      await exportGraphsAsPDF('audit-graphs-container');
      alert({
        title: "PDF Downloaded",
        severity: "success",
      });
    } catch (err) {
      alert({
        title: "Failed to export PDF",
        severity: "error",
      });
      console.error("Export failed:", err);
    }
  };

  return (
    <div>
      <Header
        title="Audit Logs"
        subtitle="Track all user and system activity"
        showSearch={false}
      />

      <div className="p-6 space-y-6">
        {/* ── Stat cards ─────────────────────────────────────────────────────── */}
        <div className="grid gap-4 md:grid-cols-5">
          {CATEGORY_CONFIG.map(({ key, label, icon: Icon, color, bg }) => (
            <Card
              key={key}
              className="glass-panel rounded-xl p-6 hover:border-primary/30 transition-colors"
            >
              <CardContent className="px-0 py-0">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg ${bg}`}
                  >
                    <Icon className={`h-5 w-5 ${color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {categoryCountsData[key] ?? 0}
                    </p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* ── Filters ──────────────────────────────────────────────────────────── */}
      <div className="px-6">
        <Card className="glass-panel rounded-xl">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4 items-center">
              {/* Graph/Table Toggle */}
              <div className="flex gap-1 p-1 bg-muted/30 rounded-lg">
                <Button
                  variant={viewMode === "graph" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("graph")}
                  className="gap-2"
                >
                  <BarChart3 className="h-4 w-4" />
                  Graph
                </Button>
                <Button
                  variant={viewMode === "table" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("table")}
                  className="gap-2"
                >
                  <TableIcon className="h-4 w-4" />
                  Table
                </Button>
              </div>

              {/* Search Bar */}
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by user name, action, target..."
                  className="pl-9 w-full"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {/* Filters Row */}
              <div className="flex gap-3 flex-wrap items-center">
            {/* Date Range Dropdown with Calendar */}
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-auto min-w-[220px] justify-start font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                  <span className="flex-1 text-left text-sm">{getDateRangeDisplay()}</span>
                  <ChevronDown className="h-4 w-4 flex-shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="center">
                {showCalendar ? (
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 p-2 border-b">
                      <button
                        onClick={() => {
                          setShowCalendar(false);
                          setTempDateRange({ from: undefined, to: undefined });
                        }}
                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Back
                      </button>
                    </div>
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={tempDateRange.from || dateRange.from}
                      selected={tempDateRange}
                      onSelect={(range) => {
                        setTempDateRange({
                          from: range?.from,
                          to: range?.to,
                        });
                        if (range?.from && range?.to) {
                          setHoveredDate(undefined);
                        }
                      }}
                      numberOfMonths={2}
                      className="p-2"
                      modifiers={{
                        hoverRange: hoveredDate && tempDateRange.from && !tempDateRange.to
                          ? (() => {
                              const start = tempDateRange.from;
                              const end = hoveredDate;
                              const range = [];
                              
                              const isForward = end >= start;
                              const minDate = isForward ? start : end;
                              const maxDate = isForward ? end : start;
                              
                              const current = new Date(minDate);
                              current.setDate(current.getDate() + 1);
                              
                              while (current < maxDate) {
                                range.push(new Date(current));
                                current.setDate(current.getDate() + 1);
                              }
                              
                              return range;
                            })()
                          : [],
                        ...(hoveredDate && tempDateRange.from && !tempDateRange.to
                          ? { hoverEnd: hoveredDate }
                          : {}),
                      }}
                      modifiersClassNames={{
                        hoverRange: "bg-accent/30",
                        hoverEnd: "bg-primary text-primary-foreground",
                      }}
                      onDayMouseEnter={(day) => {
                        if (tempDateRange.from && !tempDateRange.to) {
                          setHoveredDate(day);
                        }
                      }}
                      onDayMouseLeave={() => {
                        setHoveredDate(undefined);
                      }}
                      disabled={(date) => date > new Date()}
                      classNames={{
                        months: "flex flex-col sm:flex-row space-y-2 sm:space-x-2 sm:space-y-0",
                        month: "space-y-2",
                        caption: "flex justify-center pt-1 relative items-center",
                        caption_label: "text-xs font-medium",
                        head_cell: "text-muted-foreground rounded-md w-7 font-normal text-[0.65rem]",
                        cell: "h-7 w-7 text-center text-xs p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                        day: "h-7 w-7 p-0 font-normal text-xs aria-selected:opacity-100",
                        day_today: "",
                        day_range_middle: "aria-selected:bg-primary aria-selected:text-primary-foreground rounded-none",
                        day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                        day_range_start: "rounded-l-md",
                        day_range_end: "rounded-r-md",
                        row: "flex w-full mt-1",
                      }}
                    />
                    <div className="flex gap-2 p-1.5 border-t">
                      <Button
                        onClick={() => {
                          if (tempDateRange.from && tempDateRange.to) {
                            setDateRange(tempDateRange);
                            setDateRangeOption("custom");
                            setIsCalendarOpen(false);
                            setShowCalendar(false);
                            setPage(1);
                          }
                        }}
                        disabled={!tempDateRange.from || !tempDateRange.to}
                        className="flex-1 h-8 text-sm"
                      >
                        Apply
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowCalendar(false);
                          setTempDateRange({ from: undefined, to: undefined });
                          setHoveredDate(undefined);
                        }}
                        className="flex-1 h-8 text-sm"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1 p-2">
                    <button
                      onClick={() => handleDateRangeChange("last7days")}
                      className="px-3 py-2 text-sm text-left hover:bg-primary rounded-sm hover:bg-accent hover:text-accent-foreground"
                    >
                      Last 7 days
                    </button>
                    <button
                      onClick={() => handleDateRangeChange("last30days")}
                      className="px-3 py-2 text-sm text-left hover:bg-primary rounded-sm  hover:bg-accent hover:text-accent-foreground"
                    >
                      Last 30 days
                    </button>
                    <button
                      onClick={() => {
                        setShowCalendar(true);
                        setTempDateRange(dateRange);
                      }}
                      className="px-3 py-2 text-sm text-left hover:bg-primary rounded-sm flex items-center justify-between hover:bg-accent hover:text-accent-foreground"
                    >
                      <div className="flex justify-between w-full items-center justify-items-end">
                        <span>Custom date range</span>
                        <ChevronRight className="h-4 w-4 opacity-50" />
                      </div>
                    </button>
                    <button
                      onClick={() => handleDateRangeChange("thisMonth")}
                      className="px-3 py-2 text-sm text-left hover:bg-primary rounded-sm hover:bg-accent hover:text-accent-foreground"
                    >
                      {format(new Date(), "MMMM yyyy")}
                    </button>
                    <button
                      onClick={() => handleDateRangeChange("lastMonth")}
                      className="px-3 py-2 text-sm text-left hover:bg-primary rounded-sm hover:bg-accent hover:text-accent-foreground"
                    >
                      Last month
                    </button>
                    <button
                      onClick={() => handleDateRangeChange("last3months")}
                      className="px-3 py-2 text-sm text-left hover:bg-primary rounded-sm hover:bg-accent hover:text-accent-foreground"
                    >
                      Last 3 months
                    </button>
                    <button
                      onClick={() => handleDateRangeChange("last6months")}
                      className="px-3 py-2 text-sm text-left hover:bg-primary rounded-sm hover:bg-accent hover:text-accent-foreground"
                    >
                      Last 6 months
                    </button>
                    <button
                      onClick={() => handleDateRangeChange("thisYear")}
                      className="px-3 py-2 text-sm text-left hover:bg-primary rounded-sm hover:bg-accent hover:text-accent-foreground"
                    >
                      This year
                    </button>
                  </div>
                )}
              </PopoverContent>
            </Popover>

            {/* All Users dropdown */}
            <MultiSelect
              options={[
                ...filterData.users.map((u: { user_id: string | number; user_name: string }) => ({
                  label: u.user_name,
                  value: String(u.user_id),
                })),
              ]}
              selected={userId}
              onChange={(values) => {
                setUserId(values);
                setPage(1);
              }}
              placeholder="All Users"
              selectedLabel="Users"
              icon={Users}
              className="w-auto min-w-[140px]"
            />

            {/* All Categories dropdown */}
            <MultiSelect
              options={filterData.categories.map((cat: string) => ({
                label: cat,
                value: cat,
              }))}
              selected={category}
              onChange={(values) => {
                setCategory(values);
                setPage(1);
              }}
              placeholder="All Categories"
              selectedLabel="Categories"
              icon={Filter}
              className="w-auto min-w-[160px]"
            />

            {/* Export dropdown */}
            <Select value="" onValueChange={(v) => {
              if (v === "csv") handleExportCSV();
              else if (v === "png") handleExportPNG();
              else if (v === "pdf") handleExportPDF();
            }}>
              <SelectTrigger className="w-[130px] focus:ring-0 focus:ring-offset-0 cursor-pointer">
                <Download className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Export" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv" className="pl-3 cursor-pointer">
                  Export as CSV
                </SelectItem>
                <SelectItem value="png" className="pl-3 cursor-pointer" disabled={viewMode === "table"}>
                  Download as PNG
                </SelectItem>
                <SelectItem value="pdf" className="pl-3 cursor-pointer" disabled={viewMode === "table"}>
                  Download as PDF
                </SelectItem>
              </SelectContent>
            </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="p-6">
        {viewMode === "table" ? (
          <DataTable
            columns={columns}
            data={logs}
            isLoading={isLoading}
            emptyMessage="No audit logs found"
            pagination={pagination}
            onPageChange={setPage}
            rowKey={(row) => row.id}
          />
        ) : (
          /* ── Graph View ────────────────────────────────────────────────────── */
          <div className="space-y-6">
            {/* Row 1: Activity Timeline (full width) */}
            <ActivityTimelineChart data={analytics?.activityTimeline || []} />
            
            {/* Row 2: Category Split & Top Users (50-50 split) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CategorySplitChart data={categoryCounts || {}} />
              <TopUsersChart data={analytics?.topUsers || []} />
            </div>
            
            {/* Row 3: VM Lifecycle & Request Management */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <VMLifecycleChart data={analytics?.vmLifecycle || { requested: 0, created: 0, started: 0, stopped: 0, destroyed: 0 }} />
              <RequestManagementChart data={analytics?.requestManagement || { quotaRequests: { pending: 0, approved: 0, rejected: 0 }, runtimeExtensions: { pending: 0, approved: 0, rejected: 0 } }} />
            </div>
            
            {/* Row 4: Hourly Activity - full width */}
            <HourlyActivityChart data={analytics?.hourlyActivity || []} />
          </div>
        )}
      </div>
      
      {/* Hidden export container */}
      {viewMode === "graph" && (
        <div style={{ position: 'fixed', left: '-9999px', top: '0', width: '1200px' }}>
          <div id="audit-graphs-container" className="bg-background p-6 space-y-6">
            {/* Metadata Header */}
            <div className="rounded-2xl border border-border/50 bg-card/40 p-4">
              <h2 className="text-lg font-bold text-foreground mb-2">Audit Logs Export</h2>
              <div className="grid grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-muted-foreground">Date Range: </span>
                  <span className="text-foreground font-medium">{getDateRangeDisplay()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Users: </span>
                  <span className="text-foreground font-medium">
                    {userId.length > 0
                      ? userId.map(id =>
                        filterData.users.find(
                          (u: { user_id: string | number; user_name: string }) =>
                            String(u.user_id) === id
                        )?.user_name
                      ).filter(Boolean).join(', ')
                      : 'All Users'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Categories: </span>
                  <span className="text-foreground font-medium">
                    {category.length > 0 ? category.join(', ') : 'All Categories'}
                  </span>
                </div>
              </div>
            </div>

            {/* Reuse actual UI components */}
            <ActivityTimelineChart data={analytics?.activityTimeline || []} />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CategorySplitChart data={categoryCounts || {}} />
              <TopUsersChart data={analytics?.topUsers || []} />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <VMLifecycleChart data={analytics?.vmLifecycle || { requested: 0, created: 0, started: 0, stopped: 0, destroyed: 0 }} />
              <RequestManagementChart data={analytics?.requestManagement || { quotaRequests: { pending: 0, approved: 0, rejected: 0 }, runtimeExtensions: { pending: 0, approved: 0, rejected: 0 } }} />
            </div>
            
            <HourlyActivityChart data={analytics?.hourlyActivity || []} />
          </div>
        </div>
      )}
    </div>
  );
}
