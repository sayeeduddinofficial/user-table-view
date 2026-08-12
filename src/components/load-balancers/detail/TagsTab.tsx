import { useState } from "react";
import { Search } from "lucide-react";
import type { LbItem } from "@/services/lbApi";

export function TagsTab({ tags }: { tags: LbItem["lb_tags"] }) {
  const [search, setSearch] = useState("");
  const filtered = tags.filter(
    (t) => t.key.toLowerCase().includes(search.toLowerCase()) || t.value.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div className="border rounded-lg bg-card">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="font-semibold">Tags</h2>
      </div>
      <div className="p-4 border-b">
        <div className="relative max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Search tags"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border rounded-md bg-background text-sm"
          />
        </div>
      </div>
      <table className="w-full text-sm">
        <thead className="border-b">
          <tr>
            <th className="p-3 text-left">Key</th>
            <th className="p-3 text-left">Value</th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 && (
            <tr><td colSpan={2} className="p-3 text-muted-foreground">No tags.</td></tr>
          )}
          {filtered.map((t) => (
            <tr key={t.id} className="border-b">
              <td className="p-3">{t.key}</td>
              <td className="p-3">{t.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
