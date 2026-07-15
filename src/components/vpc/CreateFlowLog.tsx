import { useState } from "react";
import { useAppStore } from "@/store/appStore";
import { Button } from "@/components/ui/button";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { Segmented } from "@/components/vpc/uiBits";
import { TagsEditor, type Tag } from "@/components/vpc/TagsEditor";
import { vpcApi } from "@/components/vpc/vpcApi";

export function CreateFlowLog() {
  const navigate = useNavigate();
  const params = useParams<{ vpcId: string }>();
  const vpcs = useAppStore((s) => s.vpcs);

  const targetVpcId = params.vpcId || vpcs[0]?.id || "vpc-default";

  // Form States
  const [name, setName] = useState("");
  const [filter, setFilter] = useState<"ALL" | "ACCEPT" | "REJECT">("ALL");
  const [maxInterval, setMaxInterval] = useState<"600" | "60">("600");
  const [destination, setDestination] = useState<"cloudwatch" | "s3" | "firehose-same" | "firehose-diff">("cloudwatch");
  const [s3Arn, setS3Arn] = useState("");
  const [firehoseArn, setFirehoseArn] = useState("");
  const [crossAccountRoleArn, setCrossAccountRoleArn] = useState("");
  const [logGroup, setLogGroup] = useState("");
  const [iamRole, setIamRole] = useState("DestinationLogGroupRole");
  const [logFormat, setLogFormat] = useState<"aws-default" | "custom">("aws-default");

  const [tags, setTags] = useState<Tag[]>([]);

  const handleCreate = () => {
    vpcApi.createFlowLog();
    navigate(`/aws/vpcs/${targetVpcId}`);
  };

  return (
    <>        
      {/* Breadcrumb Navigation matching detail header */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground p-6">
        <Link to="/aws/vpcs" className="text-primary hover:underline">VPCs</Link>
        <ChevronRight size={14} />
        <span>Create flow log</span>
      </div>

      <div className="space-y-6 max-w-5xl mx-auto p-2">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Create flow log</h1>
        <p className="text-sm text-muted-foreground mt-1">
          A flow log captures IP traffic tracking data for network interfaces across your VPC infrastructure.
        </p>
      </div>

      {/* Main Form Box matching Create VPC paneling */}
      <div className="bg-card border border-border rounded-lg p-6 space-y-6">
        
        {/* Name Tag Option */}
        <div className="space-y-2">
          <label className="text-sm font-medium block">
            Name tag <span className="text-xs text-muted-foreground font-normal italic">— optional</span>
          </label>
          <input
            type="text"
            placeholder="production-vpc-flowlog"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setTags(prev => prev.map(t => t.key === "Name" ? { ...t, value: e.target.value } : t));
            }}
            className="w-full max-w-md bg-background border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Targeted Resource Info */}
        <div className="space-y-2">
          <label className="text-sm font-medium block">Resource ID</label>
          <input
            type="text"
            value={targetVpcId}
            disabled
            className="w-full max-w-md bg-muted/40 border border-border rounded-md px-3 py-1.5 font-mono text-xs text-muted-foreground cursor-not-allowed"
          />
        </div>

        {/* Filter - Uses Segmented control */}
        <div className="space-y-2">
          <label className="text-sm font-medium block">Filter</label>
          <Segmented
            value={filter}
            options={["ALL", "ACCEPT", "REJECT"]}
            onChange={(val) => setFilter(val)}
            labels={{
              ALL: "All Traffic",
              ACCEPT: "Accept Only",
              REJECT: "Reject Only"
            }}
          />
        </div>

        {/* Maximum aggregation interval - Uses Segmented control */}
        <div className="space-y-2">
          <label className="text-sm font-medium block">Maximum aggregation interval</label>
          <Segmented
            value={maxInterval}
            options={["600", "60"]}
            onChange={(val) => setMaxInterval(val)}
            labels={{
              "600": "10 minutes",
              "60": "1 minute"
            }}
          />
        </div>

        {/* Destination Target Choice - Uses Segmented control */}
        <div className="space-y-2">
          <label className="text-sm font-medium block">Destination</label>
          <Segmented
            value={destination}
            options={["cloudwatch", "s3", "firehose-same", "firehose-diff"]}
            onChange={(val) => setDestination(val)}
            labels={{
            cloudwatch: "Send to CloudWatch Logs",
            s3: "Send to an Amazon S3 bucket",
            "firehose-same": "Send to Amazon Data Firehose in the same account",
            "firehose-diff": "Send to Amazon Data Firehose in a different account"
            }}
        />
        </div>

        {/* Dynamic Conditional Input Rows */}
{destination === "cloudwatch" && (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 max-w-3xl">
    <div className="space-y-2">
      <label className="text-sm font-medium block">Destination log group</label>
      <input
        type="text"
        placeholder="vpc-flow-logs"
        value={logGroup}
        onChange={(e) => setLogGroup(e.target.value)}
        className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
      />
    </div>
    <div className="space-y-2">
      <label className="text-sm font-medium block">IAM role</label>
      <input
        type="text"
        value={iamRole}
        onChange={(e) => setIamRole(e.target.value)}
        className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
      />
    </div>
  </div>
)}

{destination === "s3" && (
  <div className="space-y-2 pt-2 max-w-xl">
    <label className="text-sm font-medium block">S3 bucket ARN</label>
    <input
      type="text"
      placeholder="arn:aws:s3:::my-flow-log-bucket"
      value={s3Arn}
      onChange={(e) => setS3Arn(e.target.value)}
      className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
    />
  </div>
)}

{destination === "firehose-same" && (
  <div className="space-y-2 pt-2 max-w-xl">
    <label className="text-sm font-medium block">Amazon Firehose stream name</label>
    <input
      type="text"
      placeholder="arn:aws:firehose:us-east-1:123456789012:deliverystream/stream-name"
      value={firehoseArn}
      onChange={(e) => setFirehoseArn(e.target.value)}
      className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
    />
  </div>
)}

{destination === "firehose-diff" && (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 max-w-3xl">
    <div className="space-y-2">
      <label className="text-sm font-medium block">Amazon Firehose stream ARN</label>
      <input
        type="text"
        placeholder="arn:aws:firehose:us-east-1:999999999999:deliverystream/cross-account-stream"
        value={firehoseArn}
        onChange={(e) => setFirehoseArn(e.target.value)}
        className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
      />
    </div>
    <div className="space-y-2">
      <label className="text-sm font-medium block">External account IAM role</label>
      <input
        type="text"
        placeholder="arn:aws:iam::123456789012:role/MyCrossAccountDeliveryRole"
        value={crossAccountRoleArn}
        onChange={(e) => setCrossAccountRoleArn(e.target.value)}
        className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
      />
    </div>
  </div>
)}

        {/* Log Record Format - Uses Segmented control */}
        <div className="space-y-2 pt-2">
          <label className="text-sm font-medium block">Log record format</label>
          <Segmented
            value={logFormat}
            options={["aws-default", "custom"]}
            onChange={(val) => setLogFormat(val)}
            labels={{
              "aws-default": "AWS default format",
              "custom": "Custom format"
            }}
          />
        </div>
      </div>

      {/* Tags Form Panel matches secondary configuration block schemas */}
      <div className="bg-card border border-border rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">Tags ({tags.length})</h2>
        </div>

        <TagsEditor
          tags={tags}
          onChange={setTags}
          variant="card"
          monoInputs
          lockedKeys={["Name"]}
          addLabel="Add new tag"
        />
      </div>

      {/* Footer Bottom Actions */}
      <div className="flex justify-end items-center gap-3 pt-2">
        <Link
          to={`/aws/vpcs/${targetVpcId}`}
          className="text-sm text-primary hover:underline px-3 py-1.5"
        >
          Cancel
        </Link>
        <Button
          size="sm"
          className="bg-primary hover:bg-primary/90 text-white font-medium"
          onClick={handleCreate}
        >
          Create flow log
        </Button>
      </div>

    </div>
    </>
  );
}