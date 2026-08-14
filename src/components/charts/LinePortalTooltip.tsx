interface LinePortalTooltipProps {
  date: string;
  items: Array<{ name: string; value: number; color: string }>;
  x: number;
  y: number;
}

export function LinePortalTooltip({ date, items, x, y }: LinePortalTooltipProps) {
  const W = 180, GAP = 12;
  const H = 60 + (items.length * 20);
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
  
  // Position to the right of cursor
  let left = x + GAP;
  if (left + W > vw - 8) left = x - W - GAP;
  if (left < 8) left = 8;
  
  // Position above cursor (top)
  let top = y - H - GAP;
  if (top < 8) top = y + GAP; // If not enough space above, show below
  
  return (
    <div
      style={{
        position: 'fixed', left, top, width: W, zIndex: 9999,
        pointerEvents: 'none',
      }}
      className="rounded-xl border border-border/60 bg-popover/95 backdrop-blur-2xl px-3 py-2 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-150"
    >
      <div className="text-[11px] font-semibold text-foreground mb-1.5">{date}</div>
      {items.map((item, idx) => (
        <div key={idx} className="flex items-center gap-2 py-0.5">
          <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: item.color }} />
          <span className="text-[10px] text-muted-foreground flex-1">{item.name}</span>
          <span className="font-mono text-[11px] font-bold text-foreground">{item.value}</span>
        </div>
      ))}
    </div>
  );
}
