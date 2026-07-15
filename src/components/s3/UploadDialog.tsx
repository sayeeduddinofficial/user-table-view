import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Column, DataTable } from "@/components/common/DataTable";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface FileEntry {
  file: File;
  relativePath: string;
}

const formatBytes = (bytes: number) => {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

const folderOf = (relativePath: string) => {
  const idx = relativePath.lastIndexOf("/");
  return idx === -1 ? "/" : `/${relativePath.slice(0, idx)}/`;
};

const typeOf = (name: string) => {
  const idx = name.lastIndexOf(".");
  return idx === -1 ? "File" : name.slice(idx + 1);
};

export function UploadDialog({
  open, onOpenChange, onUpload,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (files: FileEntry[]) => Promise<FileEntry[]>;
}) {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setFiles([]);
    setSearch("");
    setSelected([]);
  };

  useEffect(() => {
    if (!open) reset();
  }, [open]);

  const addFiles = (incoming: File[]) => {
    const entries: FileEntry[] = incoming.map((file) => ({
      file,
      relativePath: (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name,
    }));
    setFiles((prev) => {
      const existing = new Set(prev.map((e) => e.relativePath));
      return [...prev, ...entries.filter((e) => !existing.has(e.relativePath))];
    });
  };

  const toggle = (relativePath: string) =>
    setSelected((s) => (s.includes(relativePath) ? s.filter((x) => x !== relativePath) : [...s, relativePath]));

  const removeSelected = () => {
    setFiles((prev) => prev.filter((e) => !selected.includes(e.relativePath)));
    setSelected([]);
  };

  const filtered = files.filter((e) =>
    search ? e.file.name.toLowerCase().includes(search.toLowerCase()) : true
  );

  const fileColumns: Column<FileEntry>[] = [
    {
      key: "select",
      header: (
        <input
          type="checkbox"
          className="accent-primary"
          checked={selected.length === filtered.length && filtered.length > 0}
          onChange={(e) => setSelected(e.target.checked ? filtered.map((f) => f.relativePath) : [])}
        />
      ),
      className: "w-8",
      render: (e) => (
        <input
          type="checkbox"
          className="accent-primary"
          checked={selected.includes(e.relativePath)}
          onClick={(ev) => ev.stopPropagation()}
          onChange={() => toggle(e.relativePath)}
        />
      ),
    },
    { key: "name", header: "Name", render: (e) => <span className="truncate">{e.file.name}</span> },
    { key: "folder", header: "Folder", render: (e) => <span className="text-muted-foreground">{folderOf(e.relativePath)}</span> },
    { key: "type", header: "Type", render: (e) => <span className="text-muted-foreground">{typeOf(e.file.name)}</span> },
    { key: "size", header: "Size", render: (e) => <span className="text-muted-foreground">{formatBytes(e.file.size)}</span> },
  ];

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          Add the files and folders you want to upload to S3. To upload a file larger than 160GB, use the AWS CLI, AWS SDKs or Amazon S3 REST API.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => { if (e.target.files) addFiles(Array.from(e.target.files)); e.target.value = ""; }}
        />
        <input
          ref={folderInputRef}
          type="file"
          multiple
          // @ts-expect-error non-standard attribute for directory selection
          webkitdirectory="true"
          className="hidden"
          onChange={(e) => { if (e.target.files) addFiles(Array.from(e.target.files)); e.target.value = ""; }}
        />

        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer.files) addFiles(Array.from(e.dataTransfer.files));
          }}
          className={`border-2 border-dashed rounded-lg py-6 text-center text-sm transition-colors ${
            dragOver ? "border-primary bg-primary/5" : "border-border"
          }`}
        >
          Drag and drop files and folders you want to upload here, or choose{" "}
          <button type="button" className="text-primary hover:underline font-medium" onClick={() => fileInputRef.current?.click()}>Add files</button>
          {" "}or{" "}
          <button type="button" className="text-primary hover:underline font-medium" onClick={() => folderInputRef.current?.click()}>Add folder</button>.
        </div>

        <div className="border border-border rounded-md p-5 bg-card">
          <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
            <h2 className="font-semibold">Files and folders ({files.length})</h2>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={selected.length === 0} onClick={removeSelected}>Remove</Button>
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>Add files</Button>
              <Button variant="outline" size="sm" onClick={() => folderInputRef.current?.click()}>Add folder</Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mb-3">All files and folders in this table will be uploaded.</p>

          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Find by name"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-background/50"
            />
          </div>

          <div className="border border-border rounded-md overflow-hidden">
            <DataTable
              columns={fileColumns}
              data={filtered}
              rowKey={(e) => e.relativePath}
              emptyMessage="No files or folders. You have not chosen any files or folders to upload."
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button onClick={() => onOpenChange(false)} className="text-sm text-primary hover:underline">Cancel</button>
          <Button
            size="sm"
            disabled={files.length === 0 || isSubmitting}
            onClick={async () => {
              setIsSubmitting(true);
              const failed = await onUpload(files);
              setIsSubmitting(false);
              if (failed.length === 0) {
                onOpenChange(false);
              } else {
                setFiles(failed);
                setSelected([]);
              }
            }}
          >
            {isSubmitting ? "Uploading..." : "Upload"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}