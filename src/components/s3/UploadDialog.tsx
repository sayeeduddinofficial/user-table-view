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
import { useDialog } from "@/components/ui/dialog-context";

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

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB, matches the backend upload limit

type ObjectsUpload = { file: File; relativePath: string };

const objectsFromFiles = (fileList: File[]): ObjectsUpload[] =>
  fileList.map((file) => ({
    file,
    relativePath: (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name,
  }));

const readEntryFile = (entry: FileSystemFileEntry): Promise<File> =>
  new Promise((resolve, reject) => entry.file(resolve, reject));

const readAllDirectoryEntries = (reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> =>
  new Promise((resolve, reject) => {
    const all: FileSystemEntry[] = [];
    const readBatch = () => {
      reader.readEntries((batch) => {
        if (batch.length === 0) {
          resolve(all);
          return;
        }
        all.push(...batch);
        readBatch();
      }, reject);
    };
    readBatch();
  });

const collectEntry = async (entry: FileSystemEntry, path: string): Promise<ObjectsUpload[]> => {
  if (entry.isFile) {
    const file = await readEntryFile(entry as FileSystemFileEntry);
    return [{ file, relativePath: `${path}${entry.name}` }];
  }
  if (entry.isDirectory) {
    const reader = (entry as FileSystemDirectoryEntry).createReader();
    const children = await readAllDirectoryEntries(reader);
    const nested = await Promise.all(children.map((child) => collectEntry(child, `${path}${entry.name}/`)));
    return nested.flat();
  }
  return [];
};

interface DirectoryPickerFileHandle {
  kind: "file";
  name: string;
  getFile: () => Promise<File>;
}

interface DirectoryPickerDirectoryHandle {
  kind: "directory";
  name: string;
  values: () => AsyncIterable<DirectoryPickerFileHandle | DirectoryPickerDirectoryHandle>;
}

type DirectoryPickerHandle = DirectoryPickerFileHandle | DirectoryPickerDirectoryHandle;

const collectDirectoryHandle = async (handle: DirectoryPickerHandle, path: string): Promise<ObjectsUpload[]> => {
  if (handle.kind === "file") {
    const file = await handle.getFile();
    return [{ file, relativePath: `${path}${handle.name}` }];
  }
  const children: ObjectsUpload[] = [];
  for await (const entry of handle.values()) {
    children.push(...(await collectDirectoryHandle(entry, `${path}${handle.name}/`)));
  }
  return children;
};

const localFilesAndFoldersFromDataTransfer = async (dataTransfer: DataTransfer): Promise<ObjectsUpload[]> => {
  const items = dataTransfer.items;
  if (items && items.length > 0 && typeof items[0]?.webkitGetAsEntry === "function") {
    const entries = Array.from(items)
      .map((item) => item.webkitGetAsEntry())
      .filter((entry): entry is FileSystemEntry => !!entry);
    if (entries.length > 0) {
      const collected = await Promise.all(entries.map((entry) => collectEntry(entry, "")));
      return collected.flat();
    }
  }
  return objectsFromFiles(Array.from(dataTransfer.files));
};

export function UploadDialog({
  open, onOpenChange, onUpload, existingNames = [],
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (files: FileEntry[]) => Promise<FileEntry[]>;
  existingNames?: string[];
}) {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadWarning, setUploadWarning] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const { confirm } = useDialog();

  const reset = () => {
    setFiles([]);
    setSearch("");
    setSelected([]);
    setUploadWarning(null);
  };

  useEffect(() => {
    if (!open) reset();
  }, [open]);

  const addFiles = (incoming: ObjectsUpload[]) => {
    const existingNamesSet = new Set(existingNames);
    const pendingPaths = new Set(files.map((e) => e.relativePath));
    const seenInBatch = new Set<string>();

    const oversized: ObjectsUpload[] = [];
    const duplicates = new Set<string>();
    const accepted: FileEntry[] = [];

    incoming.forEach(({ file, relativePath }) => {
      if (file.size > MAX_FILE_SIZE) {
        oversized.push({ file, relativePath });
        return;
      }
      const isDuplicate = pendingPaths.has(relativePath)
        || seenInBatch.has(relativePath)
        || (!relativePath.includes("/") && existingNamesSet.has(relativePath));
      if (isDuplicate) {
        duplicates.add(relativePath);
        return;
      }
      seenInBatch.add(relativePath);
      accepted.push({ file, relativePath });
    });

    const messages: string[] = [];
    if (oversized.length) {
      messages.push(
        `${oversized.length === 1 ? oversized[0].relativePath : `${oversized.length} files`} exceed${oversized.length === 1 ? "s" : ""} the ${formatBytes(MAX_FILE_SIZE)} upload limit.`
      );
    }
    if (duplicates.size) {
      const dup = Array.from(duplicates);
      messages.push(
        `${dup.length === 1 ? dup[0] : `${dup.length} files`} already added.`
      );
    }
    setUploadWarning(messages.length ? messages.join(" ") : null);

    setFiles((prev) => [...prev, ...accepted]);
  };

  const handleAddFolder = async () => {
    const showDirectoryPicker = (window as unknown as {
      showDirectoryPicker?: () => Promise<DirectoryPickerDirectoryHandle>;
    }).showDirectoryPicker;

    if (!showDirectoryPicker) {
      folderInputRef.current?.click();
      return;
    }

    let dirHandle: DirectoryPickerDirectoryHandle;
    try {
      dirHandle = await showDirectoryPicker();
    } catch {
      return;
    }

    const collected = await collectDirectoryHandle(dirHandle, "");
    if (collected.length === 0) return;

    const ok = await confirm({
      title: `Upload ${collected.length} file${collected.length === 1 ? "" : "s"} to this site?`,
      description: `This will upload all files from "${dirHandle.name}". Only do this if you trust the site.`,
      icon: "info",
    });
    if (!ok) return;

    addFiles(collected);
  };

  const toggle = (relativePath: string) =>
    setSelected((s) => (s.includes(relativePath) ? s.filter((x) => x !== relativePath) : [...s, relativePath]));

  const removeSelected = () => {
    setFiles((prev) => prev.filter((e) => !selected.includes(e.relativePath)));
    setSelected([]);
    setUploadWarning(null);
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
    { key: "name", header: "Name", className: "w-[30%]", render: (e) => <span className="block truncate" title={e.file.name}>{e.file.name}</span> },
    { key: "folder", header: "Folder", className: "w-[28%]", render: (e) => <span className="block truncate text-muted-foreground" title={folderOf(e.relativePath)}>{folderOf(e.relativePath)}</span> },
    { key: "type", header: "Type", className: "w-[16%]", render: (e) => <span className="text-muted-foreground">{typeOf(e.file.name)}</span> },
    { key: "size", header: "Size", className: "w-[16%]", render: (e) => <span className="text-muted-foreground">{formatBytes(e.file.size)}</span> },
  ];

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle>Upload</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground shrink-0">
          Add the files and folders you want to upload to S3. Individual files are limited to {formatBytes(MAX_FILE_SIZE)} — to upload larger files, use the AWS CLI, AWS SDKs or Amazon S3 REST API.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => { if (e.target.files) addFiles(objectsFromFiles(Array.from(e.target.files))); e.target.value = ""; }}
        />
        <input
          ref={folderInputRef}
          type="file"
          multiple
          // @ts-expect-error non-standard attribute for directory selection
          webkitdirectory="true"
          className="hidden"
          onChange={(e) => { if (e.target.files) addFiles(objectsFromFiles(Array.from(e.target.files))); e.target.value = ""; }}
        />

        <div
          onDragEnter={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={(e) => {
            if (e.currentTarget.contains(e.relatedTarget as Node)) return;
            setDragOver(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            void localFilesAndFoldersFromDataTransfer(e.dataTransfer).then(addFiles);
          }}
          className={`shrink-0 border-2 border-dashed rounded-lg py-6 text-center text-sm transition-colors ${
            dragOver ? "border-primary bg-primary/5" : "border-border"
          }`}
        >
          Drag and drop files and folders you want to upload here, or choose{" "}
          <button type="button" className="text-primary hover:underline font-medium" onClick={() => fileInputRef.current?.click()}>Add files</button>
          {" "}or{" "}
          <button type="button" className="text-primary hover:underline font-medium" onClick={handleAddFolder}>Add folder</button>.
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-3">
          <div className="border border-border rounded-md p-5 bg-card min-w-0">
            <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
              <h2 className="font-semibold">Files and folders ({files.length})</h2>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={selected.length === 0 || isSubmitting} onClick={removeSelected}>Remove</Button>
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>Add files</Button>
                <Button variant="outline" size="sm" onClick={handleAddFolder}>Add folder</Button>
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
          {uploadWarning && (
            <p className="text-xs text-destructive">{uploadWarning}</p>
          )}
        </div>

        <div className="shrink-0 flex items-center justify-end gap-3 pt-2 border-t border-border">
           <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
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