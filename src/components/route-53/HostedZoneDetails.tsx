import { useState } from "react";
import { RefreshCw, Search, ChevronDown, ChevronLeft, ChevronRight, Plus, Trash2, Network, Layers, Globe, Clock, Pencil, } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useNavigate } from "react-router-dom";
import { Copy, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

type HostedZone = {
  id: string;
  name: string;
  type: string;
  createdBy: string;
  records: number;
  description: string;
};

const records = [
  {
    id: 1,
    recordName: "prusplunk.com",
    type: "A",
    routingPolicy: "Simple",
    difference: "-",
    alias: "Yes",
    value: "dualstack.prudent-shc-lb-64.us-east-1.elb.amazonaws.com",
    ttl: "-",
    healthCheck: "-",
    evaluateTargetHealth: "No",
    recordId: "-",
  },
  {
    id: 2,
    recordName: "prusplunk.com",
    type: "NS",
    routingPolicy: "Simple",
    difference: "-",
    alias: "No",
    value:
      "ns-1529.awsdns-63.org.\nns-371.awsdns-46.com.\nns-843.awsdns-41.net.\nns-1680.awsdns-18.co.uk.",
    ttl: "172800",
    healthCheck: "-",
    evaluateTargetHealth: "-",
    recordId: "-",
  },
  {
    id: 3,
    recordName: "prusplunk.com",
    type: "SOA",
    routingPolicy: "Simple",
    difference: "-",
    alias: "No",
    value: "ns-1529.awsdns-63.org awsdns-hostmaster.amazon.com ...",
    ttl: "900",
    healthCheck: "-",
    evaluateTargetHealth: "-",
    recordId: "-",
  },
  {
    id: 4,
    recordName: "_amazonses.prusplunk.com",
    type: "TXT",
    routingPolicy: "Simple",
    difference: "-",
    alias: "No",
    value: `"6xWMRi2zGgVgTUcTdQtkqE..."`,
    ttl: "1800",
    healthCheck: "-",
    evaluateTargetHealth: "-",
    recordId: "-",
  },
  {
    id: 5,
    recordName: "_bd2be43a2546d60f630556af7...",
    type: "CNAME",
    routingPolicy: "Simple",
    difference: "-",
    alias: "No",
    value: "_72e587358fc45316be3127...",
    ttl: "300",
    healthCheck: "-",
    evaluateTargetHealth: "-",
    recordId: "-",
  },
];

const data: HostedZone[] = [
  { id: "Z27YR27SJSDXLT", name: "prusplunk.com", type: "Public", createdBy: "Route 53", records: 28, description: "Hosted zone created by Route53 Registrar" },
  { id: "Z00619881JSGUIVHB25XT", name: "galt.net", type: "Public", createdBy: "Route 53", records: 3, description: "-" },
];


export default function HostedZoneDetails() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const rows = data.filter(x => x.name.toLowerCase().includes(search.toLowerCase()));
  const [expanded, setExpanded] = useState(false);

  const [copiedId, setCopiedId] = useState<number | null>(null);
  const copyToClipboard = async (id: number, text: string) => {
    try {
      await navigator.clipboard.writeText(text);

      setCopiedId(id);

      setTimeout(() => {
        setCopiedId(null);
      }, 2000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-4">
      <Header
        title="prusplunk.com"
        subtitle="Info"
        showSearch={false}
      />
      <div className="space-y-4 p-6">
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {/* Header */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex w-full items-center justify-between p-5 hover:bg-accent/20 transition-colors"
          >
            <div className="flex items-center gap-3">
              {expanded ? (
                <ChevronDown className="h-5 w-5 text-foreground" />
              ) : (
                <ChevronRight className="h-5 w-5 text-foreground" />
              )}

              <h2 className="text-xl font-semibold text-foreground">
                Hosted Zone Details
              </h2>
            </div>
          </button>

          {/* Content */}
          <div
            className={`grid transition-all duration-300 ${expanded
                ? "grid-rows-[1fr] opacity-100"
                : "grid-rows-[0fr] opacity-0"
              }`}
          >
            <div className="overflow-hidden">
              <div className="grid gap-8 border-t border-border p-6 lg:grid-cols-3">
                {/* Column 1 */}
                <div className="space-y-6">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Hosted zone name
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      prusplunk.com
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Hosted zone ID
                    </p>
                    <p className="mt-1 font-mono text-muted-foreground">
                      Z27YR27SJSDXLT
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Description
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      Hosted zone created by Route53 Registrar
                    </p>
                  </div>
                </div>

                {/* Column 2 */}
                <div className="space-y-6 border-l border-border pl-8">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Query log
                    </p>
                    <p className="mt-1 text-muted-foreground">-</p>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Type
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      Public Hosted Zone
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Record count
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      28
                    </p>
                  </div>
                </div>

                {/* Column 3 */}
                <div className="border-l border-border pl-8">
                  <p className="mb-3 text-sm font-semibold text-foreground">
                    Name Servers
                  </p>

                  <div className="space-y-1 text-muted-foreground">
                    <p>ns-1529.awsdns-63.org</p>
                    <p>ns-371.awsdns-46.com</p>
                    <p>ns-843.awsdns-41.net</p>
                    <p>ns-1680.awsdns-18.co.uk</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search & Actions */}
        <div>
          <h1 className="text-xl font-semibold text-foreground">Records</h1>
          <p className="text-sm text-muted-foreground">Automatic mode is the current search behevior optimized for the best results</p>
        </div>
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
                  <th className="px-5 py-3 text-left font-medium whitespace-nowrap">
                    Record Name
                  </th>

                  <th className="px-5 py-3 text-left font-medium whitespace-nowrap">
                    Type
                  </th>

                  <th className="px-5 py-3 text-left font-medium whitespace-nowrap">
                    Routing Policy
                  </th>

                  <th className="px-5 py-3 text-left font-medium whitespace-nowrap">
                    Alias
                  </th>

                  <th className="px-5 py-3 text-left font-medium whitespace-nowrap">
                    Value / Route Traffic To
                  </th>

                  <th className="px-5 py-3 text-left font-medium whitespace-nowrap">
                    TTL (Seconds)
                  </th>

                  <th className="px-5 py-3 text-left font-medium whitespace-nowrap">
                    Evaluate Target Health
                  </th>

                  <th className="px-5 py-3 text-right font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr
                    key={record.id}
                    className="border-b border-border/40 hover:bg-accent/20 transition-colors"
                  >

                    <td className="px-5 py-4 font-medium whitespace-nowrap">
                      {record.recordName}
                    </td>

                    <td className="px-5 py-4">
                      {record.type}
                    </td>

                    <td className="px-5 py-4">
                      {record.routingPolicy}
                    </td>

                    <td className="px-5 py-4">
                      {record.alias}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-start justify-between gap-2">

                        <div className="flex-1 whitespace-pre-line break-all">
                          {record.value}
                        </div>

                        <div className="relative">

                          {/* Message */}
                          {copiedId === record.id && (
                            <div className="absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-green-600 px-2 py-1 text-xs font-medium text-white shadow-lg animate-in fade-in zoom-in-95 duration-200">
                              Copied!
                            </div>
                          )}

                          <button
                            onClick={() => copyToClipboard(record.id, record.value)}
                            className={`flex h-8 w-8 items-center justify-center rounded-md transition-all duration-200 ${copiedId === record.id
                                ? "bg-green-600 text-white"
                                : "text-muted-foreground hover:bg-green-600 hover:text-white"
                              }`}
                          >
                            {copiedId === record.id ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </button>

                        </div>

                      </div>
                    </td>

                    <td className="px-5 py-4">
                      {record.ttl}
                    </td>

                    <td className="px-5 py-4">
                      {record.evaluateTargetHealth}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">

                        {/* Edit */}
                        <button
                          onClick={() => navigate("/aws/createrecord")}
                          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                          title="Edit Record"
                        >
                          <Pencil size={15} />
                        </button>

                        {/* Delete */}
                        <button
                          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          title="Delete Record"
                        >
                          <Trash2 size={15} />
                        </button>

                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  )
}
