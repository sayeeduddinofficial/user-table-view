import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function CreateFolderDialog({
  open, onOpenChange, onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (name: string) => Promise<boolean>;
}) {
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const valid = name.length > 0 && !name.includes("/");

  useEffect(() => {
    if (!open) setName("");
  }, [open]);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Folder</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          Use folders to group objects in buckets. When you create a folder, S3 creates an object using the name that you specify followed by a slash (/). This object then appears as folder on the console.
        </p>
        <div className="border border-border rounded p-5 bg-card">
          <h2 className="font-semibold mb-3">Folder</h2>
          <div className="text-xs font-semibold mb-1">Folder name</div>
          <div className="flex items-center gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter folder name"
              className="flex-1 h-9 px-3 text-sm rounded border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            />

          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Folder names can't contain "/".
          </p>
        </div>
        <div className="flex items-center justify-end gap-3 pt-2">
         <Button variant="outline" onClick={() => onOpenChange(false)}>
                   Cancel
          </Button>
          <Button
            size="sm"
            disabled={!valid || isSubmitting}
            onClick={async () => {
              setIsSubmitting(true);
              const success = await onCreate(name);
              setIsSubmitting(false);
              if (success) onOpenChange(false);
            }}
          >
            {isSubmitting ? "Creating..." : "Create Folder"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}