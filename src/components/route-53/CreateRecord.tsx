import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useDialog } from "../ui/dialog-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText } from "lucide-react";
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
  checkRoute53RecordName,
  Route53LoadBalancerItem,
} from "@/services/route53Api";
import { ApiError } from "@/lib/api";
import { useAppStore } from "@/store/appStore";
import {
  DEFAULT_HOSTED_ZONE_ID,
  DEFAULT_HOSTED_ZONE_NAME,
  ENDPOINT_OPTIONS,
  REGION_OPTIONS,
} from "./route53Constants";
import type { HostedZoneRouteState } from "./route53Types";
import {
  findDuplicates,
  findInvalidIPv4s,
  ipv4ErrorMessage,
  isValidRecordName,
  parseValueEntries,
  sanitizeIPv4Input,
  validateRecordNameField,
} from "./route53Utils";

export default function CreateRecord() {
  const setActiveRequest = useAppStore((s) => s.setActiveRequest);

  const navigate = useNavigate();
  const location = useLocation();
  const routeState = (location.state || {}) as HostedZoneRouteState;
  const { alert } = useDialog();
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
  const [submitted, setSubmitted] = useState(false);
  const [recordNameError, setRecordNameError] = useState("");
  const [recordNameExistsError, setRecordNameExistsError] = useState("");
  const [recordNameCheckLoading, setRecordNameCheckLoading] = useState(false);
  const [valueError, setValueError] = useState("");
  const [justificationError, setJustificationError] = useState("");
  const [aliasLbError, setAliasLbError] = useState("");
  const recordNameInputRef = useRef<HTMLInputElement | null>(null);
  const valueTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [ttlError, setTtlError] = useState("");
  const selectedLoadBalancer = useMemo(
    () => loadBalancers.find((lb) => lb.id === selectedLoadBalancerId) || null,
    [loadBalancers, selectedLoadBalancerId]
  );

  useEffect(() => {
    const trimmed = recordName.trim();
    if (!trimmed || !isValidRecordName(trimmed)) {
      setRecordNameExistsError("");
      return;
    }
    setRecordNameCheckLoading(true);
    const timer = setTimeout(() => {
      checkRoute53RecordName(hostedZoneId, trimmed, recordType)
        .then(({ exists }) =>
          setRecordNameExistsError(
            exists ? `A record named "${trimmed}" already exists in this hosted zone.` : ""
          )
        )
        .catch(() => setRecordNameExistsError(""))
        .finally(() => setRecordNameCheckLoading(false));
    }, 500);
    return () => { clearTimeout(timer); setRecordNameCheckLoading(false); };
  }, [recordName, recordType, hostedZoneId]);

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
          const next = current && items.some((item) => item.id === current)
            ? current
            : items[0]?.id || "";
          if (next) setAliasLbError("");
          return next;
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

  const recordDisplayName = recordName.trim() ? `${recordName.trim()}.${hostedZoneName}` : hostedZoneName;
  const ttlValue = Number(ttl);
  const valueLines = parseValueEntries(value);
  const invalidIps = useMemo(
    () => (!alias && recordType === "A" ? findInvalidIPv4s(valueLines) : []),
    [valueLines, alias, recordType]
  );

  const MIN_JUSTIFICATION_LENGTH = 20;

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);

      if (alias && !selectedLoadBalancer) {
        setAliasLbError("Please select a load balancer.");
        return;
      }
      const trimmedJustification = justification.trim();

      const payload = alias
        ? {
          hostedZoneId,
          recordName: recordName.trim(),
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
          recordName: recordName.trim(),
          recordType,
          routingPolicy,
          ttl: ttlValue,
          value: valueLines[0] || value,
          values: valueLines.length > 1 ? valueLines : undefined,
          justification: trimmedJustification,
        };

      const result = await createRoute53Record(payload);
      setIsConfirmOpen(false);
      const requestId = result.data?.requestId;
      if (requestId) {
        alert({ title: "DNS record creation started", description: "The record was created successfully.", severity: "success" });
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

  const TTL_MIN = 60;
  const TTL_MAX = 300;

  const handleTtlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    if (!/^\d{0,3}$/.test(value)) return;

    setTtl(value);
    validateTtl(value);
  };


  const validateTtl = (value: string) => {
    if (value === "") {
      setTtlError("TTL is required");
      return;
    }

    const ttlValue = Number(value);

    if (ttlValue < TTL_MIN || ttlValue > TTL_MAX) {
      setTtlError(`TTL must be between ${TTL_MIN} and ${TTL_MAX}`);
    } else {
      setTtlError("");
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
                </div>

                <div className="flex items-center gap-3">
                  <Input
                    ref={recordNameInputRef}
                    value={recordName}
                    onChange={(e) => {
                      setRecordName(e.target.value.replace(/\s/g, ""));
                      if (submitted) setRecordNameError(validateRecordNameField(e.target.value));
                    }}
                    placeholder="subdomain"
                    className="bg-card"
                  />
                  <span className="text-muted-foreground whitespace-nowrap">
                    {hostedZoneName}
                  </span>
                </div>

                {submitted && recordNameError ? (
                  <p className="mt-1 text-sm text-destructive">{recordNameError}</p>
                ) : recordNameCheckLoading ? (
                  <p className="mt-1 text-sm text-muted-foreground">Checking name availability...</p>
                ) : recordNameExistsError ? (
                  <p className="mt-1 text-sm text-destructive">{recordNameExistsError}</p>
                ) : null}
              </div>

              <div>
                <div className="mb-2 flex items-center gap-2">
                  <label className="font-medium">Record type</label>
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
                  </div>

                  <Select
                    value={selectedLoadBalancerId}
                    onValueChange={(v) => { setSelectedLoadBalancerId(v); setAliasLbError(""); }}
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
                  ) : submitted && aliasLbError ? (
                    <p className="text-sm text-destructive">{aliasLbError}</p>
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
                  </div>

                  <Textarea
                    ref={valueTextareaRef}
                    rows={2}
                    value={value}
                    onChange={(e) => {
                      const next =
                        recordType === "A"
                          ? sanitizeIPv4Input(e.target.value)
                          : e.target.value;
                      setValue(next);
                      if (submitted) {
                        const lines = parseValueEntries(next);
                        const dups = findDuplicates(lines);
                        const invIps = recordType === "A" ? findInvalidIPv4s(lines) : [];
                        if (lines.length === 0) setValueError("At least one value is required.");
                        else if (dups.length > 0) setValueError(`Duplicate value: ${dups.join(", ")}`);
                        else if (invIps.length > 0) setValueError(`Invalid IPv4: ${ipv4ErrorMessage(invIps)}`);
                        else setValueError("");
                      }
                    }}
                    inputMode={recordType === "A" ? "decimal" : undefined}
                    placeholder={`3.17.183.49`}
                    className="resize-none"
                  />

                  {submitted && valueError ? (
                    <p className="text-sm text-destructive">{valueError}</p>
                  ) : invalidIps.length > 0 ? (
                    <p className="text-sm text-destructive">
                      Invalid IPv4 address: {ipv4ErrorMessage(invalidIps)}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {recordType === "A"
                        ? "Enter one IPv4 address per line — 4 octets, each between 0 and 255 (e.g. 3.17.183.49)."
                        : "Enter one value per line. For alias records, use the toggle above."}
                    </p>
                  )}
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="font-medium">TTL (seconds)</label>
                    </div>
                    <Input
                      inputMode="numeric"
                      pattern="[0-9]*"
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

            <div className="space-y-2 rounded-lg border border-border bg-background/40 p-6" id="record-justification">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Business Justification</h2>
              </div>

              <Textarea
                rows={3}
                value={justification}
                onChange={(e) => {
                  setJustification(e.target.value);
                  if (submitted) setJustificationError(e.target.value.trim().length < MIN_JUSTIFICATION_LENGTH ? `Please provide at least ${MIN_JUSTIFICATION_LENGTH} characters.` : "");
                }}
                placeholder="Optional note for this DNS record"
                className="resize-none"
              />
              {submitted && justificationError && (
                <p className="text-sm text-destructive">{justificationError}</p>
              )}
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
              onClick={() => {
                setSubmitted(true);

                let valid = true;

                const trimmedName = recordName.trim();
                const nameErr = validateRecordNameField(trimmedName);
                setRecordNameError(nameErr);

                if (nameErr) valid = false;
                if (recordNameExistsError || recordNameCheckLoading) valid = false;

                const justErr =
                  justification.trim().length < MIN_JUSTIFICATION_LENGTH
                    ? `Please provide at least ${MIN_JUSTIFICATION_LENGTH} characters.`
                    : "";

                setJustificationError(justErr);

                if (justErr) valid = false;

                let valErr = "";
                let lbErr = "";

                if (alias) {
                  if (!selectedLoadBalancerId) {
                    lbErr = "Please select a load balancer.";
                    valid = false;
                  }
                  setAliasLbError(lbErr);
                } else {
                  const lines = parseValueEntries(value);
                  const dups = findDuplicates(lines);
                  const invIps =
                    recordType === "A"
                      ? findInvalidIPv4s(lines)
                      : [];

                  if (lines.length === 0)
                    valErr = "At least one value is required.";
                  else if (dups.length > 0)
                    valErr = `Duplicate value: ${dups.join(", ")}`;
                  else if (invIps.length > 0)
                    valErr = `Invalid IPv4: ${invIps.join(", ")}`;
                  else if (ttlError)
                    valErr = ttlError;

                  setValueError(valErr);

                  if (valErr) valid = false;
                }

                if (!valid) return;

                setIsConfirmOpen(true);
              }}
              className="bg-primary text-white hover:bg-primary/90"
            >
              Create Record
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent
          className="sm:max-w-2xl max-h-[85vh] flex flex-col"
          onInteractOutside={(event) => event.preventDefault()}>
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