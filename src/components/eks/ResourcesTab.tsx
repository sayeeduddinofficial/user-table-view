import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RESOURCE_GROUPS } from "./eksData";
import { ResourceTable } from "./eksShared";

export function ResourcesTab() {
  const [selected, setSelected] = useState<string>("ControllerRevision");
  const current = RESOURCE_GROUPS.flatMap((g) => g.items).find(
    (i) => i.name === selected,
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-4">
      <div className="bg-card border border-border rounded-lg p-4 max-h-[70vh] overflow-y-auto">
        <h3 className="text-sm font-semibold mb-3">Resource types</h3>
        <div className="space-y-4">
          {RESOURCE_GROUPS.map((g) => (
            <div key={g.group}>
              <div className="text-xs font-semibold text-foreground mb-1.5">
                {g.group}
              </div>
              <ul className="space-y-1">
                {g.items.map((it) => (
                  <li key={it.name}>
                    <button
                      onClick={() => setSelected(it.name)}
                      className={`text-left text-sm w-full px-2 py-1 rounded transition-colors ${
                        selected === it.name
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-primary/90 hover:bg-accent/40"
                      }`}
                    >
                      {it.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold">
            {current?.name}{" "}
            <span className="text-muted-foreground font-normal">
              ({current?.rows.length ?? 0})
            </span>
          </h2>
          <Button variant="outline" size="sm">
            View details
          </Button>
        </div>
        <ResourceTable
          columns={current?.columns ?? []}
          rows={current?.rows ?? []}
          emptyLabel={current?.name ?? ""}
        />
      </div>
    </div>
  );
}
