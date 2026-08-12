import { TableEmptyState, TableHead } from "./eksShared";

export function TagsTab({ tags = {} }: { tags?: Record<string, string> }) {
  const entries = Object.entries(tags);

  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <h2 className="text-sm font-semibold mb-4">Tags ({entries.length})</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <TableHead columns={["Key", "Value"]} />
          <tbody>
            {entries.length === 0 ? (
              <TableEmptyState
                colSpan={2}
                title="No tags"
                description="This cluster does not have any tags."
              />
            ) : (
              entries.map(([key, value]) => (
                <tr key={key} className="border-b border-border/40 last:border-0">
                  <td className="px-4 py-3 font-mono">{key}</td>
                  <td className="px-4 py-3">{value}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}