import type { LbItem } from "@/services/lbApi";

export function NetworkTab({ subnets }: { subnets: LbItem["subnets"] }) {
  return (
    <div className="border rounded-lg p-5 bg-card">
      <h2 className="font-semibold text-lg mb-5">Availability Zones and subnets</h2>
      <table className="w-full text-sm">
        <thead className="border-b">
          <tr>
            <th className="p-3 text-left">Zone</th>
            <th className="p-3 text-left">Subnet</th>
            <th className="p-3 text-left">Private IPv4</th>
            <th className="p-3 text-left">IP assignment</th>
          </tr>
        </thead>
        <tbody>
          {subnets.map((s) => (
            <tr key={s.id} className="border-b">
              <td className="p-3">{s.availability_zone}</td>
              <td className="p-3">{s.subnet_id}</td>
              <td className="p-3">{s.private_ipv4_address || "-"}</td>
              <td className="p-3">{s.ip_assignment_type}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
