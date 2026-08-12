import type { LbItem } from "@/services/lbApi";

export function ResourceTab({ listeners }: { listeners: LbItem["listeners"] }) {
  return (
    <div className="overflow-auto">
      <div className="flex gap-6 min-w-[600px]">
        <div className="border rounded-lg p-5 w-64">
          <h3 className="font-semibold mb-3">Listeners</h3>
          {listeners.map((l) => <p key={l.id}>{l.protocol}:{l.port}</p>)}
        </div>
        <div className="border rounded-lg p-5 w-64">
          <h3 className="font-semibold mb-3">Actions</h3>
          {listeners.map((l) => <p key={l.id}>{l.action_type}</p>)}
        </div>
      </div>
    </div>
  );
}
