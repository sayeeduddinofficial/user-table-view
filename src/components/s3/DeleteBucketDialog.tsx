import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { S3Bucket } from "@/utils/s3.utils";

export function DeleteBucketDialog({
  bucket, open, onOpenChange, onConfirm,
}: {
  bucket: S3Bucket | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void> | void;
}) {
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const canDelete = !!bucket && confirmText === bucket.name;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setConfirmText("");
          setIsDeleting(false);
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-xl gap-8">
        <DialogHeader>
          <DialogTitle>Delete bucket "{bucket?.name}"?</DialogTitle>
        </DialogHeader>
        <div className="border border-amber-500/40 bg-amber-500/10 dark:bg-amber-950/30 rounded p-4 text-sm">
          <div className="flex gap-3">
            <AlertTriangle size={18} className="text-amber-500 mt-0.5 shrink-0" />
            <ul className="list-disc pl-5 space-y-1 text-foreground">
              <li>Deleting a bucket cannot be undone.</li>
              <li>Bucket names are unique. If you delete a bucket, another AWS user can use the name.</li>
              <li>If this bucket is used with a Multi-Region Access Point in an external account, initiate failover before deleting the bucket.</li>
              <li>If this bucket is used with an access point in an external account, the requests made through those access points will fail after you delete this bucket.</li>
            </ul>
          </div>
        </div>
        <div>
          <p className="text-sm mb-2">To confirm deletion, enter the name of the bucket in the text input field.</p>
          <input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={bucket?.name}
            className="w-full h-9 px-3 text-sm rounded border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="flex items-center justify-end gap-3 pt-2">
          <button onClick={() => onOpenChange(false)} className="text-sm text-primary hover:underline">Cancel</button>
          <Button
            size="sm"
            variant="destructive"
            disabled={!canDelete || isDeleting}
            onClick={async () => {
              setIsDeleting(true);
              try {
                await onConfirm();
              } finally {
                setIsDeleting(false);
              }
            }}
          >
            {isDeleting ? "Deleting..." : "Delete bucket"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
