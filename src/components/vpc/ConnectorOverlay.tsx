import { RefObject, useEffect, useLayoutEffect, useState } from "react";

export type Connection = { from: string; to: string; keys?: string[] };

/**
 * Draws grey bezier connector lines between boxes registered in `boxRefs`,
 * highlighting them when `hovered` matches any of the connection's keys
 * (or the endpoints themselves). Pointer-events disabled so it never blocks UI.
 */
export function ConnectorOverlay({
  containerRef,
  boxRefs,
  connections,
  hovered,
  deps = [],
}: {
  containerRef: RefObject<HTMLElement>;
  boxRefs: { current: Record<string, HTMLElement | null> };
  connections: Connection[];
  hovered: string | null;
  deps?: unknown[];
}) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [paths, setPaths] = useState<{ d: string; active: boolean }[]>([]);

  const recompute = () => {
    const c = containerRef.current;
    if (!c) return;
    const cr = c.getBoundingClientRect();
    setSize({ w: cr.width, h: cr.height });
    const next: { d: string; active: boolean }[] = [];
    for (const cn of connections) {
      const a = boxRefs.current[cn.from];
      const b = boxRefs.current[cn.to];
      if (!a || !b) continue;
      const ar = a.getBoundingClientRect();
      const br = b.getBoundingClientRect();
      const x1 = ar.right - cr.left;
      const y1 = ar.top + ar.height / 2 - cr.top;
      const x2 = br.left - cr.left;
      const y2 = br.top + br.height / 2 - cr.top;
      const mx = (x1 + x2) / 2;
      const d = `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
      const active =
        !!hovered &&
        hovered !== "none" &&
        (hovered === "all" ||
          hovered === cn.from ||
          hovered === cn.to ||
          !!cn.keys?.includes(hovered));
      next.push({ d, active });
    }
    setPaths(next);
  };

  useLayoutEffect(() => {
    recompute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hovered, connections.length, ...deps]);

  useEffect(() => {
    const ro = new ResizeObserver(() => recompute());
    if (containerRef.current) ro.observe(containerRef.current);
    Object.values(boxRefs.current).forEach((el) => el && ro.observe(el));
    const onScroll = () => recompute();
    window.addEventListener("resize", onScroll);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("scroll", onScroll, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connections.length, ...deps]);

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      width={size.w}
      height={size.h}
      style={{ zIndex: 0 }}
    >
      {paths.map((p, i) => (
        <path
          key={i}
          d={p.d}
          fill="none"
          stroke={p.active ? "hsl(var(--primary))" : "rgb(148 163 184 / 0.45)"}
          strokeWidth={p.active ? 2 : 1.25}
          className="transition-[stroke,stroke-width] duration-150"
        />
      ))}
    </svg>
  );
}