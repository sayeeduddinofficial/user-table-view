import { Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useTerraformBackend } from "@/hooks/useterraformbackend";

interface Props {
  canView: boolean;
  canEdit: boolean;
}

export function TerraformBackendSection({ canView, canEdit }: Props) {
  const { bucketName, setBucketName, loading, saving, save } =
    useTerraformBackend(canView);

  return (
    <section className="glass-panel rounded-xl p-6 hover:border-primary/30 transition-colors">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-primary/10">
          <Database className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Terraform Backend
          </h2>
          <p className="text-sm text-muted-foreground">
            State storage configuration
          </p>
        </div>
        {!canEdit && (
          <Badge variant="outline" className="ml-auto">
            Read Only
          </Badge>
        )}
      </div>

      {/* ── Fields ── */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Backend Type</Label>
          <Input value="S3" readOnly className="bg-muted/50" />
        </div>
        <div className="space-y-2">
          <Label>State Bucket</Label>
          <Input
            value={bucketName}
            onChange={(e) => setBucketName(e.target.value)}
            readOnly={!canEdit}
            className={!canEdit ? "bg-muted/50" : ""}
          />
        </div>
      </div>

      {/* ── Save button (super admin only) ── */}
      {canEdit && (
        <div className="mt-4 flex justify-end">
          <Button onClick={save} disabled={saving || loading}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      )}
    </section>
  );
}
