import { useState } from "react";
import { useAppStore } from "@/store/appStore";
import { Button } from "@/components/ui/button";
import { useNavigate, Link } from "react-router-dom";
import {
  ChevronRight,
  ExternalLink,
  Info,
  RefreshCw,
} from "lucide-react";
import { TagsEditor, type Tag } from "./TagsEditor";
import { vpcApi } from "./vpcApi";

export function CreateEncryption({ onClose }: { onClose?: () => void } = {}) {
  const navigate = useNavigate();
  const close = () => (onClose ? onClose() : navigate("/aws/vpcs?tab=encryption"));
  const vpcs = useAppStore((s) => s.vpcs);
  const vpcIds = vpcs.map((v: any) => v.id);

  const [name, setName] = useState("");
  const [vpcId, setVpcId] = useState(vpcIds[0] ?? "vpc-8f7f7ae7");
  const [mode, setMode] = useState<"monitor" | "enforce">("monitor");
  const [tags, setTags] = useState<Tag[]>([]);

  const handleCancel = () => close();
  const handleCreate = () => {
    vpcApi.createEncryptionControl();
    close();
  };

  return (
    <>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4 p-6">
          <Link to="/aws/vpcs" className="hover:text-foreground">VPCs</Link>
          <ChevronRight size={14} />
          <Link to="/aws/vpcs?tab=encryption" className="hover:text-foreground">Encryption controls</Link>
          <ChevronRight size={14} />
          <span className="text-foreground">Create VPC encryption control</span>
        </div>

      <div className="max-w-5xl mx-auto space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold">Create encryption control</h1>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Encrypt all network traffic within and between VPCs, while enforcing
          encryption-capable resources and providing audit visibility through flow logs.{" "}
          <a
            href="#"
            className="text-primary inline-flex items-center gap-1 hover:underline"
          >
            Additional charges apply <ExternalLink size={11} />
          </a>
        </p>
      </div>

      {/* Settings */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-5">
        <h2 className="text-base font-semibold">Encryption control settings</h2>

        <div>
          <label className="block text-sm font-medium">
            Name{" "}
            <span className="italic font-normal text-muted-foreground">
              - optional
            </span>
          </label>
          <p className="text-xs text-muted-foreground mb-1.5">
            Creates a tag with a key of 'Name' and a value that you specify.
          </p>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="my-encryption-control"
            maxLength={255}
            className="w-full px-3 py-1.5 text-sm bg-input/40 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Character count: {name.length}/255
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium">
            VPC{" "}
          </label>
          <p className="text-xs text-muted-foreground mb-1.5">
            Select the VPC for which you want to create an encryption control.
          </p>
          <div className="flex items-center gap-2">
            <select
              value={vpcId}
              onChange={(e) => setVpcId(e.target.value)}
              className="flex-1 px-3 py-1.5 text-sm bg-input/40 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring/40"
            >
              {(vpcIds.length ? vpcIds : ["vpc-8f7f7ae7"]).map((id: string) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
            <button
              className="p-1.5 rounded-full border border-border hover:bg-accent/40"
              aria-label="Refresh"
            >
              <RefreshCw size={14} />
            </button>
            <Link to="/aws/vpcs/create">
              <Button
                variant="outline"
                size="sm"
                className="text-primary border-primary/40 gap-1"
              >
                Create a VPC <ExternalLink size={12} />
              </Button>
            </Link>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium">
            Encryption mode{" "}
          </label>
          <p className="text-xs text-muted-foreground mb-2">
            Monitor mode provides visibility into encryption status without blocking
            traffic. Enforce mode prevents unencrypted traffic.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setMode("monitor")}
              className={`text-left p-3 rounded-md border-2 transition-colors ${mode === "monitor" ? "border-primary bg-primary/5" : "border-border"}`}
            >
              <div className="flex items-center gap-2 text-sm font-medium">
                <span
                  className={`w-3.5 h-3.5 rounded-full border-2 ${mode === "monitor" ? "border-primary bg-primary ring-2 ring-primary/30" : "border-muted-foreground"}`}
                />
                Monitor mode
              </div>
              <p className="text-xs text-muted-foreground mt-1.5 ml-5">
                See which resources in your VPC are unencrypted but allow the creation
                of unencrypted resources.
              </p>
            </button>
            <button
              type="button"
              onClick={() => setMode("enforce")}
              className={`text-left p-3 rounded-md border-2 transition-colors ${mode === "enforce" ? "border-primary bg-primary/5" : "border-border"} opacity-60`}
            >
              <div className="flex items-center gap-2 text-sm font-medium">
                <span
                  className={`w-3.5 h-3.5 rounded-full border-2 ${mode === "enforce" ? "border-primary bg-primary ring-2 ring-primary/30" : "border-muted-foreground"}`}
                />
                Enforce mode
              </div>
              <p className="text-xs text-muted-foreground mt-1.5 ml-5">
                Requires all resources, except exclusions, in your VPC to be
                encryption-capable and blocks creation of unencrypted resources.
              </p>
            </button>
          </div>
          <div className="mt-3 flex items-start gap-2 p-3 rounded-md border border-primary/40 bg-primary/5 text-xs">
            <Info size={14} className="text-primary shrink-0 mt-0.5" />
            <span>
              You may switch to enforce mode once all VPC resources are either
              encrypted or excluded from encryption requirements. Note that these
              exclusions can only be marked at the time of switching to enforce
              mode.
            </span>
          </div>
        </div>
      </div>

      {/* Tags */}
      <section className="bg-card border border-border rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-1">Tags</h2>
        <div className="text-xs text-muted-foreground mb-4 leading-relaxed">
          A tag is a label that you assign to an AWS resource. Each tag consists of a key and an optional value. You can use tags to search and filter your resources or track your AWS costs.
        </div>

        <TagsEditor
          tags={tags}
          onChange={setTags}
          addLabel="Add tag"
          emptyMessage="No tags associated with the resource"
        />
      </section>

      {/* Footer */}
      <div className="flex justify-end items-center gap-3 pb-4">
        <button
          onClick={handleCancel}
          className="text-sm text-primary hover:underline px-3 py-1.5"
        >
          Cancel
        </button>
        <Button
          size="sm"
          className="bg-primary hover:bg-primary/90 text-white"
          onClick={handleCreate}
        >
          Create encryption control
        </Button>
      </div>
    </div>
    </>
  );
}