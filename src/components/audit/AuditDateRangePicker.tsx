import { useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, CalendarIcon, ChevronDown, ChevronRight } from "lucide-react";
import type { AuditDateRange } from "@/hooks/useAuditLogsPage";
import { getDateRangeDisplay, getHoverRangeDays } from "./auditUtils";

const EMPTY_RANGE: AuditDateRange = { from: undefined, to: undefined };

const PRESETS: Array<{ value: string; label: string }> = [
  { value: "last7days", label: "Last 7 days" },
  { value: "last30days", label: "Last 30 days" },
];

const TRAILING_PRESETS: Array<{ value: string; label: string }> = [
  { value: "thisMonth", label: format(new Date(), "MMMM yyyy") },
  { value: "lastMonth", label: "Last month" },
  { value: "last3months", label: "Last 3 months" },
  { value: "last6months", label: "Last 6 months" },
  { value: "thisYear", label: "This year" },
];

const PRESET_BUTTON_CLASS =
  "px-3 py-2 text-sm text-left rounded-sm hover:bg-accent hover:text-accent-foreground";

const CALENDAR_CLASS_NAMES = {
  months: "flex flex-col sm:flex-row space-y-2 sm:space-x-2 sm:space-y-0",
  month: "space-y-2",
  caption: "flex justify-center pt-1 relative items-center",
  caption_label: "text-xs font-medium",
  head_cell: "text-muted-foreground rounded-md w-7 font-normal text-[0.65rem]",
  cell: "h-7 w-7 text-center text-xs p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
  day: "h-7 w-7 p-0 font-normal text-xs aria-selected:opacity-100",
  day_today: "",
  day_range_middle:
    "aria-selected:bg-primary aria-selected:text-primary-foreground rounded-none",
  day_selected:
    "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
  day_range_start: "rounded-l-md",
  day_range_end: "rounded-r-md",
  row: "flex w-full mt-1",
};

interface AuditDateRangePickerProps {
  dateRange: AuditDateRange;
  dateRangeOption: string;
  onPresetChange: (option: string) => void;
  onCustomRangeApply: (range: AuditDateRange) => void;
}

export function AuditDateRangePicker({
  dateRange,
  dateRangeOption,
  onPresetChange,
  onCustomRangeApply,
}: AuditDateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [hoveredDate, setHoveredDate] = useState<Date | undefined>(undefined);
  const [tempRange, setTempRange] = useState<AuditDateRange>(EMPTY_RANGE);

  const closeCalendarView = () => {
    setShowCalendar(false);
    setTempRange(EMPTY_RANGE);
    setHoveredDate(undefined);
  };

  const handlePresetClick = (option: string) => {
    onPresetChange(option);
    setIsOpen(false);
  };

  const handleApply = () => {
    if (!tempRange.from || !tempRange.to) return;
    onCustomRangeApply(tempRange);
    setIsOpen(false);
    setShowCalendar(false);
  };

  const isSelectingRange = Boolean(hoveredDate && tempRange.from && !tempRange.to);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-auto min-w-[220px] justify-start font-normal">
          <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
          <span className="flex-1 text-left text-sm">
            {getDateRangeDisplay(dateRangeOption, dateRange)}
          </span>
          <ChevronDown className="h-4 w-4 flex-shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="center">
        {showCalendar ? (
          <div className="flex flex-col">
            <div className="flex items-center gap-2 p-2 border-b">
              <button
                type="button"
                onClick={closeCalendarView}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
            </div>
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={tempRange.from || dateRange.from}
              selected={tempRange}
              onSelect={(range) => {
                setTempRange({ from: range?.from, to: range?.to });
                if (range?.from && range?.to) setHoveredDate(undefined);
              }}
              numberOfMonths={2}
              className="p-2"
              modifiers={{
                hoverRange:
                  isSelectingRange && tempRange.from && hoveredDate
                    ? getHoverRangeDays(tempRange.from, hoveredDate)
                    : [],
                ...(isSelectingRange && hoveredDate ? { hoverEnd: hoveredDate } : {}),
              }}
              modifiersClassNames={{
                hoverRange: "bg-accent/30",
                hoverEnd: "bg-primary text-primary-foreground",
              }}
              onDayMouseEnter={(day) => {
                if (tempRange.from && !tempRange.to) setHoveredDate(day);
              }}
              onDayMouseLeave={() => setHoveredDate(undefined)}
              disabled={(date) => date > new Date()}
              classNames={CALENDAR_CLASS_NAMES}
            />
            <div className="flex gap-2 p-1.5 border-t">
              <Button
                onClick={handleApply}
                disabled={!tempRange.from || !tempRange.to}
                className="flex-1 h-8 text-sm"
              >
                Apply
              </Button>
              <Button variant="outline" onClick={closeCalendarView} className="flex-1 h-8 text-sm">
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1 p-2">
            {PRESETS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => handlePresetClick(value)}
                className={PRESET_BUTTON_CLASS}
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setShowCalendar(true);
                setTempRange(dateRange);
              }}
              className={`${PRESET_BUTTON_CLASS} flex items-center justify-between`}
            >
              <span>Custom date range</span>
              <ChevronRight className="h-4 w-4 opacity-50" />
            </button>
            {TRAILING_PRESETS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => handlePresetClick(value)}
                className={PRESET_BUTTON_CLASS}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}