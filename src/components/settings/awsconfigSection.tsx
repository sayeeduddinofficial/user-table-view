import { Cloud, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAwsSettings } from "@/hooks/useawssettings";
import { getAwsStatusStyles, formatAwsStatus } from "@/utils/awsstatus";

interface Props {
  canEdit: boolean;
}

export function AwsConfigSection({ canEdit }: Props) {
  const {editMode,accessKeyId,secretKey,region,amiId,awsError,fieldErrors,awsConfig,isLoading,setAccessKeyId,setSecretKey,setRegion,clearFieldError,startEdit,cancelEdit,save,} = useAwsSettings();

  return (
    <section className="glass-panel rounded-xl p-6 hover:border-primary/30 transition-colors">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-warning/10">
          <Cloud className="h-5 w-5 text-warning" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            AWS Configuration
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage AWS credentials and regions
          </p>
        </div>
        {awsConfig?.status !== "CONNECTION_UNAVAILABLE" && (
          <Badge
            variant="outline"
            className={`ml-auto ${getAwsStatusStyles(awsConfig?.status)}`}
          >
            {formatAwsStatus(awsConfig?.status)}
          </Badge>
        )}
      </div>

      {/* ── Body ── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            {/* Access Key ID */}
            <div className="space-y-2">
              <Label>
                AWS Access Key ID <span className="text-red-500">*</span>
              </Label>
              <Input
                value={!editMode ? (awsConfig?.accessKeyId ?? "") : accessKeyId}
                onChange={(e) => {
                  setAccessKeyId(e.target.value);
                  if (fieldErrors.accessKeyId) clearFieldError("accessKeyId");
                }}
                readOnly={!editMode}
                className={`bg-muted/50 ${fieldErrors.accessKeyId ? "border-red-500" : ""}`}
              />
              {fieldErrors.accessKeyId && (
                <p className="text-xs text-red-500">
                  {fieldErrors.accessKeyId}
                </p>
              )}
            </div>

            {/* Secret Access Key */}
            <div className="space-y-2">
              <Label>
                AWS Secret Access Key <span className="text-red-500">*</span>
              </Label>
              <Input
                value={!editMode ? (awsConfig?.secretKey ?? "") : secretKey}
                onChange={(e) => {
                  setSecretKey(e.target.value);
                  if (fieldErrors.secretAccessKey)
                    clearFieldError("secretAccessKey");
                }}
                readOnly={!editMode}
                className={`bg-muted/50 ${fieldErrors.secretAccessKey ? "border-red-500" : ""}`}
              />
              {fieldErrors.secretAccessKey && (
                <p className="text-xs text-red-500">
                  {fieldErrors.secretAccessKey}
                </p>
              )}
            </div>

            {/* Region */}
            <div className="space-y-2">
              <Label>
                Default Region <span className="text-red-500">*</span>
              </Label>
              <Input
                value={!editMode ? (awsConfig?.region ?? "") : region}
                onChange={(e) => {
                  setRegion(e.target.value);
                  if (fieldErrors.region) clearFieldError("region");
                }}
                readOnly={!editMode}
                className={`bg-muted/50 ${fieldErrors.region ? "border-red-500" : ""}`}
              />
              {fieldErrors.region && (
                <p className="text-xs text-red-500">{fieldErrors.region}</p>
              )}
            </div>

            {/* AMI ID — always read-only / disabled */}
            <div className="space-y-2">
              <Label>AMI ID</Label>
              <Input
                placeholder="ami-03ea746da1a2e367e"
                value={!editMode ? (awsConfig?.amiId ?? "") : amiId}
                readOnly
                disabled
                className="bg-muted/50"
              />
            </div>
          </div>

          {/* ── Action buttons (super admin only) ── */}
          {canEdit && (
            <div className="mt-4 flex gap-2">
              {!editMode ? (
                <Button
                  variant={
                    awsConfig?.status === "CONNECTION_UNAVAILABLE"
                      ? "default"
                      : "outline"
                  }
                  onClick={startEdit}
                >
                  {awsConfig?.status !== "CONNECTION_UNAVAILABLE"
                    ? "Edit Credentials"
                    : "Add Credentials"}
                </Button>
              ) : (
                <>
                  <Button onClick={save}>Save Credentials</Button>
                  <Button variant="outline" onClick={cancelEdit}>
                    Cancel
                  </Button>
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* ── AWS-level error banner ── */}
      {awsError && (
        <div className="mt-3 flex justify-start">
          <div className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-red-500/10 border border-red-500/30 text-red-400 text-sm max-w-fit">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 flex-shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span className="break-words">{awsError}</span>
          </div>
        </div>
      )}
    </section>
  );
}
