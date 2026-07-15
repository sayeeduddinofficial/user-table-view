import { useEffect, useState, useRef, useCallback } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));
const PERIODS = ["AM", "PM"];

type Part = "hour" | "minute" | "period";

interface TimeValue {
  hour: string;
  minute: string;
  period: string;
}

interface TimePickerProps {
  value: TimeValue;
  onChange: (h: string, m: string, p: string) => void;
  idPrefix?: string;
}


export function TimePicker({ value, onChange, idPrefix = "tp" }: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const [focusedPart, setFocusedPart] = useState<Part | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hourRef = useRef<HTMLSpanElement>(null);
  const minuteRef = useRef<HTMLSpanElement>(null);
  const periodRef = useRef<HTMLSpanElement>(null);
  const typingBuffer = useRef<{ [key in Part]?: string }>({});
  // ── helpers ──────────────────────────────────────────────────────────────

  function getList(part: Part) {
    return part === "hour" ? HOURS : part === "minute" ? MINUTES : PERIODS;
  }

  function getCurrent(part: Part) {
    return part === "hour" ? value.hour : part === "minute" ? value.minute : value.period;
  }

  function emit(part: Part, val: string) {
    onChange(
      part === "hour"   ? val : value.hour,
      part === "minute" ? val : value.minute,
      part === "period" ? val : value.period,
    );
  }

  function step(part: Part, dir: 1 | -1) {
    const list = getList(part);
    const cur  = getCurrent(part);
    let idx    = list.indexOf(cur) + dir;
    if (idx < 0) idx = list.length - 1;
    if (idx >= list.length) idx = 0;
    emit(part, list[idx]);
    scrollToValue(part, list[idx]);
  }

  function scrollToValue(part: Part, val: string) {
    const list = getList(part);
    const idx  = list.indexOf(val);
    const el   = document.getElementById(`${idPrefix}-${part}`);
    if (el && idx >= 0) {
      el.scrollTop = idx * ITEM_H;
    }
  }

  const ITEM_H = 40;

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setFocusedPart(null);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Keyboard: arrow up/down → step; arrow left/right → move focus
  useEffect(() => {
    if (!focusedPart) return;

      function handler(e: KeyboardEvent) {
          if (e.key === "ArrowUp") {
              e.preventDefault();
              step(focusedPart!, -1);
          } else if (e.key === "ArrowDown") {
              e.preventDefault();
              step(focusedPart!, 1);
          } else if (e.key === "ArrowRight") {
              e.preventDefault();
              const order: Part[] = ["hour", "minute", "period"];
              const idx = order.indexOf(focusedPart!);
              const next = order[(idx + 1) % order.length];

              setFocusedPart(next);
              if (next === "hour") hourRef.current?.focus();
              if (next === "minute") minuteRef.current?.focus();
              if (next === "period") periodRef.current?.focus();
          } else if (e.key === "ArrowLeft") {
              e.preventDefault();
              const order: Part[] = ["hour", "minute", "period"];
              const idx = order.indexOf(focusedPart!);
              const prev = order[(idx - 1 + order.length) % order.length];
              setFocusedPart(prev);

              if (prev === "hour") hourRef.current?.focus();
              if (prev === "minute") minuteRef.current?.focus();
              if (prev === "period") periodRef.current?.focus();
          } else if (e.key === "Escape") {
              setOpen(false);
              setFocusedPart(null);
          } else if (/^[0-9]$/.test(e.key)) {
            const part = focusedPart!;
            const prev = typingBuffer.current[part] || "";

            const next = (prev + e.key).slice(-2);
            typingBuffer.current[part] = next;

            if (part === "hour") {
              if (Number(next) >= 1 && Number(next) <= 12) {
                onChange(next.padStart(2, "0"), value.minute, value.period);
              }
            }

            if (part === "minute") {
              if (Number(next) >= 0 && Number(next) <= 59) {
                onChange(value.hour, next.padStart(2, "0"), value.period);
              }
            }

            // Reset buffer after short delay (like real inputs)
            setTimeout(() => {
              typingBuffer.current[part] = "";
            }, 1000);
          }
          else if (e.key.toLowerCase() === "a") {
              onChange(value.hour, value.minute, "AM");
          }
          else if (e.key.toLowerCase() === "p") {
              onChange(value.hour, value.minute, "PM");
          } else if (e.key === "Backspace") {
            typingBuffer.current[focusedPart!] = "";
          }
          else if (e.key === "Tab") {
              setOpen(false);
              setFocusedPart(null);
              return; // allow normal tab navigation
          }
    }

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [focusedPart, value]);

  // Scroll-snap → update value (with debouncing to prevent excessive updates)
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Column component
  function Column({ part }: { part: Part }) {
    const list = getList(part);
    const cur  = getCurrent(part);
    const isPeriod = part === "period";
    const columnRef = useRef<HTMLDivElement>(null);
    const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Handle scroll events smoothly
    const handleColumnScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
      
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      scrollTimeoutRef.current = setTimeout(() => {
        const el = e.currentTarget;
        const idx = Math.round(el.scrollTop / ITEM_H);
        const clamped = Math.min(idx, list.length - 1);
        if (list[clamped] !== getCurrent(part)) {
            if (part === "hour") {
                onChange(list[clamped], value.minute, value.period);
            } else if (part === "minute") {
                onChange(value.hour, list[clamped], value.period);
            } else {
                onChange(value.hour, value.minute, list[clamped]);
            }
        }
      }, 100);
    }, [part, list, cur]);

    useEffect(() => {
      if (!open) return;

      if (!columnRef.current) return;

      const idx = list.indexOf(cur);
      if (idx >= 0) {
        columnRef.current.scrollTop = idx * ITEM_H;
      }

    }, [open]);

    // Cleanup scroll timeout on unmount
    useEffect(() => {
      return () => {
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
      };
    }, []);

    return (
      <div className="flex flex-col items-center gap-1">
        {/* Scrollable list */}
        <div
          ref={columnRef}
          id={`${idPrefix}-${part}`}
          onScroll={handleColumnScroll}
          style={{
            height: ITEM_H * 3,
            width: isPeriod ? 50 : 44,
            overflowY: "scroll",
            scrollSnapType: "y mandatory",
            scrollBehavior: "auto",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
          className="rounded-md border border-border/50 bg-muted/30 shadow-inner [&::-webkit-scrollbar]:hidden"
        >
          {list.map((v, idx) => {
            const selected = v === cur;
            return (
              <div
                key={`${v}-${idx}`}
                onClick={() => {
                  emit(part, v);
                  setFocusedPart(part);
                  if (columnRef.current) {
                    columnRef.current.scrollTop = idx * ITEM_H;
                  }
                }}
                style={{ 
                  scrollSnapAlign: "center", 
                  height: ITEM_H,
                  scrollSnapStop: "always"
                }}
                className={cn(
                  "flex items-center justify-center text-sm cursor-pointer select-none transition-all duration-150 font-medium",
                  selected
                    ? isPeriod
                      ? "bg-blue-600 text-white shadow-md"
                      : "bg-blue-500 text-white shadow-md"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                {String(v).padStart(2, "0")}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative inline-block w-full">
      {/* Trigger — the time display */}
      <div className="flex items-center justify-between gap-2 border border-border rounded-md px-3 py-2.5 text-sm bg-background min-w-[150px]">  <div className="flex items-center gap-0.5 cursor-pointer flex-1">
          {/* Hour segment */}
          <span
            ref={hourRef}
            tabIndex={0}
            onFocus={() => { setFocusedPart("hour"); typingBuffer.current["hour"] = ""; }}
            onClick={() => { setFocusedPart("hour"); }}
            className={cn(
              "px-2 py-1 rounded transition-all outline-none font-semibold cursor-pointer",
              focusedPart === "hour"
                ? "bg-blue-600 text-white"
                : "hover:bg-muted"
            )}
          >
            {value.hour}
          </span>

          <span className="text-muted-foreground px-0.5">:</span>

          {/* Minute segment */}
          <span
            ref={minuteRef}
            tabIndex={0}
            onFocus={() => { setFocusedPart("minute"); typingBuffer.current["minute"] = ""; }}
            onClick={() => { setFocusedPart("minute");}}
            className={cn(
              "px-2 py-1 rounded transition-all outline-none font-semibold cursor-pointer",
              focusedPart === "minute"
                ? "bg-blue-600 text-white"
                : "hover:bg-muted"
            )}
          >
            {value.minute}
          </span>

          {/* Period segment */}
          <span
            ref={periodRef}
            tabIndex={0}
            onFocus={() => { setFocusedPart("period");}}
            onClick={() => { setFocusedPart("period");}}
            className={cn(
              "px-2 py-1 rounded transition-all outline-none font-semibold text-xs cursor-pointer",
              focusedPart === "period" 
                ? "bg-blue-600 text-white"
                : "hover:bg-muted"
            )}
          >
            {value.period}
          </span>
        </div>

        {/* Clock icon button */}
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setFocusedPart(prev => prev ||"hour");
          
          }}
          className="p-1.5 rounded hover:bg-muted transition-colors flex-shrink-0 text-muted-foreground hover:text-foreground"
          aria-label="Open time picker"
        >
          <Clock className="w-4 h-4" />
        </button>
      </div>

      {/* Dropdown */}
      {open && (
        <div
          ref={dropdownRef}
          className="absolute z-50 top-full mt-2 left-0 bg-popover border border-border rounded-lg shadow-xl p-4 flex items-stretch gap-2 backdrop-blur-sm"
          style={{ minWidth: 180 }}
          onClick={(e) => e.stopPropagation()}
        >
          <Column part="hour" />
          <div className="flex items-center px-1 text-muted-foreground font-bold text-lg">:</div>
          <Column part="minute" />
          <div className="w-1" />
          <Column part="period" />
        </div>
      )}
    </div>
  );
}