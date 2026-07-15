import { useState } from "react";
import { RefreshCw, Search, ChevronDown, ChevronLeft, ChevronRight, Plus, Trash2, Network, Layers, Globe, Clock } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "react-router-dom";

type HostedZone = {
  id: string;
  name: string;
  type: string;
  createdBy: string;
  records: number;
  description: string;
};

const data: HostedZone[] = [
  { id: "Z27YR27SJSDXLT", name: "prusplunk.com", type: "Public", createdBy: "Route 53", records: 28, description: "Hosted zone created by Route53 Registrar" },
  { id: "Z00619881JSGUIVHB25XT", name: "galt.net", type: "Public", createdBy: "Route 53", records: 3, description: "-" },
];

export default function Route53() {
  const [search, setSearch] = useState("");

  const rows = data.filter(x => x.name.toLowerCase().includes(search.toLowerCase()));
  return (
     <div className="space-y-4">
          <Header
            title="Hosted zones (2)"
            subtitle="Automatic mode is the current search behavior optimized for best filter results."
            showSearch={false}
          />
          <div className="space-y-4 p-6">
          {/* Stats */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={<Globe className="h-4 w-4 text-primary" />}
            iconBg="bg-primary/10"
            value="20"
            label="Hosted Zones"
          />

          <StatCard
            icon={<Network className="h-4 w-4 text-cyan-400" />}
            iconBg="bg-cyan-500/10"
            value="16"
            label="Active Zones"
          />

          <StatCard
            icon={<Layers className="h-4 w-4 text-emerald-400" />}
            iconBg="bg-emerald-500/10"
            value="4"
            label="Pending Requests"
          />

          <StatCard
            icon={<Clock className="h-4 w-4 text-amber-400" />}
            iconBg="bg-amber-500/10"
            value="3"
            label="Failed Requests"
          />
        </div>
          </div>
          <div className="space-y-4 p-6">
  
  {/* Search & Actions */}
  <div className="flex items-center gap-3">
    <div className="relative flex-1">
      <Search
        size={14}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        placeholder="Filter records by property or value..."
        className="pl-9 bg-card/50 border-border/50"
      />
    </div>

    <Button
      variant="outline"
      size="icon"
      className="rounded-full shrink-0"
    >
      <RefreshCw size={14} />
    </Button>

    <Button
      variant="outline"
      className="shrink-0"
      disabled
    >
      View Details
    </Button>

    <Button
      variant="outline"
      className="shrink-0"
      disabled
    >
      Edit
    </Button>

    <Button
      variant="outline"
      className="shrink-0"
      disabled
    >
      Delete
    </Button>

    <Link to="/aws/createrecord">
  <Button className="bg-primary hover:bg-primary/90 text-white shrink-0">
    <Plus size={14} className="mr-1.5" />
    Create Record
  </Button>
</Link>
  </div>

  {/* Table */}
  <div className="rounded-lg border border-border/50 bg-card/50 backdrop-blur overflow-hidden">
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[1200px]">
        <thead>
          <tr className="text-xs uppercase tracking-wide text-muted-foreground border-b border-border/50">
            <th className="px-5 py-3 w-10">
              <Checkbox />
            </th>

            <th className="px-5 py-3 text-left font-medium whitespace-nowrap">
              Hosted Zone Name
            </th>

            <th className="px-5 py-3 text-left font-medium whitespace-nowrap">
              Type
            </th>

            <th className="px-5 py-3 text-left font-medium whitespace-nowrap">
              Created By
            </th>

            <th className="px-5 py-3 text-left font-medium whitespace-nowrap">
              Record Count
            </th>

            <th className="px-5 py-3 text-left font-medium whitespace-nowrap">
              Description
            </th>

            <th className="px-5 py-3 text-left font-medium whitespace-nowrap">
              Hosted Zone ID
            </th>

            <th className="px-5 py-3 text-right font-medium">
              Actions
            </th>
          </tr>
        </thead>

        <tbody>
          <tr className="border-b border-border/40 hover:bg-accent/20 transition-colors">
            <td className="px-5 py-4">
              <Checkbox />
            </td>

            <td className="px-5 py-4">
              <Link
                to="/aws/hostedzonedetails"
                className="font-medium text-primary hover:underline"
              >
                prusplunk.com
              </Link>
            </td>

            <td className="px-5 py-4">
              Public
            </td>

            <td className="px-5 py-4">
              Route 53
            </td>

            <td className="px-5 py-4">
              28
            </td>

            <td className="px-5 py-4 text-muted-foreground">
              Hosted zone created by Route53 Registrar
            </td>

            <td className="px-5 py-4 font-mono text-muted-foreground">
              Z27YR27SJSDXLT
            </td>

            <td className="px-5 py-4 text-right">
              <button className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                <Trash2 size={15} />
              </button>
            </td>
          </tr>

          <tr className="border-b border-border/40 hover:bg-accent/20 transition-colors">
            <td className="px-5 py-4">
              <Checkbox />
            </td>

            <td className="px-5 py-4">
              <Link
              to="/aws/hostedzonedetails"
                className="font-medium text-primary hover:underline"
              >
                galt.net
              </Link>
            </td>

            <td className="px-5 py-4">
              Public
            </td>

            <td className="px-5 py-4">
              Route 53
            </td>

            <td className="px-5 py-4">
              3
            </td>

            <td className="px-5 py-4 text-muted-foreground">
              -
            </td>

            <td className="px-5 py-4 font-mono text-muted-foreground">
              Z00619881JSGUIVHB25XT
            </td>

            <td className="px-5 py-4 text-right">
              <button className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                <Trash2 size={15} />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</div>
      
    </div>
  )
}

function StatCard({
  icon,
  iconBg,
  value,
  label,
}: {
  icon: React.ReactNode;
  iconBg: string;
  value: number | string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-card/50 backdrop-blur px-4 py-3 hover:border-primary/30 transition-colors">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconBg}`}
      >
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground leading-tight">
          {value}
        </p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
