import { useEffect, useState } from "react";
import { RefreshCw, Search, ChevronDown, ChevronLeft, ChevronRight, Plus, Trash2, Network, Layers, Globe, Clock, Pencil, Loader2 } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { Copy, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { fetchRoute53Records, deleteRoute53Record, Route53RecordItem } from "@/services/route53Api";
import { useDialog } from "../ui/dialog-context";
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
  // { id: "Z00619881JSGUIVHB25XT", name: "galt.net", type: "Public", createdBy: "Route 53", records: 3, description: "-" },
];



const ZONE_NAME = "prusplunk.com"; // matches the Header title below; swap for a route param if available

function formatRecordValue(record: Route53RecordItem): string {
  if (record.is_alias) {
    return record.alias_dns_name ?? "-";
  }
  if (!record.value) return "-";
  try {
    const parsed = JSON.parse(record.value);
    if (Array.isArray(parsed)) return parsed.join("\n");
  } catch {
    // not JSON — plain string value, fall through
  }
  return record.value;
}

export default function HostedZoneDetails() {

  const [dialog, setDialog] = useState<{
    icon?: "destroy" | "retry" | "info";
    title: string;
    description?: string;
    onConfirm?: () => void;
  } | null>(null);

  const handleClose = (confirmed: boolean) => {
    if (confirmed) {
      dialog?.onConfirm?.();
    }
    setDialog(null);
  };
  const { alert } = useDialog()
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(false);

  const [records, setRecords] = useState<Route53RecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const rows = data.filter(x => x.name.toLowerCase().includes(search.toLowerCase()));

  const loadRecords = async () => {
    setLoading(true);
    setError(null);
    try {
      const all = await fetchRoute53Records();
      setRecords(all.filter(r => r.hosted_zone_name === ZONE_NAME));
    } catch (err) {
      console.error(err);
      setError("Failed to load DNS records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, []);

  const copyToClipboard = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = (record: Route53RecordItem) => {
    setDialog({
      icon: "destroy",
      title: `Delete record "${record.record_name}"?`,
      description: "This cannot be undone.",
      onConfirm: async () => {
        setDeletingId(record.id);
        try {
          const result = await deleteRoute53Record(record.id);
          alert({ title: "DNS record deleted", description: `"${record.record_name}" was deleted successfully.`, severity: "success" });
          setRecords(prev => prev.filter(r => r.id !== record.id));
          const requestId = result.data?.requestId;
          if (requestId) {
            const consoleSearch = new URLSearchParams({
              request: requestId,
              service: "route53-service",
              operation: "delete",
            }).toString();
            navigate(`/console?${consoleSearch}`, { replace: true });
          }
        } catch (err) {
          console.error(err);
          alert({ title: "Failed to delete DNS record", description: "Please try again.", severity: "error" });
        } finally {
          setDeletingId(null);
        }
      },
    });
  };

  const filteredRecords = records.filter(r => {
    const query = search.toLowerCase();
    const aliasLabel = r.is_alias ? "yes" : "no";
    const valueOrTarget = formatRecordValue(r).toLowerCase();

    return (
      r.record_name.toLowerCase().includes(query) ||
      r.request_id?.toLowerCase().includes(query) ||
      r.record_type?.toLowerCase().includes(query) ||
      r.routing_policy?.toLowerCase().includes(query) ||
      aliasLabel.includes(query) ||
      valueOrTarget.includes(query)
    );
  });

  return (
    <div className="space-y-4">
      <Header
        title={ZONE_NAME}
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

          {/* Content — still static, no backend endpoint for zone metadata was provided */}
          <div
            className={`grid transition-all duration-300 ${expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
          >
            <div className="overflow-hidden">
              <div className="grid gap-8 border-t border-border p-6 lg:grid-cols-3">
                <div className="space-y-6">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Hosted zone name</p>
                    <p className="mt-1 text-muted-foreground">prusplunk.com</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Hosted zone ID</p>
                    <p className="mt-1 font-mono text-muted-foreground">Z27YR27SJSDXLT</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Description</p>
                    <p className="mt-1 text-muted-foreground">Hosted zone created by Route53 Registrar</p>
                  </div>
                </div>
                <div className="space-y-6 border-l border-border pl-8">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Query log</p>
                    <p className="mt-1 text-muted-foreground">-</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Type</p>
                    <p className="mt-1 text-muted-foreground">Public Hosted Zone</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Record count</p>
                    <p className="mt-1 text-muted-foreground">{records.length}</p>
                  </div>
                </div>
                <div className="border-l border-border pl-8">
                  <p className="mb-3 text-sm font-semibold text-foreground">Name Servers</p>
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
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Filter records by property or value..."
              className="pl-9 bg-card/50 border-border/50"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Button
            variant="outline"
            size="icon"
            className="rounded-full shrink-0"
            onClick={loadRecords}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
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
                  <th className="px-5 py-3 text-left font-medium whitespace-nowrap">Request ID</th>
                  <th className="px-5 py-3 text-left font-medium whitespace-nowrap">Record Name</th>
                  <th className="px-5 py-3 text-left font-medium whitespace-nowrap">Type</th>
                  <th className="px-5 py-3 text-left font-medium whitespace-nowrap">Routing Policy</th>
                  <th className="px-5 py-3 text-left font-medium whitespace-nowrap">Alias</th>
                  <th className="px-5 py-3 text-left font-medium whitespace-nowrap">Value / Route Traffic To</th>
                  <th className="px-5 py-3 text-left font-medium whitespace-nowrap">TTL (Seconds)</th>
                  <th className="px-5 py-3 text-left font-medium whitespace-nowrap">Evaluate Target Health</th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={8} className="px-5 py-10 text-center text-muted-foreground">
                      <Loader2 className="inline h-4 w-4 animate-spin mr-2" />
                      Loading records...
                    </td>
                  </tr>
                )}

                {!loading && error && (
                  <tr>
                    <td colSpan={8} className="px-5 py-10 text-center text-destructive">
                      {error}
                    </td>
                  </tr>
                )}

                {!loading && !error && filteredRecords.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-5 py-10 text-center text-muted-foreground">
                      No DNS records found for this hosted zone.
                    </td>
                  </tr>
                )}

                {!loading && !error && filteredRecords.map((record) => (
                  <tr
                    key={record.id}
                    className="border-b border-border/40 hover:bg-accent/20 transition-colors"
                  >
                    <td className="px-5 py-4 font-medium whitespace-nowrap">
                      {record.request_id}
                    </td>
                    <td className="px-5 py-4 font-medium whitespace-nowrap">
                      {record.record_name}
                    </td>
                    <td className="px-5 py-4">{record.record_type}</td>
                    <td className="px-5 py-4">{record.routing_policy}</td>
                    <td className="px-5 py-4">{record.is_alias ? "Yes" : "No"}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 whitespace-pre-line break-all">
                          {formatRecordValue(record)}
                        </div>
                        <div className="relative">
                          {copiedId === record.id && (
                            <div className="absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-green-600 px-2 py-1 text-xs font-medium text-white shadow-lg animate-in fade-in zoom-in-95 duration-200">
                              Copied!
                            </div>
                          )}
                          <button
                            onClick={() => copyToClipboard(record.id, formatRecordValue(record))}
                            className={`flex h-8 w-8 items-center justify-center rounded-md transition-all duration-200 ${copiedId === record.id
                              ? "bg-green-600 text-white"
                              : "text-muted-foreground hover:bg-green-600 hover:text-white"
                              }`}
                          >
                            {copiedId === record.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">{record.ttl ?? "-"}</td>
                    <td className="px-5 py-4">{record.is_alias ? (record.evaluate_target_health ? "Yes" : "No") : "-"}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {/* <button
                          onClick={() => navigate("/aws/createrecord")}
                          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                          title="Edit Record"
                        >
                          <Pencil size={15} />
                        </button> */}
                        <button
                          onClick={() => handleDelete(record)}
                          disabled={deletingId === record.id}
                          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                          title="Delete Record"
                        >
                          {deletingId === record.id ? (
                            <Loader2 size={15} className="animate-spin" />
                          ) : (
                            <Trash2 size={15} />
                          )}
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
      <Dialog open={!!dialog} onOpenChange={() => handleClose(false)}>
        <DialogContent className="sm:max-w-md overflow-hidden p-0 bg-background border">
          <div className="h-24 w-full bg-gradient-to-br from-primary/20 via-primary/10 to-transparent pt-8 pb-6 flex justify-center">
            <div className="flex items-center justify-center h-12 w-12 rounded-full bg-destructive/10 ring-4 ring-primary/5">
              {dialog?.icon === "destroy" && <Trash2 className="h-6 w-6 text-destructive" />}
            </div>
          </div>

          <div className="px-6 pb-6 text-center space-y-4">
            <DialogTitle className="text-lg font-semibold">Confirmation</DialogTitle>

            <DialogDescription asChild>
              <div className="space-y-2">
                <div className="font-medium text-foreground">{dialog?.title}</div>
                {dialog?.description && (
                  <div className="text-sm text-muted-foreground">{dialog.description}</div>
                )}
              </div>
            </DialogDescription>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" className="flex-1" onClick={() => handleClose(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={() => handleClose(true)}>
                OK
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>

  );

}
