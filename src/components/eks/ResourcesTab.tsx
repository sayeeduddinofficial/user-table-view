import { useMemo, useState } from "react";
import { RESOURCE_DATA, RESOURCE_GROUPS } from "./eksData";
import { ResourceTable } from "./eksShared";

export function ResourcesTab() {
  const [selected, setSelected] = useState("controllerRevision");

  const currentItem = useMemo(
    () =>
      RESOURCE_GROUPS.flatMap((g) => g.items).find((x) => x.id === selected),
    [selected],
  );

  const table = RESOURCE_DATA[selected as keyof typeof RESOURCE_DATA] ?? {
    columns: [],
    rows: [],
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-4">
      <div className="bg-card border rounded-lg p-4 max-h-[70vh] overflow-y-auto">
        <h3 className="font-semibold mb-3">Resource Types</h3>

        {RESOURCE_GROUPS.map((group) => (
          <div key={group.group} className="mb-4">
            <div className="text-xs font-semibold mb-2">{group.group}</div>

            {group.items.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelected(item.id)}
                className={`block w-full text-left px-2 py-1 rounded text-sm ${
                  selected === item.id
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-accent"
                }`}
              >
                {item.name}
              </button>
            ))}
          </div>
        ))}
      </div>

      <div className="bg-card border rounded-lg p-5">
        <h2 className="font-semibold mb-4">
          {currentItem?.name} ({table.rows.length})
        </h2>

        <ResourceTable
          columns={table.columns}
          rows={table.rows}
          emptyLabel={currentItem?.name ?? ""}
        />
      </div>
    </div>
  );
}
