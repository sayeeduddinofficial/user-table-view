/**
 * LbBasicConfigSection.tsx
 * "Basic Configuration" section of the Load Balancer create flow:
 * AWS region, load balancer name, scheme and IP address type.
 */

import { XCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { REGIONS } from "@/utils/s3.utils";
import { validateLbName } from "@/utils/lb.utils";
import { Field, RadioCard, Section } from "../lbCreateShared";

interface LbBasicConfigSectionProps {
  isAlb: boolean;
  selectedRegion: string;
  setSelectedRegion: (value: string) => void;
  name: string;
  setName: (value: string) => void;
  nameInputRef: React.RefObject<HTMLInputElement>;
  nameErrorMsg: string | null;
  setNameErrorMsg: (value: string | null) => void;
  nameCheckLoading: boolean;
  nameExistsError: boolean;
  submitted: boolean;
  scheme: "internet-facing" | "internal";
  setScheme: (value: "internet-facing" | "internal") => void;
  ipType: string;
  setIpType: (value: string) => void;
}

export function LbBasicConfigSection({
  isAlb,
  selectedRegion,
  setSelectedRegion,
  name,
  setName,
  nameInputRef,
  nameErrorMsg,
  setNameErrorMsg,
  nameCheckLoading,
  nameExistsError,
  submitted,
  scheme,
  setScheme,
  ipType,
  setIpType,
}: LbBasicConfigSectionProps) {
  return (
    <Section id="basic-configuration" title="Basic Configuration">
      <Field label="AWS Region">
        <Select value={selectedRegion} onValueChange={setSelectedRegion}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select AWS Region" />
          </SelectTrigger>

          <SelectContent>
            {REGIONS.map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Load Balancer Name">
        <p className="text-xs text-muted-foreground m-1">Name must be unique within your AWS account and can't be changed after the load balancer is created.</p>
        <Input
          ref={nameInputRef}
          value={name}
          onChange={(e) => {
            const value = e.target.value;
            setName(value);
            setNameErrorMsg(validateLbName(value));
          }}
          className={`w-full bg-input/40 border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 ${nameErrorMsg || nameExistsError ? "border-red-500 ring-red-200" : "border-blue-500 ring-blue-200"
            }`}
          placeholder=""
        />
        {submitted && nameErrorMsg ? (
          <div className="mt-2 flex items-start gap-2 text-xs text-red-600">
            <XCircle size={14} className="mt-0.5 shrink-0" />
            <span>{nameErrorMsg}</span>
          </div>
        ) : nameCheckLoading ? (
          <p className="mt-2 text-xs text-muted-foreground">Checking availability...</p>
        ) : nameExistsError ? (
          <div className="mt-2 flex items-start gap-2 text-xs text-red-600">
            <XCircle size={14} className="mt-0.5 shrink-0" />
            <span>A load balancer named "{name}" already exists in {selectedRegion}. Choose a different name.</span>
          </div>
        ) : null}
      </Field>

      <Field label="Scheme">
        <p className="text-xs text-muted-foreground m-1">Scheme can't be changed after the load balancer is created.</p>
        <div className="grid grid-cols-2 gap-3">
          <RadioCard
            checked={scheme === "internet-facing"}
            onClick={() => setScheme("internet-facing")}
            title="Internet-facing"
            bullets={["Serves internet-facing traffic.", "Has public IP addresses.", "DNS name resolves to public IPs.", "Requires a public subnet."]}
          />
          <RadioCard
            checked={scheme === "internal"}
            onClick={() => ""}
            title="Internal"
            bullets={["Serves internal traffic.", "Has private IP addresses.", "DNS name resolves to private IPs."]}
          />
        </div>
      </Field>

      <Field label="Load Balancer IP Address Type">
        <div className="space-y-2">
          {[
            { value: "ipv4", title: "IPv4", desc: "Includes only IPv4 addresses.", disabled: false },
            { value: "dualstack", title: "Dualstack", desc: "Includes IPv4 and IPv6 addresses.", disabled: true },
            ...(scheme === "internet-facing" && isAlb
              ? [{ value: "dualstack-public", title: "Dualstack without public IPv4", desc: "Includes public IPv6 address, and private IPv4 and IPv6 addresses. Compatible with Internet-facing load balancers only.", disabled: true }]
              : []),
          ].map((opt) => (
            <label key={opt.value} className="flex items-start gap-2 cursor-pointer">
              <input
                type="radio"
                checked={ipType === opt.value}
                disabled={opt.disabled}
                onChange={() => setIpType(opt.value)}
                className="mt-1 accent-primary"
              />
              <div>
                <div className="text-sm">{opt.title}</div>
                <div className="text-xs text-muted-foreground">{opt.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </Field>
    </Section>
  );
}
