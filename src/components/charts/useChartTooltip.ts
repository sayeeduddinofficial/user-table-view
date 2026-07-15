import { useState } from 'react';

interface TooltipData {
  date: string;
  items: Array<{ name: string; value: number; color: string }>;
  x: number;
  y: number;
}

export function useChartTooltip() {
  const [tooltipData, setTooltipData] = useState<TooltipData | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: any, formatDate?: (date: string) => string) => {
    if (e && e.activeLabel && e.activePayload) {
      const items = e.activePayload
        .filter((p: any) => p.value !== undefined)
        .map((p: any) => ({
          name: p.name,
          value: p.value,
          color: p.color,
        }));
      
      if (items.length > 0) {
        setTooltipData({
          date: formatDate ? formatDate(e.activeLabel) : e.activeLabel,
          items,
          x: mousePos.x,
          y: mousePos.y,
        });
      }
    }
  };

  const handleContainerMouseMove = (e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  const clearTooltip = () => {
    setTooltipData(null);
  };

  return {
    tooltipData,
    handleMouseMove,
    handleContainerMouseMove,
    clearTooltip,
  };
}
