import { useEffect, useMemo, useState } from "react";
import { Info } from "lucide-react";
import { toast } from "sonner";
import { useNavigate, useLocation } from "react-router-dom";
import { useDialog } from "../ui/dialog-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Header } from "@/components/layout/Header";
import {
  createRoute53Record,
  fetchRoute53LoadBalancers,
  Route53LoadBalancerItem,
} from "@/services/route53Api";
import { ApiError } from "@/lib/api";

const DEFAULT_HOSTED_ZONE_NAME = "prusplunk.com";
const DEFAULT_HOSTED_ZONE_ID = "e028d1bc-abef-44b4-91ae-efa139e4d2af";

const RECORD_NAME_PATTERN =
  /^[A-Za-z0-9*]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*$/;

function isValidRecordName(name: string) {
  const trimmed = name.trim();
  if (!trimmed || trimmed === "@") return true;
  return RECORD_NAME_PATTERN.test(trimmed);
}

const TTL_MAX = 600;

const ENDPOINT_OPTIONS = [
  {
    value: "Alias to Application and Classic Load Balancer",
    label: "Alias to Application and Classic Load Balancer",
  },
  {
    value: "Alias to Network Load Balancer",
    label: "Alias to Network Load Balancer",
  },
];

const REGION_OPTIONS = [
  { value: "us-east-2", label: "US East (Ohio)" },
  { value: "us-east-1", label: "US East (N. Virginia)" },
];

type HostedZoneState = {
  hostedZoneId?: string;
  hostedZoneName?: string;
};

function parseValueEntries(raw: string): string[] {
  return raw
    .split(/[\r\n,]+/)
    .map((v) => v.trim())
    .filter(Boolean);
}



function findDuplicates(values: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const v of values) {
    const key = v.toLowerCase();
    if (seen.has(key)) duplicates.add(v);
    seen.add(key);
  }
  return Array.from(duplicates);
}



export default function CreateRecord() {
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = (location.state || {}) as HostedZoneState;
  const { alert } = useDialog()
  const hostedZoneName = routeState.hostedZoneName || DEFAULT_HOSTED_ZONE_NAME;
  const hostedZoneId = routeState.hostedZoneId || DEFAULT_HOSTED_ZONE_ID;

  const [recordName, setRecordName] = useState("");
  const [recordType, setRecordType] = useState("A");
  const [routingPolicy, setRoutingPolicy] = useState("Simple");
  const [alias, setAlias] = useState(false);
  const [endpointType, setEndpointType] = useState("");
  const [region, setRegion] = useState("");
  const [selectedLoadBalancerId, setSelectedLoadBalancerId] = useState("");
  const [value, setValue] = useState("");
  const [ttl, setTtl] = useState("300");
  const [evaluateTargetHealth, setEvaluateTargetHealth] = useState(false);
  const [justification, setJustification] = useState("");

  const [loadBalancers, setLoadBalancers] = useState<Route53LoadBalancerItem[]>([]);
  const [loadingLoadBalancers, setLoadingLoadBalancers] = useState(false);
  const [loadBalancerError, setLoadBalancerError] = useState("");

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedLoadBalancer = useMemo(
    () => loadBalancers.find((lb) => lb.id === selectedLoadBalancerId) || null,
    [loadBalancers, selectedLoadBalancerId]
  );

  useEffect(() => {
    const shouldLoad = alias && endpointType && region;
    if (!shouldLoad) {
      setLoadBalancers([]);
      setSelectedLoadBalancerId("");
      setLoadBalancerError("");
      return;
    }

    let cancelled = false;
    setLoadingLoadBalancers(true);
    setLoadBalancerError("");

    fetchRoute53LoadBalancers(region, endpointType)
      .then((items) => {
        if (cancelled) return;
        setLoadBalancers(items);
        setSelectedLoadBalancerId((current) => {
          if (current && items.some((item) => item.id === current)) {
            return current;
          }
          return items[0]?.id || "";
        });
      })
      .catch((error) => {
        if (cancelled) return;
        const message =
          error instanceof Error ? error.message : "Failed to load load balancers";
        setLoadBalancerError(message);
        setLoadBalancers([]);
        setSelectedLoadBalancerId("");
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingLoadBalancers(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [alias, endpointType, region]);

  useEffect(() => {
    if (!alias) {
      setEndpointType("");
      setRegion("");
      setSelectedLoadBalancerId("");
      setLoadBalancers([]);
      setLoadBalancerError("");
      setEvaluateTargetHealth(false);
    }
  }, [alias]);


  const ttlError = useMemo(() => {
    if (alias) return ""; // TTL isn't used for alias records
    const trimmed = ttl.trim();
    if (trimmed === "") return "TTL is required.";
    if (!/^\d+$/.test(trimmed)) return "TTL must be a non-negative integer.";
     if (Number(trimmed) > TTL_MAX) return `TTL cannot exceed ${TTL_MAX} seconds.`;
    return "";
  }, [ttl, alias]);



  const recordDisplayName = recordName.trim() ? `${recordName.trim()}.${hostedZoneName}` : hostedZoneName;
  const ttlValue = Number(ttl);
  const valueLines = parseValueEntries(value);


  const MIN_JUSTIFICATION_LENGTH = 20;


  const handleTtlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // allow clearing the field, or any non-negative integer — reject minus signs, decimals, etc.
    if (raw === "" || /^\d+$/.test(raw)) {
      setTtl(raw);
    }
  };

  const isFormValid = useMemo(() => {
    const trimmedRecordName = recordName.trim();
    if (trimmedRecordName && !isValidRecordName(trimmedRecordName)) return false;

    if (justification.trim().length < MIN_JUSTIFICATION_LENGTH) return false;

    if (alias) {
      if (!endpointType || !region || !selectedLoadBalancerId) return false;
    } else {
      if (valueLines.length === 0) return false;
      if (findDuplicates(valueLines).length > 0) return false;
      if (ttlError !== "") return false;
      if (!Number.isInteger(Number(ttl)) || Number(ttl) < 0 || ttl.trim() === "") return false;
    }

    return true;
  }, [recordName, justification, alias, endpointType, region, selectedLoadBalancerId, valueLines, ttl]);

  const handleSubmit = async () => {

    const trimmedRecordName = recordName.trim();
    if (trimmedRecordName && !isValidRecordName(trimmedRecordName)) {
      alert({
        title: "Invalid record name",
        description:
          "Record name can only contain letters, numbers, hyphens, and periods between labels — spaces and other special characters aren't allowed.",
        severity: "error",
      });
      return;
    }

    if (!alias) {
      const duplicates = findDuplicates(valueLines);
      if (duplicates.length > 0) {
        alert({
          title: "Duplicate values",
          description: `Each value must be unique. Duplicate found: ${duplicates.join(", ")}`,
          severity: "error",
        });
        return;
      }
    }
    try {
      setIsSubmitting(true);

      if (alias && !selectedLoadBalancer) {
        alert({
          title: "Load balancer required",
          description: "Please choose a load balancer before creating the alias record.",
          severity: "warning",
        });
        return;
      }
      const trimmedJustification = justification.trim();

      const payload = alias
        ? {
          hostedZoneId,
          recordName: recordName.trim() || "@",
          recordType,
          routingPolicy,
          isAlias: true,
          aliasDnsName: selectedLoadBalancer?.dns_name,
          aliasHostedZoneId: selectedLoadBalancer?.canonical_hosted_zone_id,
          aliasEndpointType: endpointType,
          aliasRegion: region,
          evaluateTargetHealth,
          justification: trimmedJustification,
        }
        : {
          hostedZoneId,
          recordName: recordName.trim() || "@",
          recordType,
          routingPolicy,
          ttl: ttlValue,
          value: valueLines[0] || value,
          values: valueLines.length > 1 ? valueLines : undefined,
          justification: trimmedJustification,
        };

      const result = await createRoute53Record(payload);
      alert({ title: "DNS record created", description: "The record was created successfully.", severity: "success" });
      setIsConfirmOpen(false);
      const requestId = result.data?.requestId;
      if (requestId) {
        const consoleSearch = new URLSearchParams({
          request: requestId,
          service: "route53-service",
          operation: "create",
        }).toString();
        navigate(`/console?${consoleSearch}`, { replace: true });
      } else {
        navigate("/aws/hostedzonedetails");
      }
    } catch (error) {
      const requestId =
        error instanceof ApiError && typeof error.details?.requestId === "string"
          ? error.details.requestId
          : undefined;
      if (requestId) {
        const consoleSearch = new URLSearchParams({
          request: requestId,
          service: "route53-service",
          operation: "create",
        }).toString();
        navigate(`/console?${consoleSearch}`, { replace: true });
        return;
      }
      const message = error instanceof Error ? error.message : "Failed to create DNS record";
      alert({ title: "Failed to create record", description: message, severity: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Header title={hostedZoneName} subtitle="Info" showSearch={false} />

      <div className="max-w-6xl mx-auto space-y-8">
        <section className="glass-panel rounded-xl p-6">
          <div className="space-y-8 p-6">
            <div className="grid gap-8 lg:grid-cols-2">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <label className="font-medium">Record name</label>
                  <Info className="h-4 w-4 text-primary" />
                </div>

                <div className="flex items-center gap-3">
                  <Input
                    value={recordName}
                    onChange={(e) => setRecordName(e.target.value.replace(/\s/g, ""))}
                    placeholder="subdomain"
                    className="bg-card"
                  />
                  <span className="text-muted-foreground whitespace-nowrap">
                    {hostedZoneName}
                  </span>
                </div>

                <p className="mt-2 text-sm text-muted-foreground">
                  Leave this blank to create a record at the root of the hosted zone.
                </p>
              </div>

              <div>
                <div className="mb-2 flex items-center gap-2">
                  <label className="font-medium">Record type</label>
                  <Info className="h-4 w-4 text-primary" />
                </div>

                <Select value={recordType} onValueChange={setRecordType}>
                  <SelectTrigger className="bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">A - Routes traffic to an IPv4 address</SelectItem>
                    {/* S */}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch checked={alias} onCheckedChange={setAlias} />
              <label className="font-medium">Alias</label>
            </div>

            {alias ? (
              <div className="space-y-6 rounded-lg border border-border bg-background/40 p-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="font-medium">Route traffic to</label>
                    <Info className="h-4 w-4 text-primary" />
                  </div>

                  <Select value={endpointType} onValueChange={setEndpointType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select endpoint type" />
                    </SelectTrigger>
                    <SelectContent>
                      {ENDPOINT_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="font-medium">Region</label>
                    <Info className="h-4 w-4 text-primary" />
                  </div>

                  <Select value={region} onValueChange={setRegion}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select AWS Region" />
                    </SelectTrigger>
                    <SelectContent>
                      {REGION_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="font-medium">Load balancer</label>
                    <Info className="h-4 w-4 text-primary" />
                  </div>

                  <Select
                    value={selectedLoadBalancerId}
                    onValueChange={setSelectedLoadBalancerId}
                    disabled={!endpointType || !region || loadingLoadBalancers || loadBalancers.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          loadingLoadBalancers
                            ? "Loading load balancers..."
                            : "Select load balancer"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {loadBalancers.map((lb) => (
                        <SelectItem key={lb.id} value={lb.id}>
                          {lb.name} - {lb.region} - {lb.type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {loadBalancerError ? (
                    <p className="text-sm text-destructive">{loadBalancerError}</p>
                  ) : null}

                  {!loadingLoadBalancers && endpointType && region && loadBalancers.length === 0 && !loadBalancerError ? (
                    <p className="text-sm text-muted-foreground">
                      No active load balancers were found for the selected endpoint and region.
                    </p>
                  ) : null}
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="font-medium">Routing policy</label>
                      <Info className="h-4 w-4 text-primary" />
                    </div>

                    <Select value={routingPolicy} onValueChange={setRoutingPolicy}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Simple">Simple routing</SelectItem>
                        {/* <SelectItem value="Weighted">Weighted routing</SelectItem>
                        <SelectItem value="Latency">Latency routing</SelectItem>
                        <SelectItem value="Failover">Failover routing</SelectItem>
                        <SelectItem value="Geolocation">Geolocation routing</SelectItem> */}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="font-medium">Evaluate target health</label>
                      <Info className="h-4 w-4 text-primary" />
                    </div>

                    <div className="flex h-10 items-center rounded-md border border-border px-3">
                      <Switch checked={evaluateTargetHealth} onCheckedChange={setEvaluateTargetHealth} />
                      <span className="ml-3 text-sm">
                        {evaluateTargetHealth ? "Yes" : "No"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-8 rounded-lg border border-border bg-background/40 p-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="font-medium">Value</label>
                    <Info className="h-4 w-4 text-primary" />
                  </div>

                  <Textarea
                    rows={5}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder={`3.17.183.49\n\n3.17.183.50`}
                    className="resize-none"
                  />

                  <p className="text-sm text-muted-foreground">
                    Enter one value per line. For alias records, use the toggle above.
                  </p>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="font-medium">TTL (seconds)</label>
                      <Info className="h-4 w-4 text-primary" />
                    </div>

                    <Input
                      type="number"
                      min={0}
                      max={TTL_MAX}
                      value={ttl}
                      onChange={handleTtlChange}
                    />

                    {ttlError ? (
                      <p className="text-sm text-destructive">{ttlError}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Time to live determines how long DNS resolvers cache this record.
                      </p>
                    )}
                  </div>
                </div>

                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
                  <p className="text-sm text-amber-500">
                    Lower TTL values propagate faster but increase DNS query volume.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="mb-2 flex items-center gap-2">
                    <label className="font-medium">Routing policy</label>
                    <Info className="h-4 w-4 text-primary" />
                  </div>

                  <Select value={routingPolicy} onValueChange={setRoutingPolicy}>
                    <SelectTrigger className="bg-card">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Simple">Simple routing</SelectItem>
                      {/* <SelectItem value="Weighted">Weighted</SelectItem>
                      <SelectItem value="Latency">Latency</SelectItem>
                      <SelectItem value="Failover">Failover</SelectItem> */}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="space-y-2 rounded-lg border border-border bg-background/40 p-6">
              <div className="flex items-center gap-2">
                <label className="font-medium">Justification</label>
                <Info className="h-4 w-4 text-primary" />
              </div>

              <Textarea
                rows={3}
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder="Optional note for this DNS record"
                className="resize-none"
              />
            </div>
          </div>
        </section>

        <div className="flex flex-col space-y-2">
          <div className="mb-4 flex items-center justify-end">
            <Button
              variant="outline"
              onClick={() => navigate("/aws/hostedzonedetails")}
              className="me-4 border border-border bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground"
            >
              Cancel
            </Button>
            <Button
              onClick={() => setIsConfirmOpen(true)}
              disabled={!isFormValid}
              className="bg-primary text-white hover:bg-primary/90"
            >
              Create Record
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
          <div className="border-b pb-4">
            <DialogHeader className="items-center text-center">
              <DialogTitle className="text-xl font-semibold">
                Confirm Record Creation
              </DialogTitle>
              <DialogDescription className="mt-2">
                Review the DNS record details before creating the record.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="flex-1 overflow-y-auto model-scroll-hide px-1 py-4 space-y-5">
            <div>
              <h3 className="mb-3 text-sm font-semibold">Record Information</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border bg-muted/40 p-4">
                  <p className="text-xs text-muted-foreground">Record Name</p>
                  <p className="mt-1 font-medium">{recordDisplayName}</p>
                </div>
                <div className="rounded-lg border bg-muted/40 p-4">
                  <p className="text-xs text-muted-foreground">Record Type</p>
                  <p className="mt-1 font-medium">{recordType}</p>
                </div>
                <div className="rounded-lg border bg-muted/40 p-4">
                  <p className="text-xs text-muted-foreground">Hosted Zone</p>
                  <p className="mt-1 font-medium">{hostedZoneName}</p>
                </div>
                <div className="rounded-lg border bg-muted/40 p-4">
                  <p className="text-xs text-muted-foreground">Alias Record</p>
                  <p className="mt-1 font-medium">{alias ? "Enabled" : "Disabled"}</p>
                </div>
              </div>
            </div>

            {alias ? (
              <div>
                <h3 className="mb-3 text-sm font-semibold">Alias Target</h3>
                <div className="rounded-lg border bg-muted/40 p-4 space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Route Traffic To</p>
                      <p className="mt-1 font-medium">{endpointType || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">AWS Region</p>
                      <p className="mt-1 font-medium">
                        {REGION_OPTIONS.find((item) => item.value === region)?.label || "-"}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">Selected Load Balancer</p>
                    <p className="mt-1 break-all font-medium">
                      {selectedLoadBalancer?.dns_name || "-"}
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Routing Policy</p>
                      <p className="mt-1 font-medium">{routingPolicy}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Evaluate Target Health</p>
                      <p className="mt-1 font-medium">
                        {evaluateTargetHealth ? "Enabled" : "Disabled"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <h3 className="mb-3 text-sm font-semibold">Record Value</h3>
                <div className="rounded-lg border bg-muted/40 p-4 space-y-2">
                  <p className="text-xs text-muted-foreground">Values</p>
                  <p className="whitespace-pre-line break-all font-medium">
                    {valueLines.join("\n") || "-"}
                  </p>
                  <p className="text-xs text-muted-foreground">TTL: {ttlValue}</p>
                </div>
              </div>
            )}

            {justification ? (
              <div>
                <h3 className="mb-3 text-sm font-semibold">Comment</h3>
                <div className="rounded-lg border bg-muted/40 p-4">
                  <p className="text-sm">{justification}</p>
                </div>
              </div>
            ) : null}

            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
              <p className="text-sm text-muted-foreground">
                This Route 53 DNS record will be created in the hosted zone{" "}
                <span className="font-semibold text-foreground">{hostedZoneName}</span>.
              </p>
            </div>
          </div>

          <DialogFooter className="border-t pt-4 mt-4">
            <Button variant="outline" onClick={() => setIsConfirmOpen(false)}>
              Go Back
            </Button>
            <Button disabled={isSubmitting} onClick={handleSubmit}>
              {isSubmitting ? "Creating..." : "Confirm & Create Record"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
