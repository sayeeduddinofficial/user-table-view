import { useNavigate } from "react-router-dom";
import { useState, type ReactNode } from "react";
import { AlertTriangle, Plus, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type Rule = {
  id: number;
  type: string;
  protocol: string;
  portRange: string;
  source: string;
  description: string;
};

type Tag = {
  id: number;
  key: string;
  value: string;
};

const newRule = (overrides: Partial<Rule> = {}): Rule => ({
  id: Date.now() + Math.floor(Math.random() * 1000),
  type: "Custom TCP",
  protocol: "TCP",
  portRange: "0",
  source: "Custom",
  description: "",
  ...overrides,
});

const newTag = (): Tag => ({ id: Date.now() + Math.floor(Math.random() * 1000), key: "", value: "" });
const inputClass = "w-full bg-input/40 border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40";

export default function CreateSecurityGroupPage() {
  const nav = useNavigate();
  const [name, setName] = useState("NewSecurityGroup");
  const [description, setDescription] = useState("Allows SSH access to developers");
  const [vpc, setVpc] = useState("vpc-01ff7ad2");
  const [inboundRules, setInboundRules] = useState<Rule[]>([newRule({ source: "Custom" })]);
  const [outboundRules, setOutboundRules] = useState<Rule[]>([
    newRule({ type: "All traffic", protocol: "All", portRange: "All", source: "Custom" }),
    newRule(),
    newRule(),
  ]);
  const [tags, setTags] = useState<Tag[]>([newTag()]);

  const updateRule = (direction: "inbound" | "outbound", id: number, patch: Partial<Rule>) => {
    const setter = direction === "inbound" ? setInboundRules : setOutboundRules;
    setter((prev) => prev.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule)));
  };

  const removeRule = (direction: "inbound" | "outbound", id: number) => {
    const setter = direction === "inbound" ? setInboundRules : setOutboundRules;
    setter((prev) => prev.filter((rule) => rule.id !== id));
  };

  const createSecurityGroup = () => {
    toast.success("Security group creation started", { description: name || "New security group" });
    nav("/aws/load-balancers/create/alb");
  };

  return (
    <div className="max-w-[1100px] mx-auto pb-8 m-5">
      <div className="mb-5">
        <h1 className="text-2xl font-semibold">Create security group</h1>
        <p className="text-sm text-muted-foreground mt-1">
          A security group acts as a virtual firewall for your instance to control inbound and outbound traffic. To create a new security group, complete the fields below.
        </p>
      </div>

      <FormSection title="Basic details">
        <div className="space-y-4 max-w-[420px]">
          <Field label="Security group name">
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Description">
            <input value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} />
          </Field>
          <Field label="VPC">
            <select value={vpc} onChange={(e) => setVpc(e.target.value)} className={inputClass}>
              <option>vpc-01ff7ad2</option>
              <option>vpc-0a1b2c</option>
            </select>
          </Field>
        </div>
      </FormSection>

      <RuleSection
        title="Inbound rules"
        rules={inboundRules}
        sourceLabel="Source"
        onAdd={() => setInboundRules((prev) => [...prev, newRule()])}
        onChange={(id, patch) => updateRule("inbound", id, patch)}
        onRemove={(id) => removeRule("inbound", id)}
      />

      <RuleSection
        title="Outbound rules"
        rules={outboundRules}
        sourceLabel="Destination"
        onAdd={() => setOutboundRules((prev) => [...prev, newRule()])}
        onChange={(id, patch) => updateRule("outbound", id, patch)}
        onRemove={(id) => removeRule("outbound", id)}
      />

      <div className="mb-4 flex items-start gap-2 rounded-md border border-warning/50 bg-warning/10 px-3 py-2 text-xs">
        <AlertTriangle size={14} className="text-warning mt-0.5 shrink-0" />
        <div className="flex-1 text-muted-foreground">
          Rules with destination of 0.0.0.0/0 or ::/0 allow your instance to send traffic to any IPv4 or IPv6 address. We recommend setting security group rules to be more restrictive and to only allow traffic to specific known IP addresses.
        </div>
        <button type="button" className="text-muted-foreground hover:text-foreground"><X size={14} /></button>
      </div>

      <FormSection title="Tags - optional">
        <p className="text-xs text-muted-foreground mb-3">
          A tag is a label that you assign to an AWS resource. Each tag consists of a key and an optional value. You can use tags to search and filter your resources or track your AWS costs.
        </p>
        <div className="space-y-2 max-w-[780px]">
          <div className="grid grid-cols-[1fr_1fr_auto] gap-2 text-[11px] text-muted-foreground">
            <div>Key</div>
            <div>Value - optional</div>
            <div className="w-[92px]" />
          </div>
          {tags.map((tag) => (
            <div key={tag.id} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-start">
              <div>
                <input
                  value={tag.key}
                  onChange={(e) => setTags((prev) => prev.map((item) => (item.id === tag.id ? { ...item, key: e.target.value } : item)))}
                  placeholder="Enter key"
                  className={inputClass}
                />
              </div>
              <input
                value={tag.value}
                onChange={(e) => setTags((prev) => prev.map((item) => (item.id === tag.id ? { ...item, value: e.target.value } : item)))}
                placeholder="Enter value"
                className={inputClass}
              />
              <Button type="button" variant="outline" size="sm" onClick={() => setTags((prev) => prev.filter((item) => item.id !== tag.id))}>Remove</Button>
            </div>
          ))}
          <button type="button" onClick={() => setTags((prev) => [...prev, newTag()])} className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline">
            <Plus size={12} /> Add new tag
          </button>
          <p className="text-[11px] text-muted-foreground">You can add up to {50 - tags.length} more tags</p>
        </div>
      </FormSection>

      <div className="mt-6 flex justify-end gap-3">
        <Button variant="ghost" onClick={() => nav("/aws/load-balancers/create/alb")}>Cancel</Button>
        <Button onClick={createSecurityGroup} className="bg-warning text-warning-foreground hover:bg-warning/90">Create security group</Button>
      </div>
    </div>
  );
}

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border border-border rounded-lg bg-card mb-4">
      <div className="px-5 py-3 border-b border-border">
        <h2 className="text-base font-semibold">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Field({ label, info, children }: { label: string; info?: boolean; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label} {info && <span className="text-primary text-xs">Info</span>}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function RuleSection({
  title,
  rules,
  sourceLabel,
  onAdd,
  onChange,
  onRemove,
}: {
  title: string;
  rules: Rule[];
  sourceLabel: string;
  onAdd: () => void;
  onChange: (id: number, patch: Partial<Rule>) => void;
  onRemove: (id: number) => void;
}) {
  return (
    <FormSection title={title}>
      <div className="space-y-2">
        <div className="grid grid-cols-[150px_90px_130px_150px_1fr_auto] gap-2 text-[11px] text-muted-foreground">
          <div>Type</div>
          <div>Protocol</div>
          <div>Port range</div>
          <div>{sourceLabel}</div>
          <div>Description - optional</div>
          <div className="w-[78px]" />
        </div>
        {rules.map((rule) => (
          <div key={rule.id} className="grid grid-cols-[150px_90px_130px_150px_1fr_auto] gap-2 items-center">
            <select value={rule.type} onChange={(e) => onChange(rule.id, { type: e.target.value })} className={inputClass}>
              <option>Custom TCP</option>
              <option>All traffic</option>
              <option>SSH</option>
              <option>HTTP</option>
              <option>HTTPS</option>
            </select>
            <input value={rule.protocol} onChange={(e) => onChange(rule.id, { protocol: e.target.value })} className={inputClass} />
            <input value={rule.portRange} onChange={(e) => onChange(rule.id, { portRange: e.target.value })} className={inputClass} />
            <div className="flex gap-1">
              <select value={rule.source} onChange={(e) => onChange(rule.id, { source: e.target.value })} className={inputClass}>
                <option>Custom</option>
                <option>Anywhere-IPv4</option>
                <option>My IP</option>
              </select>
              <div className="relative flex-1">
                <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input className={`${inputClass} pl-7`} />
              </div>
            </div>
            <input value={rule.description} onChange={(e) => onChange(rule.id, { description: e.target.value })} className={inputClass} />
            <Button type="button" variant="outline" size="sm" onClick={() => onRemove(rule.id)}>Delete</Button>
          </div>
        ))}
        <button type="button" onClick={onAdd} className="mt-2 inline-flex items-center gap-1 rounded-full border border-primary/60 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10">
          <Plus size={12} /> Add rule
        </button>
      </div>
    </FormSection>
  );
}
