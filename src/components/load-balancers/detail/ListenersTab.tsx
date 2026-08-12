import type { LbItem } from "@/services/lbApi";

export function ListenersTab({ listeners }: { listeners: LbItem["listeners"] }) {
  return (
    <div className="border rounded-lg bg-card">
      <div className="flex justify-between items-center p-4 border-b">
        <h2 className="font-semibold">Listeners and rules</h2>
      </div>
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/30">
          <tr>
            <th className="p-3 text-left">Protocol:Port</th>
            <th className="p-3 text-left">Action type</th>
            <th className="p-3 text-left">Action config</th>
          </tr>
        </thead>
        <tbody>
          {listeners.length === 0 && (
            <tr><td colSpan={3} className="p-3 text-muted-foreground">No listeners configured.</td></tr>
          )}
          {listeners.map((l) => (
            <tr key={l.id} className="border-b">
              <td className="p-3">{l.protocol}:{l.port}</td>
              <td className="p-3">{l.action_type}</td>
              <td className="p-3 font-mono text-xs">{JSON.stringify(l.action_config)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
