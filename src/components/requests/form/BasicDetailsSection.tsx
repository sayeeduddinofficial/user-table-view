import { RefObject } from "react";
import { Zap, Server } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ENVIRONMENT_TAGS,
  SPLUNK_VERSIONS,
  type CategoryType,
  type EnvironmentTag,
} from "@/types";

type Props = {
  environmentTag: EnvironmentTag;
  setEnvironmentTag: (value: EnvironmentTag) => void;
  projectIdentifier: string;
  setProjectIdentifier: (value: string) => void;
  projectIdentifierError: string;
  setProjectIdentifierError: (value: string) => void;
  projectIdentifierRef: RefObject<HTMLInputElement>;
  category: CategoryType | null;
  splunkVersion: string;
  setSplunkVersion: (value: string) => void;
  splunkVersionError: string;
  setSplunkVersionError: (value: string) => void;
  splunkVersionSectionRef: RefObject<HTMLDivElement>;
  submitted: boolean;
};

export function BasicDetailsSection({
  environmentTag,
  setEnvironmentTag,
  projectIdentifier,
  setProjectIdentifier,
  projectIdentifierError,
  setProjectIdentifierError,
  projectIdentifierRef,
  category,
  splunkVersion,
  setSplunkVersion,
  splunkVersionError,
  setSplunkVersionError,
  splunkVersionSectionRef,
  submitted,
}: Props) {
  return (
    <section className="glass-panel rounded-xl p-6">
      <h2 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
        <Zap className="h-5 w-5 text-primary" />
        Environment Configuration
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <Label>Environment Tag</Label>
          <Select
            value={environmentTag}
            onValueChange={(v) => setEnvironmentTag(v as EnvironmentTag)}
          >
            <SelectTrigger className="bg-muted/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ENVIRONMENT_TAGS.map((tag) => (
                <SelectItem key={tag.value} value={tag.value}>
                  {tag.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Used for EC2 tagging
          </p>
        </div>

        <div className="space-y-3">
          <Label htmlFor="project">Project Identifier</Label>
          <Input
            id="project"
            ref={projectIdentifierRef}
            placeholder="e.g., splunk-prod, analytics-lab"
            value={projectIdentifier}
            onChange={(e) => {
              const v = e.target.value;
              setProjectIdentifier(v);
              if (!v.trim()) {
                setProjectIdentifierError("Project Identifier is required");
              } else if (!/^[a-zA-Z0-9_-]+$/.test(v)) {
                setProjectIdentifierError("projectIdentifier can only contain letters, numbers, hyphens, and underscores");
              } else if (category === 5 && !/^[a-z0-9-]{1,32}$/i.test(v)) {
                setProjectIdentifierError("Only letters, numbers, and hyphens(-), max 32 characters for category 5");
              } else {
                setProjectIdentifierError("");
              }
            }}
            className={`bg-muted/50 ${projectIdentifierError ? "border-destructive" : ""}`}
            spellCheck={false}
          />
          {projectIdentifierError && (
            <p className="text-xs text-destructive">{projectIdentifierError}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Project tag for resource tracking
          </p>
        </div>
      </div>
      {category !== 1 && (
        <div ref={splunkVersionSectionRef} className="mt-6 space-y-3">
          <Label className="flex items-center gap-2">
            <Server className="h-4 w-4" />
            Splunk Version
          </Label>

          <Select
            value={splunkVersion}
            onValueChange={(v) => { setSplunkVersion(v); if (submitted) setSplunkVersionError(""); }}
          >
            <SelectTrigger className="bg-muted/50">
              <SelectValue
                placeholder={
                  <span className="text-muted-foreground">
                    Select Splunk Version
                  </span>
                }
              />
            </SelectTrigger>

            <SelectContent>
              {SPLUNK_VERSIONS.map((version) => (
                <SelectItem
                  key={version.value}
                  value={version.value}
                >
                  {version.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {submitted && splunkVersionError && (
            <p className="text-xs text-destructive">{splunkVersionError}</p>
          )}

          <p className="text-xs text-muted-foreground">
            Splunk version to install on provisioned VMs
          </p>
        </div>
      )}
    </section>
  );
}
