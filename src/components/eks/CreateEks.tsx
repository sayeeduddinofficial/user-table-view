import { useEffect, useMemo, useRef, useState } from "react";
import { useAppStore } from "@/store/appStore";
import { useDialog } from "@/components/ui/dialog-context";
import { Button } from "@/components/ui/button";
import { useNavigate, Link } from "react-router-dom";
import { ChevronRight, FileText, ChevronDown, X } from "lucide-react";
import { fetchVpcListApi, fetchVpcDetailsApi } from "@/services/vpcService";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Header } from "../layout/Header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AWS_REGIONS, KUBERNETES_VERSIONS } from "@/types";

type ConfigurationMode = "quick" | "custom";

const REGION_CODE: Record<string, string> = {
  Ohio: "us-east-2",
  "N.Virginia": "us-east-1",
};

export function CreateEks({ onClose }: { onClose?: () => void } = {}) {
  const navigate = useNavigate();
  const close = () => (onClose ? onClose() : navigate("/aws/eks"));
  const asModal = !!onClose;
  const { alert } = useDialog();

  const vpcs = useAppStore((s) => s.vpcs);
  const setVpcs = useAppStore((s) => s.setVpcs);

  const [region, setRegion] = useState("us-east-2");
  const [configuration, setConfiguration] =
    useState<ConfigurationMode>("quick");
  const [name, setName] = useState("");
  const [kubernetesVersion, setKubernetesVersion] = useState("1.36");
  const [vpc, setVpc] = useState<string>("");
  const [subnetIds, setSubnetIds] = useState<string[]>([]);
  const [availableSubnets, setAvailableSubnets] = useState<
    { id: string; label: string }[]
  >([]);
  const [subnetsLoading, setSubnetsLoading] = useState(false);
  const [businessJustification, setBusinessJustification] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const regionCode = REGION_CODE[region] ?? region;

  // Load VPCs if not already loaded
  useEffect(() => {
    if (vpcs.length === 0) {
      fetchVpcListApi()
        .then(setVpcs)
        .catch(() => {});
    }
  }, []);

  // VPCs filtered by selected region
  const regionVpcs = useMemo(
    () => vpcs.filter((v: any) => v.region === regionCode),
    [vpcs, regionCode],
  );

  // Reset selected VPC when region changes / options change
  useEffect(() => {
    if (vpc && !regionVpcs.some((v: any) => v.id === vpc)) {
      setVpc("");
      setAvailableSubnets([]);
      setSubnetIds([]);
    }
  }, [regionVpcs, vpc]);

  // Fetch subnets for selected VPC
  useEffect(() => {
    if (!vpc) {
      setAvailableSubnets([]);
      setSubnetIds([]);
      return;
    }
    let cancelled = false;
    setSubnetsLoading(true);
    fetchVpcDetailsApi(vpc)
      .then((detail) => {
        if (cancelled) return;
        const subs = (detail.subnets ?? []).map((s) => ({
          id: s.aws_subnet_id,
          label: `${s.aws_subnet_id} (${s.subnet_type}, ${s.availability_zone}, ${s.cidr})`,
        }));
        setAvailableSubnets(subs);
        setSubnetIds([]);
      })
      .catch(() => {
        if (!cancelled) setAvailableSubnets([]);
      })
      .finally(() => {
        if (!cancelled) setSubnetsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [vpc]);

  const selectedVpc = regionVpcs.find((v: any) => v.id === vpc);

  const create = async () => {
    if (isSubmitting) return;
    if (!name.trim()) {
      alert({ title: "Cluster name is required", severity: "error" });
      return;
    }
    if (!vpc) {
      alert({ title: "Please select a VPC", severity: "error" });
      return;
    }
    if (subnetIds.length === 0) {
      alert({ title: "Please select at least one subnet", severity: "error" });
      return;
    }

    try {
      setIsSubmitting(true);
      // TODO: wire actual EKS provisioning API here
      alert({
        title: "EKS request submitted successfully",
        description: name,
        severity: "success",
      });
      close();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create EKS";
      alert({ title: message, severity: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const DetailCard = ({
    label,
    value,
    className = "",
  }: {
    label: string;
    value: React.ReactNode;
    className?: string;
  }) => (
    <div
      className={`rounded-lg border border-slate-800 bg-slate-900 p-4 ${className}`}
    >
      <div className="text-xs text-slate-400">{label}</div>
      <div className="mt-1 text-sm font-medium text-white break-words">
        {value || "-"}
      </div>
    </div>
  );

  return (
    <>
      {!asModal && (
        <div>
          <Header
            title="Configure cluster"
            subtitle="Amazon EKS clusters provisioned via Terraform into existing VPCs"
            showSearch={false}
          />

          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4 p-6">
            <Link to="/aws/eks" className="hover:text-foreground">
              Amazon Elastic Kubernetes Service
            </Link>
            <ChevronRight size={14} />
            <span className="text-foreground">Create EKS cluster</span>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto">
        <section className="bg-card border border-border rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">Configuration options</h2>
          </div>

          <Field label="">
            <div className="text-xs text-muted-foreground mt-1 mb-2">
              Choose how you would like to configure the cluster.
            </div>
            <div className="grid grid-cols-2 gap-3">
              <SelectCard
                selected={configuration === "quick"}
                onClick={() => setConfiguration("quick")}
                label="Quick configuration (with EKS Auto Mode)"
                description="Quickly create a cluster with production-grade default settings. The configuration uses EKS Auto Mode to automate infrastructure tasks like creating nodes and provisioning storage."
              />
              <SelectCard
                selected={configuration === "custom"}
                onClick={() => setConfiguration("custom")}
                disabled
                label="Custom configuration"
                description="To change default settings prior to creation, choose this option. This configuration gives the option to use EKS Auto Mode and customize the cluster's configuration."
              />
            </div>
          </Field>
        </section>

        <section className="bg-card border border-border rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold mb-5">
              Cluster configuration
            </h2>
          </div>

          <Field label="AWS Region">
            <Select value={region} onValueChange={setRegion}>
              <SelectTrigger className="bg-muted/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AWS_REGIONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field
            label="Name"
            hint="Use the auto-generated name or enter a unique name for this cluster. This property cannot be changed after the cluster is created."
          >
            <input
              value={name}
              onChange={(e) => {
                const value = e.target.value;
                if (/^[A-Za-z0-9-]*$/.test(value)) setName(value);
              }}
              placeholder="curious-folk-potato"
              className="w-full bg-input/40 border border-border rounded-md px-3 py-2 text-sm"
            />
          </Field>

          <Field
            label="Kubernetes version"
            hint="Select Kubernetes version for this cluster."
          >
            <Select
              value={kubernetesVersion}
              onValueChange={(e) => setKubernetesVersion(e)}
            >
              <SelectTrigger className="bg-muted/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KUBERNETES_VERSIONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field
            label="VPC"
            hint="Select a VPC to use for your EKS cluster resources."
          >
            <select
              value={vpc}
              onChange={(e) => setVpc(e.target.value)}
              className="w-full bg-input/40 border border-border rounded-md px-3 py-2 text-sm"
            >
              <option value="">
                {regionVpcs.length === 0
                  ? `No VPCs available in ${regionCode}`
                  : "Select a VPC"}
              </option>
              {regionVpcs.map((v: any) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                  {v.awsVpcId ? ` (${v.awsVpcId})` : ""}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Subnets"
            hint="Choose the subnets in your VPC where the control plane may place elastic network interfaces (ENIs) to facilitate communication with your cluster."
          >
            <MultiSelect
              options={availableSubnets}
              value={subnetIds}
              onChange={setSubnetIds}
              disabled={!vpc || subnetsLoading}
              placeholder={
                !vpc
                  ? "Select a VPC first"
                  : subnetsLoading
                    ? "Loading subnets…"
                    : availableSubnets.length === 0
                      ? "No subnets found for this VPC"
                      : "Select subnets"
              }
            />
          </Field>
        </section>

        <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900/40 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-5 w-5 text-blue-500" />
            <h3 className="text-lg font-semibold text-white">
              Business Justification
            </h3>
          </div>

          <div className="relative">
            <Textarea
              id="justification"
              className="resize-none overflow-y-auto"
              placeholder="Provide a brief justification for this EKS request."
              value={businessJustification}
              onChange={(e) =>
                setBusinessJustification(e.target.value.slice(0, 250))
              }
              rows={3}
              maxLength={250}
            />

            <div className="mt-2 text-right text-xs text-slate-400">
              {businessJustification.length}/250
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pb-8">
          <button
            onClick={close}
            className="text-sm text-primary hover:underline px-3 py-2"
          >
            Cancel
          </button>
          <Button
            onClick={() => setShowConfirm(true)}
            disabled={!name.trim() || !vpc || subnetIds.length === 0}
          >
            Create
          </Button>
        </div>
      </div>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="max-w-3xl bg-slate-950 border-slate-800">
          <DialogHeader>
            <DialogTitle>Confirm EKS Creation</DialogTitle>
            <DialogDescription>
              Please review the details before creating your EKS.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-2">
            <DetailCard label="Configuration" value={configuration} />
            <DetailCard label="AWS Region" value={region} />
            <DetailCard label="Cluster Name" value={name} />
            <DetailCard label="Kubernetes Version" value={kubernetesVersion} />
            <DetailCard
              label="VPC"
              value={selectedVpc ? selectedVpc.name : vpc}
            />
            <DetailCard label="Subnets" value={subnetIds.join(", ")} />
            <DetailCard
              label="Business Justification"
              value={businessJustification}
              className="col-span-2"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)}>
              Go Back & Edit
            </Button>

            <Button
              onClick={async () => {
                setShowConfirm(false);
                await create();
              }}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Confirm & Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Field({
  label,
  hint,
  optional,
  children,
}: {
  label: string;
  hint?: string;
  info?: boolean;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-1">
        <label className="text-sm font-medium">
          {label}
          {optional && (
            <span className="text-muted-foreground font-normal italic ml-1">
              - optional
            </span>
          )}
        </label>
      </div>
      {hint && <div className="text-xs text-muted-foreground mb-2">{hint}</div>}
      {children}
    </div>
  );
}

function SelectCard({
  selected,
  onClick,
  label,
  description,
  disabled,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`text-left rounded-md border px-4 py-3 transition ${
        disabled
          ? "opacity-50 cursor-not-allowed bg-muted"
          : selected
            ? "border-primary bg-primary/10 ring-1 ring-primary/40"
            : "border-border bg-card hover:bg-accent/30"
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`h-4 w-4 rounded-full border grid place-items-center ${selected ? "border-primary" : "border-muted-foreground"}`}
        >
          {selected && <span className="h-2 w-2 rounded-full bg-primary" />}
        </span>
        <span className="text-sm font-medium">{label}</span>
      </div>
      {description && (
        <div className="text-xs text-muted-foreground mt-2 leading-relaxed">
          {description}
        </div>
      )}
    </button>
  );
}

function MultiSelect({
  options,
  value,
  onChange,
  disabled,
  placeholder,
}: {
  options: { id: string; label: string }[];
  value: string[];
  onChange: (v: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  const toggle = (id: string) =>
    onChange(
      value.includes(id) ? value.filter((v) => v !== id) : [...value, id],
    );

  const allSelected = options.length > 0 && value.length === options.length;
  const toggleAll = () => onChange(allSelected ? [] : options.map((o) => o.id));

  const selectedLabel =
    value.length === 0 ? (placeholder ?? "Select") : `${value.length} selected`;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between bg-input/40 border border-border rounded-md px-3 py-2 text-sm ${
          disabled ? "opacity-60 cursor-not-allowed" : "hover:bg-accent/20"
        }`}
      >
        <span className={value.length === 0 ? "text-muted-foreground" : ""}>
          {selectedLabel}
        </span>
        <ChevronDown size={14} className="text-muted-foreground" />
      </button>

      {open && !disabled && (
        <div className="absolute z-20 mt-1 w-full max-h-64 overflow-auto bg-popover border border-border rounded-md shadow-lg">
          {options.length > 0 && (
            <label className="flex items-center gap-2 px-3 py-2 border-b border-border cursor-pointer hover:bg-accent/30 text-sm font-medium">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                className="h-4 w-4 shrink-0 accent-primary cursor-pointer"
              />

              <span className="flex-1">Select all</span>
            </label>
          )}
          {options.length === 0 && (
            <div className="px-3 py-3 text-sm text-muted-foreground">
              No options available
            </div>
          )}
          {options.map((o) => {
            const checked = value.includes(o.id);
            return (
              <label
                key={o.id}
                className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-accent/30 text-sm"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(o.id)}
                  className="h-4 w-4 shrink-0 accent-primary cursor-pointer"
                />
                <span className="flex-1">{o.label}</span>
              </label>
            );
          })}
        </div>
      )}

      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {value.map((id) => {
            const opt = options.find((o) => o.id === id);
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-primary/40 bg-primary/10 text-primary text-xs"
              >
                {opt?.label ?? id}
                <button
                  type="button"
                  onClick={() => toggle(id)}
                  className="hover:text-primary/70"
                  aria-label={`Remove ${opt?.label ?? id}`}
                >
                  <X size={12} />
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
