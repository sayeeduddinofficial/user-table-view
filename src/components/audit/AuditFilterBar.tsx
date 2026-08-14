import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MultiSelect } from "@/components/ui/multi-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BarChart3, Download, Filter, Search, Table as TableIcon, Users } from "lucide-react";
import type { AuditFiltersResponse } from "@/types/api";
import type { AuditDateRange, AuditViewMode } from "@/hooks/useAuditLogsPage";
import { AuditDateRangePicker } from "./AuditDateRangePicker";

interface AuditFilterBarProps {
  viewMode: AuditViewMode;
  onViewModeChange: (mode: AuditViewMode) => void;
  search: string;
  onSearchChange: (value: string) => void;
  filterData: AuditFiltersResponse;
  userId: string[];
  onUserChange: (values: string[]) => void;
  category: string[];
  onCategoryChange: (values: string[]) => void;
  dateRange: AuditDateRange;
  dateRangeOption: string;
  onPresetChange: (option: string) => void;
  onCustomRangeApply: (range: AuditDateRange) => void;
  onExport: (format: "csv" | "png" | "pdf") => void;
}

export function AuditFilterBar({
  viewMode,
  onViewModeChange,
  search,
  onSearchChange,
  filterData,
  userId,
  onUserChange,
  category,
  onCategoryChange,
  dateRange,
  dateRangeOption,
  onPresetChange,
  onCustomRangeApply,
  onExport,
}: AuditFilterBarProps) {
  return (
    <Card className="glass-panel rounded-xl">
      <CardContent className="p-4">
        <div className="flex flex-col lg:flex-row gap-4 items-center">
          {/* View toggle */}
          <div className="flex gap-1 p-1 bg-muted/30 rounded-lg">
            <Button
              variant={viewMode === "graph" ? "default" : "ghost"}
              size="sm"
              onClick={() => onViewModeChange("graph")}
              className="gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              Graph
            </Button>
            <Button
              variant={viewMode === "table" ? "default" : "ghost"}
              size="sm"
              onClick={() => onViewModeChange("table")}
              className="gap-2"
            >
              <TableIcon className="h-4 w-4" />
              Table
            </Button>
          </div>

          {/* Search */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by user, action, target..."
              className="pl-9 w-full"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
            />
          </div>

          {/* Filters */}
          <div className="flex gap-3 flex-wrap items-center">
            <AuditDateRangePicker
              dateRange={dateRange}
              dateRangeOption={dateRangeOption}
              onPresetChange={onPresetChange}
              onCustomRangeApply={onCustomRangeApply}
            />

            <MultiSelect
              options={filterData.users.map((user) => ({
                label: user.user_name,
                value: String(user.user_id),
              }))}
              selected={userId}
              onChange={onUserChange}
              placeholder="All Users"
              selectedLabel="Users"
              icon={Users}
              className="w-auto min-w-[140px]"
            />

            <MultiSelect
              options={filterData.categories.map((item) => ({ label: item, value: item }))}
              selected={category}
              onChange={onCategoryChange}
              placeholder="All Categories"
              selectedLabel="Categories"
              icon={Filter}
              className="w-auto min-w-[160px]"
            />

            <Select
              value=""
              onValueChange={(value) => onExport(value as "csv" | "png" | "pdf")}
            >
              <SelectTrigger className="w-[130px] focus:ring-0 focus:ring-offset-0 cursor-pointer hover:bg-accent hover:text-accent-foreground">
                <Download className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Export" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv" className="pl-3 cursor-pointer">
                  Export as CSV
                </SelectItem>
                <SelectItem
                  value="png"
                  className="pl-3 cursor-pointer"
                  disabled={viewMode === "table"}
                >
                  Download as PNG
                </SelectItem>
                <SelectItem
                  value="pdf"
                  className="pl-3 cursor-pointer"
                  disabled={viewMode === "table"}
                >
                  Download as PDF
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}