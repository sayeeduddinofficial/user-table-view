import { useState, useEffect, useRef } from "react";
import { AlertTriangle, FileText, GitBranch, Settings, Shield, ShieldBan, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Section, FieldRow, RadioCard, RadioRow } from "./shared";
import { AZS, BucketForm, REGIONS, initialForm, regionalSuffix } from "@/utils/s3.utils";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { checkBucketNameApi } from "@/services/bucketService";
import { Label } from "../ui/label";

export function CreateBucketWizard({ onCancel, onSubmit }: {
  onCancel: () => void;
  onSubmit: (form: BucketForm) => void | Promise<void>;
}) {
  const [form, setForm] = useState<BucketForm>(initialForm);
  const [bucketNameCheckLoading, setBucketNameCheckLoading] =
    useState(false);

  const [bucketNameExists, setBucketNameExists] =
    useState(false);

  const [bucketNameCheckError, setBucketNameCheckError] =
    useState<string | null>(null);
  const bucketNameCheckTimer =
    useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [justificationTouched, setJustificationTouched] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const set = <K extends keyof BucketForm>(k: K, v: BucketForm[K]) => setForm((f) => ({ ...f, [k]: v }));
  const isDirectory = form.bucketType === "directory";
  const isRegional = !isDirectory && form.namespace === "regional";
  const suffix = regionalSuffix(form.region);
  const regionalFullName = form.namePrefix ? `${form.namePrefix}${suffix}` : "";
  const nameValid = isDirectory
    ? form.baseName.length >= 3 && form.baseName.length <= 63 && /^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(form.baseName) && form.az !== "" && form.acknowledgeSingleAZ
    : isRegional
      ? form.namePrefix.length >= 1 && regionalFullName.length >= 3 && regionalFullName.length <= 63 && /^[a-z0-9][a-z0-9.-]*[a-z0-9]$/.test(form.namePrefix)
      : /^[a-z0-9.-]{3,63}$/.test(form.name) && !form.name.startsWith("-") && !form.name.endsWith("-");

  const fullBucketName = isDirectory && form.baseName && form.az
    ? `${form.baseName}--${form.az}--x-s3`
    : isRegional
      ? regionalFullName
      : form.name;

  useEffect(() => {
    if (bucketNameCheckTimer.current) {
      clearTimeout(bucketNameCheckTimer.current);
    }

    setBucketNameExists(false);
    setBucketNameCheckError(null);

    if (
      isDirectory ||
      !fullBucketName ||
      !nameValid
    ) {
      setBucketNameCheckLoading(false);
      return;
    }

    setBucketNameCheckLoading(true);

    bucketNameCheckTimer.current = setTimeout(() => {
      checkBucketNameApi(
        isRegional
          ? form.namePrefix
          : fullBucketName,
        form.region,
        isRegional
          ? "ACCOUNT_REGIONAL"
          : "GLOBAL"
      )
        .then((res) => {
          setBucketNameExists(!!res.exists);
          setBucketNameCheckError(null);
        })
        .catch(() => {
          setBucketNameExists(false);
          setBucketNameCheckError(
            "Unable to verify bucket availability. Please try again."
          );
        })
        .finally(() => {
          setBucketNameCheckLoading(false);
        });
    }, 500);

    return () => {
      if (bucketNameCheckTimer.current) {
        clearTimeout(bucketNameCheckTimer.current);
      }
    };
  }, [
    fullBucketName,
    form.region,
    isDirectory,
    isRegional,
    nameValid,
  ]);

  const validateBucketName = (): { title: string; description: string } | null => {
    if (isDirectory) return null;
    if (isRegional) {
      const valid = form.namePrefix.length >= 1 &&
        regionalFullName.length >= 3 &&
        regionalFullName.length <= 63 &&
        /^[a-z0-9][a-z0-9.-]*[a-z0-9]$/.test(form.namePrefix);
      return valid
        ? null
        : {
          title: "Invalid bucket name prefix",
          description: "3–63 characters (including the account Regional suffix), unique within the account Regional namespace. Letters, numbers, periods, hyphens.",
        };
    }
    const valid = /^[a-z0-9.-]{3,63}$/.test(form.name) &&
      !form.name.startsWith("-") &&
      !form.name.endsWith("-");
    return valid
      ? null
      : {
        title: "Invalid bucket name",
        description: "3–63 characters, unique in the global namespace. Letters, numbers, periods, hyphens.",
      };
  };

  const validateJustification = (): { title: string; description: string } | null => {
    if (form.justification.trim().length < 20) {
      return {
        title: "Business justification required",
        description: "Please provide at least 20 characters of justification.",
      };
    }
    return null;
  };

  const bucketNameError = submitted ? validateBucketName() : null;
  const justificationError = submitted || justificationTouched ? validateJustification() : null;
  const bucketNameInputRef = useRef<HTMLInputElement | null>(null);

  const blockAllPublicOff = !isDirectory && !(form.blockNewAcls && form.blockAnyAcls && form.blockNewPolicies && form.blockCrossAccountPolicies);
  const publicAccessRiskUnacknowledged = blockAllPublicOff && !form.acknowledgeBlockPublic;
  const publicAccessAckError = submitted && publicAccessRiskUnacknowledged;

  return (
    <div className="bg-background min-h-full">
      {/* <div className="px-6 py-3 text-sm flex items-center gap-2 border-b border-border flex-wrap">
        <span className="text-primary cursor-pointer hover:underline" onClick={onCancel}>S3 Buckets</span>
        <ChevronRight size={12} className="text-muted-foreground" />
        <span className="font-semibold">Create Bucket</span>
      </div> */}

      <div className="max-w-5xl mx-auto px-8 py-6 space-y-8">
        {/* <div>
          <h1 className="text-2xl font-bold">Create Bucket</h1>
          <p className="text-sm text-muted-foreground mt-1">Buckets are containers for data stored in S3.</p>
        </div> */}
        {/* General configuration */}
        <Section title="General Configuration" icon={<Settings className="h-5 w-5 text-primary" />}>
          <FieldRow label="AWS Region">
            <Select value={form.region} onValueChange={(v) => set("region", v)}>
              <SelectTrigger className="w-full bg-background/50">
                <SelectValue placeholder="Select region" />
              </SelectTrigger>
              <SelectContent>
                {REGIONS.map(([code, label]) => (
                  <SelectItem key={code} value={code}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldRow>

          <FieldRow label="Bucket Type">
            <div className="grid grid-cols-1 gap-3">
              <RadioCard
                checked={form.bucketType === "general"}
                onChange={() => {
                  set("bucketType", "general");
                  set("encryptionType", "SSE-S3");
                  set("az", "");
                  set("acknowledgeSingleAZ", false);
                }}
                title="General purpose"
                desc="Recommended for most use cases and access patterns. General purpose buckets are the original S3 bucket type. They allow a mix of storage classes that redundantly store objects across multiple Availability Zones."
              />
              {/* <RadioCard
                checked={form.bucketType === "directory"}
                onChange={() => { }}
                disabled
                title="Directory"
                desc="Recommended for low-latency use cases. These buckets use only the S3 Express One Zone storage class, which provides faster processing of data within a single Availability Zone."
              /> */}
            </div>
          </FieldRow>

          {isDirectory && (
            <>
              <FieldRow label="Availability Zone" info>
                <p className="text-xs text-muted-foreground mb-2">
                  For optimal performance, choose an Availability Zone local to your compute services. The Availability Zone can't be changed after the bucket is created.
                </p>
                <select
                  value={form.az}
                  onChange={(e) => set("az", e.target.value)}
                  className="w-full bg-input/40 border border-border rounded-md px-3 py-2 text-sm"
                >
                  <option value="">Choose Zone</option>
                  {(AZS[form.region] ?? []).map((az) => (
                    <option key={az} value={az}>{az}</option>
                  ))}
                </select>
              </FieldRow>

              <div className="bg-warning/10 border border-warning/30 rounded-md p-3 flex items-start gap-3">
                <AlertTriangle size={16} className="text-warning mt-0.5 shrink-0" />
                <div className="space-y-2">
                  <div className="text-sm font-medium">Data is stored in a single Availability Zone</div>
                  <div className="text-xs text-muted-foreground">
                    Directory buckets store data across multiple devices within a single Availability Zone, but do not store data redundantly across Availability Zones.
                  </div>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.acknowledgeSingleAZ}
                      onChange={(e) => set("acknowledgeSingleAZ", e.target.checked)}
                      className="mt-0.5 h-4 w-4 accent-primary"
                    />
                    <span className="text-xs">I acknowledge that in the event of an Availability Zone outage, my data might be unavailable or lost.</span>
                  </label>
                </div>
              </div>
            </>
          )}

          {!isDirectory && (
            <FieldRow label="Bucket Namespace">
              <RadioRow
                checked={form.namespace === "global"}
                onChange={() => set("namespace", "global")}
                title="Global namespace"
                desc="S3 creates general purpose buckets in the global namespace."
              />
              <RadioRow
                checked={form.namespace === "regional"}
                onChange={() => set("namespace", "regional")}
                title="Account Regional namespace (recommended)"
                desc="Unique to your account. These buckets can never be created by another AWS account."
              />
            </FieldRow>
          )}

          <FieldRow label="Bucket Name">
            {isDirectory ? (
              <>
                <p className="text-xs text-muted-foreground mb-2">
                  For directory buckets, the bucket name is composed of a base name and a suffix. AWS adds a suffix to the base name that you provide. This suffix includes the Availability Zone ID. The bucket name can't be edited after the bucket is created.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium block mb-1">Base name</Label>
                    <Input
                      value={form.baseName}
                      onChange={(e) => {
                        const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
                        set("baseName", val);
                        set("name", val && form.az ? `${val}--${form.az}--x-s3` : val);
                      }}
                      placeholder="amzn-s3-demo-bucket"
                      className="w-full bg-input/40 border border-border rounded-md px-3 py-2 text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1">Availability Zone suffix</label>
                    <div className="w-full bg-input/20 border border-border rounded-md px-3 py-2 text-sm text-muted-foreground font-mono min-h-[38px]">
                      {form.az ? `--${form.az}--x-s3` : "—"}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Directory bucket names must be 3 to 63 characters, including the suffix, and unique within the chosen Region and Availability Zone. Directory bucket names must also begin and end with a letter or number. Valid characters are a-z, 0-9, and hyphens (-).
                </p>
                <div className="mt-2">
                  <label className="text-sm font-medium block mb-1">Full bucket name</label>
                  <div className="w-full bg-input/20 border border-border rounded-md px-3 py-2 text-sm text-muted-foreground font-mono min-h-[38px]">
                    {fullBucketName || "—"}
                  </div>
                </div>
              </>
            ) : isRegional ? (
              <>
                <p className="text-xs text-muted-foreground mb-2">
                  For general purpose buckets in the account Regional namespace, the bucket name is composed of a bucket name prefix and a suffix. AWS adds the suffix to the bucket name prefix that you provide. This suffix is the account Regional namespace. The bucket name can't be edited after the bucket is created.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium block mb-1">Bucket name prefix</label>
                    <Input
                      ref={bucketNameInputRef}
                      value={form.namePrefix}
                      onChange={(e) => set("namePrefix", e.target.value.toLowerCase().replace(/[^a-z0-9.-]/g, "-"))}
                      placeholder="amzn-s3-demo-bucket"
                      className={`w-full bg-input/40 border rounded-md px-3 py-2 text-sm font-mono ${bucketNameError || bucketNameExists ? "border-red-500 ring-1 ring-red-200" : "border-border"}`}
                    />
                    {bucketNameCheckLoading ? (
                      <p className="text-xs text-muted-foreground mt-1">
                        Checking bucket prefix availability...
                      </p>
                    ) : bucketNameExists ? (
                      <div className="text-xs text-red-600 mt-1">
                        Bucket prefix already exists in this region. Choose a different prefix.
                      </div>
                    ) : bucketNameError ? (
                      <div className="text-xs text-red-600 mt-1">{bucketNameError.description}</div>
                    ) : null}
                    <p className="text-xs text-muted-foreground mt-1">
                      The bucket name prefix and the account Regional suffix combined must be between 3 and 63 characters long. The specified bucket name prefix must be unique within your account Regional namespace and follow the bucket naming rules.
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1">Account Regional namespace suffix</label>
                    <div className="w-full bg-input/20 border border-border rounded-md px-3 py-2 text-sm text-muted-foreground font-mono min-h-[38px]">
                      {suffix}
                    </div>
                  </div>
                </div>
                <div className="mt-3">
                  <label className="text-sm font-medium block mb-1">Full bucket name</label>
                  <div className="w-full bg-input/20 border border-border rounded-md px-3 py-2 text-sm text-muted-foreground font-mono min-h-[38px]">
                    {fullBucketName || "—"}
                  </div>
                </div>
              </>
            ) : (
              <>
                <Input
                  ref={bucketNameInputRef}
                  value={form.name}
                  onChange={(e) => set("name", e.target.value.toLowerCase().replace(/[^a-z0-9.-]/g, "-"))}
                  placeholder="amzn-s3-demo-bucket"
                  className={`w-full bg-input/40 border rounded-md px-3 py-2 text-sm font-mono ${bucketNameExists || bucketNameError ? "border-red-500 ring-1 ring-red-200" : "border-border"}`}
                />
                {bucketNameCheckLoading ? (
                  <p className="text-xs text-muted-foreground mt-1">
                    Checking bucket availability...
                  </p>
                ) : bucketNameCheckError ? (
                  <div className="text-xs text-red-600 mt-1">
                    {bucketNameCheckError}
                  </div>
                ) : bucketNameExists ? (
                  <div className="text-xs text-red-600 mt-1">
                    Bucket name already exists globally. Choose a different name.
                  </div>
                ) : bucketNameError ? (
                  <div className="text-xs text-red-600 mt-1">{bucketNameError.description}</div>
                ) : null}
                <p className="text-xs text-muted-foreground mt-1">
                  3–63 characters, unique in the global namespace. Letters, numbers, periods, hyphens.
                </p>
              </>
            )}
          </FieldRow>
        </Section>


        {/* Object Ownership */}
        <Section title="Object Ownership" icon={<ShieldCheck className="h-5 w-5 text-primary" />}>
          <p className="text-xs text-muted-foreground -mt-2 mb-3">
            Control ownership of objects written to this bucket from other AWS accounts and the use of access control lists (ACLs). Object ownership determines who can specify access to objects.
          </p>
          {isDirectory ? (
            <div className="bg-input/20 border border-border rounded-md p-4">
              <div className="text-sm font-medium">Object Ownership</div>
              <div className="text-sm text-muted-foreground">Bucket owner enforced</div>
              <p className="text-xs text-muted-foreground mt-2">
                ACLs are disabled. All objects in this bucket are owned by this account. Access to this bucket and its objects is specified using only policies.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <RadioCard
                  checked={form.objectOwnership === "acl-disabled"}
                  onChange={() => set("objectOwnership", "acl-disabled")}
                  title="ACLs disabled (recommended)"
                  desc="All objects in this bucket are owned by this account. Access to this bucket and its objects is specified using only policies."
                />
                <RadioCard
                  checked={form.objectOwnership === "acl-enabled"}
                  onChange={() => set("objectOwnership", "acl-enabled")}
                  title="ACLs enabled"
                  desc="Objects in this bucket can be owned by other AWS accounts. Access to this bucket and its objects can be specified using ACLs."
                />
              </div>
              {form.objectOwnership === "acl-enabled" && (
                <div className="mt-4 space-y-4">
                  <div className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs flex gap-2">
                    <span className="text-warning">⚠</span>
                    <span>
                      We recommend disabling ACLs, unless you need to control access for each object individually or to have the object writer own the data they upload. Using a bucket policy instead of ACLs to share data with users outside of your account simplifies permissions management and auditing.
                    </span>
                  </div>
                  <div>
                    <div className="text-sm font-medium mb-2">Object Ownership</div>
                    <div className="space-y-2">
                      <RadioRow
                        checked={form.aclOwnership === "bucket-owner-preferred"}
                        onChange={() => set("aclOwnership", "bucket-owner-preferred")}
                        title="Bucket owner preferred"
                        desc="If new objects written to this bucket specify the bucket-owner-full-control canned ACL, they are owned by the bucket owner. Otherwise, they are owned by the object writer."
                      />
                      <RadioRow
                        checked={form.aclOwnership === "object-writer"}
                        onChange={() => set("aclOwnership", "object-writer")}
                        title="Object writer"
                        desc="The object writer remains the object owner."
                      />
                    </div>
                  </div>
                  {form.aclOwnership === "bucket-owner-preferred" && (
                    <div className="rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-xs flex gap-2">
                      <span className="text-primary">ⓘ</span>
                      <span>
                        If you want to enforce object ownership for new objects only, your bucket policy must specify that the bucket-owner-full-control canned ACL is required for object uploads.
                      </span>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </Section>

        {/* Block Public Access */}
        <Section id="bucket-public-access" title="Block Public Access settings for this bucket" icon={<ShieldBan className="h-5 w-5 text-primary" />}>
          <p className="text-xs text-muted-foreground -mt-2 mb-3">
            {isDirectory
              ? "The settings specified here apply only to this directory bucket. These settings can't be edited. "
              : "S3 recommends blocking all public access. Customize if you require some public access. "}
          </p>
          {isDirectory ? (
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded-full bg-success flex items-center justify-center">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 5.5L3.5 8L9 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              <div>
                <div className="text-sm font-medium">Block <em>all</em> public access</div>
                <div className="text-xs text-muted-foreground">On</div>
              </div>
            </div>
          ) : (
            <>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.blockAllPublic}
                  onChange={(e) => {
                    const v = e.target.checked;
                    set("blockAllPublic", v);
                    set("blockNewAcls", v);
                    set("blockAnyAcls", v);
                    set("blockNewPolicies", v);
                    set("blockCrossAccountPolicies", v);
                    if (v) set("acknowledgeBlockPublic", false);
                  }}
                  className="mt-0.5 h-4 w-4 accent-primary"
                />
                <div>
                  <div className="text-sm font-medium">Block <em>all</em> public access</div>
                  <div className="text-xs text-muted-foreground">
                    Turning this on is the same as turning on all four settings below. Each of the following settings are independent of one another.
                  </div>
                </div>
              </label>
              <div className="pl-6 mt-3 space-y-3">
                {([
                  ["blockNewAcls", <>Block public access to buckets and objects granted through <em>new</em> access control lists (ACLs)</>, "S3 will block public access permissions applied to newly added buckets or objects, and prevent the creation of new public access ACLs for existing buckets and objects. This setting doesn't change any existing permissions that allow public access to S3 resources using ACLs."],
                  ["blockAnyAcls", <>Block public access to buckets and objects granted through <em>any</em> access control lists (ACLs)</>, "S3 will ignore all ACLs that grant public access to buckets and objects."],
                  ["blockNewPolicies", <>Block public access to buckets and objects granted through <em>new</em> public bucket or access point policies</>, "S3 will block new bucket and access point policies that grant public access to buckets and objects. This setting doesn't change any existing policies that allow public access to S3 resources."],
                  ["blockCrossAccountPolicies", <>Block public and cross-account access to buckets and objects through <em>any</em> public bucket or access point policies</>, "S3 will ignore public and cross-account access for buckets or access points with policies that grant public access to buckets and objects."],
                ] as const).map(([key, title, desc]) => (
                  <label key={key} className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form[key] as boolean}
                      onChange={(e) => {
                        set(key, e.target.checked);
                        if (!e.target.checked) set("blockAllPublic", false);
                        else {
                          const others = (["blockNewAcls", "blockAnyAcls", "blockNewPolicies", "blockCrossAccountPolicies"] as const).filter(k => k !== key);
                          if (others.every(k => form[k])) set("blockAllPublic", true);
                        }
                      }}
                      className="mt-0.5 h-3.5 w-3.5 accent-primary"
                    />
                    <div>
                      <div className="text-xs font-medium">{title}</div>
                      <div className="text-[11px] text-muted-foreground">{desc}</div>
                    </div>
                  </label>
                ))}
              </div>
              {blockAllPublicOff && (
                <div className={`bg-warning/10 border rounded-md p-3 mt-4 ${publicAccessAckError ? "border-red-500 ring-1 ring-red-200" : "border-warning/40"}`}>
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={16} className="text-warning mt-0.5 shrink-0" />
                    <div className="text-xs">
                      <div className="font-medium mb-1">Turning off block all public access might result in this bucket and the objects within becoming public</div>
                      <div className="text-muted-foreground">
                        AWS recommends that you turn on block all public access, unless public access is required for specific and verified use cases such as static website hosting.
                      </div>
                    </div>
                  </div>
                  <label className="flex items-start gap-2 mt-3 ml-6 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.acknowledgeBlockPublic}
                      onChange={(e) => set("acknowledgeBlockPublic", e.target.checked)}
                      className="mt-0.5 h-3.5 w-3.5 accent-primary"
                    />
                    <span className="text-xs">I acknowledge that the current settings might result in this bucket and the objects within becoming public.</span>
                  </label>
                  {publicAccessAckError && (
                    <div className="text-xs text-red-600 mt-2 ml-6">You must acknowledge this before creating the bucket.</div>
                  )}
                </div>
              )}
            </>

          )}
        </Section>

        {/* Versioning — only for general purpose */}
        {!isDirectory && (
          <Section title="Bucket Versioning" icon={<GitBranch className="h-5 w-5 text-primary" />}>
            <p className="text-xs text-muted-foreground -mt-2 mb-3">
              Keep multiple variants of an object in the same bucket to preserve, retrieve, and restore versions.
            </p>
            <RadioRow
              checked={!form.versioning}
              onChange={() => set("versioning", false)}
              title="Disable"
            />
            <RadioRow
              checked={form.versioning}
              onChange={() => set("versioning", true)}
              title="Enable"
            />
          </Section>
        )}


        {/* Encryption */}
        <Section title="Default Encryption" icon={<Shield className="h-5 w-5 text-primary" />}>
          <p className="text-xs text-muted-foreground -mt-2 mb-3">
            Server-side encryption is automatically applied to new objects stored in this bucket.
          </p>
          <div className="text-sm font-medium mb-2">Encryption type</div>
          <p className="text-xs text-muted-foreground mb-2">
            Secure your objects with two separate layers of encryption. For details on pricing, see DSSE-KMS pricing on the Storage tab.
          </p>
          <RadioRow
            checked={form.encryptionType === "SSE-S3"}
            onChange={() => set("encryptionType", "SSE-S3")}
            title="Server-side encryption with Amazon S3 managed keys (SSE-S3)"
          />
          <div className="mt-4 rounded-lg border border-border bg-muted/50 p-4 text-sm text-foreground">
            <div className="font-medium text-foreground mb-3">Bucket key</div>
            <RadioRow
              checked={!form.bucketKey}
              onChange={() => set("bucketKey", false)}
              title="Disable"
            />
            <RadioRow
              checked={form.bucketKey}
              onChange={() => set("bucketKey", true)}
              title="Enable"
            />


          </div>
        </Section>

        <section id="bucket-justification" className="glass-panel rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Business Justification</h2>
          </div>

          <div className="space-y-3">
            <Textarea
              id="justification"
              className="resize-none overflow-y-auto"
              placeholder="Provide a brief justification for this bucket request."
              value={form.justification}
              onChange={(e) => set("justification", e.target.value)}
              onBlur={() => setJustificationTouched(true)}
              rows={3}
              maxLength={250}
            />
            <div className="flex justify-between items-center">
              {justificationError ? (
                <div className="text-xs text-red-600">{justificationError.description}</div>
              ) : <span />}
              <p className="text-xs text-muted-foreground">{form.justification.length}/250</p>
            </div>
          </div>
        </section>

        <div className="flex items-center justify-end gap-3 mt-6">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={async () => {
              setSubmitted(true);
              const nameErr = validateBucketName();
              const justErr = validateJustification();
              if (nameErr || bucketNameExists || bucketNameCheckLoading || bucketNameCheckError) {
                bucketNameInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                bucketNameInputRef.current?.focus();
                return;
              }
              if (justErr) {
                document.getElementById("bucket-justification")?.scrollIntoView({ behavior: "smooth", block: "center" });
                return;
              }
              if (publicAccessRiskUnacknowledged) {
                document.getElementById("bucket-public-access")?.scrollIntoView({ behavior: "smooth", block: "center" });
                return;
              }
              if (!isDirectory) {
                try {
                  const res = await checkBucketNameApi(
                    isRegional ? form.namePrefix : fullBucketName,
                    form.region,
                    isRegional ? "ACCOUNT_REGIONAL" : "GLOBAL"
                  );
                  if (res.exists) { setBucketNameExists(true); return; }
                } catch (err) {
                    console.error(err);
                    return;
                }
              }
              setIsConfirmOpen(true);
            }}
          >
            Create Bucket
          </Button>
        </div>
      </div>

      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent 
          className="sm:max-w-lg max-h-[85vh] flex flex-col" 
          onInteractOutside={(event) => event.preventDefault()}>
          <div className="p-4 pb-4 border-b">
            <DialogHeader className="text-center items-center">
              <DialogTitle className="text-xl font-semibold text-foreground">
                Confirm Bucket Creation
              </DialogTitle>
              <DialogDescription className="text-muted-foreground mt-2">
                Please review the details below before creating your bucket.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="space-y-4 mt-4 text-sm overflow-y-auto model-scroll-hide flex-1 px-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-xs text-muted-foreground mb-1">Bucket Type</p>
                <p className="font-medium text-foreground capitalize">{form.bucketType}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-xs text-muted-foreground mb-1">AWS Region</p>
                <p className="font-medium text-foreground">{REGIONS.find(([v]) => v === form.region)?.[1]} ({form.region})</p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-xs text-muted-foreground mb-1">Bucket Name</p>
              <p className="font-medium text-foreground break-all">{fullBucketName}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-xs text-muted-foreground mb-1">Object Ownership</p>
                <p className="font-medium text-foreground">{form.objectOwnership === "acl-disabled" ? "ACLs disabled" : "ACLs enabled"}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-xs text-muted-foreground mb-1">Versioning</p>
                <p className="font-medium text-foreground">{form.versioning ? "Enabled" : "Disabled"}</p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-xs text-muted-foreground mb-1">Default Encryption</p>
              <p className="font-medium text-foreground">{form.encryptionType}</p>
            </div>

            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-xs text-muted-foreground mb-1">Justification</p>
              <p className="font-medium text-foreground whitespace-pre-wrap">{form.justification || "—"}</p>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsConfirmOpen(false)}>
                  Go Back & Edit
                </Button>
                <Button
                  disabled={isSubmitting}
                  onClick={async () => {
                    setIsSubmitting(true);
                    try {
                      await onSubmit({ ...form, name: fullBucketName });
                    } finally {
                      setIsSubmitting(false);
                      setIsConfirmOpen(false);
                    }
                  }}
                >
                  {isSubmitting ? "Submitting..." : "Confirm & Submit"}
                </Button>
              </DialogFooter>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}