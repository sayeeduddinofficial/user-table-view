import { CLUSTER } from "./eksData";

export function TagsTab() {
  const tags = Object.entries(CLUSTER.tags);
  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <h2 className="text-sm font-semibold mb-4">Tags ({tags.length})</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-muted-foreground border-b border-border">
              <th className="px-4 py-2 text-left font-medium">Key</th>
              <th className="px-4 py-2 text-left font-medium">Value</th>
            </tr>
          </thead>
          <tbody>
            {tags.map(([k, v]) => (
              <tr key={k} className="border-b border-border/40 last:border-0">
                <td className="px-4 py-3 font-mono">{k}</td>
                <td className="px-4 py-3">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
