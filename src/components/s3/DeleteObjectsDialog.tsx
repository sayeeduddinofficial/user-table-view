import { useEffect, useState } from "react";
import { AlertTriangle, ExternalLink, Folder, FileText, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { S3Bucket } from "@/utils/s3.utils";

type ObjEntry = { name: string; type: string; size?: string; modified?: string; storage?: string };

export function DeleteObjectsDialog({
  bucket, path, objects, open, onOpenChange, onConfirm,
}: {
  bucket: S3Bucket;
  path: string[];
  objects: ObjEntry[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<boolean>;
}) {
  const [search, setSearch] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canDelete = confirmText === "permanently delete";

  useEffect(() => {
    if (!open) {
      setSearch("");
      setConfirmText("");
    }
  }, [open]);

  const filtered = objects.filter((o) =>
    search ? o.name.toLowerCase().includes(search.toLowerCase()) : true
  );

  const prefixKey = path.join("");

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Delete objects</DialogTitle>
        </DialogHeader>

        <div className="border border-amber-500/40 bg-amber-500/10 dark:bg-amber-950/30 rounded p-4 text-sm space-y-2">
          <div className="flex gap-3">
            <AlertTriangle size={18} className="text-amber-500 mt-0.5 shrink-0" />
            <ul className="list-disc pl-5 space-y-1 text-foreground">
              <li>If a folder is selected for deletion, all objects in the folder will be deleted, and any new objects added while the delete action is in progress might also be deleted. If an object is selected for deletion, any new objects with the same name that are uploaded before the delete action is completed will also be deleted.</li>
              <li>Deleting the specified objects can't be undone.</li>
            </ul>
          </div>
        </div>

        <div className="border border-border rounded bg-card">
          <div className="px-5 py-4">
            <h2 className="font-semibold">Specified objects</h2>
          </div>
          <div className="px-5 pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Find objects by name"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-background/50"
              />
            </div>
          </div>
          <div className="border-t border-border max-h-64 overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold border-b border-border">
                  <th className="px-5 py-2">Name</th>
                  <th className="px-5 py-2">Type</th>
                  <th className="px-5 py-2">Last modified</th>
                  <th className="px-5 py-2">Size</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => {
                  const url = `https://${bucket.name}.s3.${bucket.region}.amazonaws.com/${prefixKey}${o.name}`;
                  return (
                    <tr key={o.name} className="border-b border-border last:border-0">
                      <td className="px-5 py-2">
                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 text-primary hover:underline"
                        >
                          {o.type === "Folder" ? <Folder size={14} /> : <FileText size={14} />}
                          {o.name}
                          <ExternalLink size={12} />
                        </a>
                      </td>
                      <td className="px-5 py-2 text-muted-foreground">{o.type === "Folder" ? "Folder" : o.type}</td>
                      <td className="px-5 py-2 text-muted-foreground">{o.modified ?? "-"}</td>
                      <td className="px-5 py-2 text-muted-foreground">{o.size ?? "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="border border-border rounded p-5 bg-card">
          <h2 className="font-semibold mb-3">Permanently delete objects?</h2>
          <p className="text-sm mb-2">
            To confirm deletion, type <span className="italic font-semibold">permanently delete</span> in the text input field.
          </p>
          <input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="permanently delete"
            className="w-full h-9 px-3 text-sm rounded border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary placeholder:italic"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button onClick={() => onOpenChange(false)} className="text-sm text-primary hover:underline">Cancel</button>
          <Button
            size="sm"
            variant="destructive"
            disabled={!canDelete || isSubmitting}
            onClick={async () => {
              setIsSubmitting(true);
              const success = await onConfirm();
              setIsSubmitting(false);
              if (success) onOpenChange(false);
            }}
          >
            {isSubmitting ? "Deleting..." : "Delete objects"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}