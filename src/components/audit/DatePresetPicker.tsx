import { useState } from 'react';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, ChevronDown, ChevronRight, ArrowLeft } from 'lucide-react';

interface DatePresetPickerProps {
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
}

export function DatePresetPicker({ dateRange, onDateRangeChange }: DatePresetPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [hoveredDate, setHoveredDate] = useState<Date | undefined>(undefined);
  const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(dateRange);
  const [selectedPreset, setSelectedPreset] = useState<string>('thisMonth');

  const getDateRangeDisplay = () => {
    if (selectedPreset === 'custom' && dateRange?.from && dateRange?.to) {
      return `${format(dateRange.from, 'LLL dd y')} - ${format(dateRange.to, 'LLL dd y')}`;
    }
    
    const options: Record<string, string> = {
      last7days: 'Last 7 days',
      last30days: 'Last 30 days',
      thisMonth: format(new Date(), 'MMMM yyyy'),
      lastMonth: 'Last month',
      last3months: 'Last 3 months',
      last6months: 'Last 6 months',
      thisYear: 'This year',
    };
    
    return options[selectedPreset] || format(new Date(), 'MMMM yyyy');
  };

  const handlePresetChange = (preset: string) => {
    setSelectedPreset(preset);
    
    const today = new Date();
    let from: Date | undefined;
    let to: Date | undefined = today;
    
    switch (preset) {
      case 'last7days':
        from = new Date(today);
        from.setDate(from.getDate() - 6);
        break;
      case 'last30days':
        from = new Date(today);
        from.setDate(from.getDate() - 29);
        break;
      case 'thisMonth':
        from = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case 'lastMonth':
        from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        to = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case 'last3months':
        from = new Date(today);
        from.setMonth(from.getMonth() - 3);
        break;
      case 'last6months':
        from = new Date(today);
        from.setMonth(from.getMonth() - 6);
        break;
      case 'thisYear':
        from = new Date(today.getFullYear(), 0, 1);
        break;
      default:
        from = undefined;
        to = undefined;
    }
    
    onDateRangeChange(from && to ? { from, to } : undefined);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-auto min-w-[220px] justify-start font-normal">
          <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
          <span className="flex-1 text-left text-sm">{getDateRangeDisplay()}</span>
          <ChevronDown className="h-4 w-4 flex-shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        {showCalendar ? (
          <div className="flex flex-col">
            <div className="flex items-center gap-2 p-2 border-b">
              <button
                onClick={() => {
                  setShowCalendar(false);
                  setTempDateRange(undefined);
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
              defaultMonth={tempDateRange?.from || dateRange?.from}
              selected={tempDateRange}
              onSelect={(range) => {
                setTempDateRange(range);
                if (range?.from && range?.to) {
                  setHoveredDate(undefined);
                }
              }}
              numberOfMonths={2}
              className="p-2"
              modifiers={{
                hoverRange: hoveredDate && tempDateRange?.from && !tempDateRange?.to
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
                hoverEnd: hoveredDate && tempDateRange?.from && !tempDateRange?.to ? hoveredDate : undefined,
              }}
              modifiersClassNames={{
                hoverRange: "bg-accent/30",
                hoverEnd: "bg-primary text-primary-foreground",
              }}
              onDayMouseEnter={(day) => {
                if (tempDateRange?.from && !tempDateRange?.to) {
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
                  if (tempDateRange?.from && tempDateRange?.to) {
                    onDateRangeChange(tempDateRange);
                    setSelectedPreset('custom');
                    setIsOpen(false);
                    setShowCalendar(false);
                  }
                }}
                disabled={!tempDateRange?.from || !tempDateRange?.to}
                className="flex-1 h-8 text-sm"
              >
                Apply
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowCalendar(false);
                  setTempDateRange(undefined);
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
              onClick={() => handlePresetChange('last7days')}
              className="px-3 py-2 text-sm text-left hover:bg-accent hover:text-accent-foreground rounded-sm"
            >
              Last 7 days
            </button>
            <button
              onClick={() => handlePresetChange('last30days')}
              className="px-3 py-2 text-sm text-left hover:bg-accent hover:text-accent-foreground rounded-sm"
            >
              Last 30 days
            </button>
            <button
              onClick={() => {
                setShowCalendar(true);
                setTempDateRange(undefined);
              }}
              className="px-3 py-2 text-sm text-left hover:bg-accent hover:text-accent-foreground rounded-sm flex items-center justify-between"
            >
              <span>Custom date range</span>
              <ChevronRight className="h-4 w-4 opacity-50" />
            </button>
            <button
              onClick={() => handlePresetChange('thisMonth')}
              className="px-3 py-2 text-sm text-left hover:bg-accent hover:text-accent-foreground rounded-sm"
            >
              {format(new Date(), 'MMMM yyyy')}
            </button>
            <button
              onClick={() => handlePresetChange('lastMonth')}
              className="px-3 py-2 text-sm text-left hover:bg-accent hover:text-accent-foreground rounded-sm"
            >
              Last month
            </button>
            <button
              onClick={() => handlePresetChange('last3months')}
              className="px-3 py-2 text-sm text-left hover:bg-accent hover:text-accent-foreground rounded-sm"
            >
              Last 3 months
            </button>
            <button
              onClick={() => handlePresetChange('last6months')}
              className="px-3 py-2 text-sm text-left hover:bg-accent hover:text-accent-foreground rounded-sm"
            >
              Last 6 months
            </button>
            <button
              onClick={() => handlePresetChange('thisYear')}
              className="px-3 py-2 text-sm text-left hover:bg-accent hover:text-accent-foreground rounded-sm"
            >
              This year
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
