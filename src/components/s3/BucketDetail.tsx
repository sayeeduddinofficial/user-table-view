import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useDialog } from "@/components/ui/dialog-context";
import {
  ChevronRight, Download, FileText, Folder, FolderPlus, Link2, RefreshCw, Search, Trash2, Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable, type Column } from "@/components/common/DataTable";
import { Header } from "@/components/layout/Header";
import { CreateFolderDialog } from "./CreateFolderDialog";
import { UploadDialog } from "./UploadDialog";
import { DeleteObjectsDialog } from "./DeleteObjectsDialog";
import { CopyIconButton, DetailCard, DetailField } from "./shared";
import { S3Bucket, regionLabel } from "@/utils/s3.utils";
import { fetchObjectsApi, createFolderApi, uploadObjectApi, deleteObjectApi, downloadObjectApi, type ObjectsPagination } from "@/services/objectService";

const DETAIL_TABS = ["Objects", "Properties"] as const;
type DetailTab = typeof DETAIL_TABS[number];

type ObjEntry = { name: string; type: string; size?: string; modified?: string; storage?: string };

const formatSize = (bytes?: number) => {
  if (bytes === undefined || bytes === null) return "0 B";
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${i === 0 ? value : value.toFixed(1)} ${units[i]}`;
};

const formatDate = (value?: string) => {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toLocaleString("sv-SE").replace("T", " ");
};

const fileTypeFromName = (name: string) => {
  const ext = name.includes(".") ? name.split(".").pop() : undefined;
  return ext ? ext : "file";
};

const describeFailures = (results: PromiseSettledResult<unknown>[]): string => {
  const messages = results
    .filter((r): r is PromiseRejectedResult => r.status === "rejected")
    .map((r) => (r.reason instanceof Error ? r.reason.message : "Unknown error"));
  return Array.from(new Set(messages)).join("; ");
};

export function BucketDetail({ bucket, onBack }: { bucket: S3Bucket; onBack: () => void }) {
  const { alert } = useDialog();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab: DetailTab = searchParams.get("tab") === "properties" ? "Properties" : "Objects";
  const prefixParam = searchParams.get("prefix") ?? "";
  const path = prefixParam ? prefixParam.split("/").filter(Boolean).map((seg) => `${seg}/`) : [];

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sel, setSel] = useState<string[]>([]);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingObjects, setDeletingObjects] = useState(false);
  const [downloadingKeys, setDownloadingKeys] = useState<string[]>([]);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const el = tabRefs.current[tab];
    if (el) setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
  }, [tab]);

  const setTab = (t: DetailTab) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", t.toLowerCase());
      return next;
    });
  };

  const jumpTo = (idx: number) => {
    const newPrefix = path.slice(0, idx).join("");
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (newPrefix) next.set("prefix", newPrefix);
      else next.delete("prefix");
      next.delete("object");
      return next;
    });
    setSel([]);
    setSearch("");
  };

  const prefixKey = path.join("");

  const enterFolder = (folder: string) => {
    const normalizedFolder = folder.endsWith("/") ? folder : `${folder}/`;
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("prefix", `${prefixKey}${normalizedFolder}`);
      next.delete("object");
      return next;
    });
    setSel([]);
    setSearch("");
  };

  const toggle = (n: string) =>
    setSel((s) => (s.includes(n) ? s.filter((x) => x !== n) : [...s, n]));

  const [rawObjects, setRawObjects] = useState<ObjEntry[]>([]);
  const [allFileNames, setAllFileNames] = useState<string[]>([]);
  const [objectCache, setObjectCache] = useState<Record<string, ObjEntry>>({});
  const [loadingObjects, setLoadingObjects] = useState(false);
  const [page, setPage] = useState(1);
  const OBJECTS_PAGE_SIZE = 10;
  const [pagination, setPagination] = useState<ObjectsPagination>({
    total: 0,
    page: 1,
    limit: OBJECTS_PAGE_SIZE,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  });

  // Debounce search input before it drives a backend request
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, prefixKey, bucket.id]);

  const loadObjects = async () => {
    setLoadingObjects(true);
    try {
      const response = await fetchObjectsApi(bucket.id, prefixKey, {
        search: debouncedSearch,
        page,
        limit: OBJECTS_PAGE_SIZE,
      });
      const folders: ObjEntry[] = response.folders.map((f) => ({
        name: `${f.name}`,
        type: "Folder",
      }));
      const files: ObjEntry[] = response.files.map((f) => ({
        name: f.name,
        type: fileTypeFromName(f.name),
        size: formatSize(f.size),
        modified: formatDate(f.lastModified),
        storage: f.storageClass,
      }));
      const pageObjects = [...folders, ...files];
      setRawObjects(pageObjects);
      setAllFileNames(response.allFileNames ?? pageObjects.filter((o) => o.type !== "Folder").map((o) => o.name));
      const resolvedPagination = response.pagination ?? {
        total: pageObjects.length,
        page: 1,
        limit: OBJECTS_PAGE_SIZE,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      };
      setPagination(resolvedPagination);
      setObjectCache((cache) => {
        const next = { ...cache };
        pageObjects.forEach((o) => { next[o.name] = o; });
        return next;
      });
      if (resolvedPagination.page !== page) setPage(resolvedPagination.page);
    } catch (error) {
      console.error("Failed to load objects", error);
      alert({ title: "Unable to load objects", severity: "error" });
    } finally {
      setLoadingObjects(false);
    }
  };

  useEffect(() => {
    void loadObjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bucket.id, prefixKey, debouncedSearch, page]);

  useEffect(() => {
    setSel([]);
    setObjectCache({});
  }, [bucket.id, prefixKey]);

  const objects = rawObjects;


  const renderObjectActions = (o: ObjEntry) => {
    const s3Uri = `s3://${bucket.name}/${prefixKey}${o.name}`;
    const url = `https://${bucket.name}.s3.${bucket.region}.amazonaws.com/${prefixKey}${o.name}`;
    const objectKey = `${prefixKey}${o.name}`;
    const isDownloading = downloadingKeys.includes(objectKey);
    const canDownload = o.type !== "Folder" && !isDownloading;
    const btnClass = (enabled: boolean, destructive?: boolean) =>
      enabled
        ? `p-1.5 rounded-md transition-colors ${
            destructive
              ? "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
          }`
        : "p-1.5 rounded-md text-muted-foreground/30 cursor-not-allowed";
    return (
      <div className="flex items-center justify-end gap-1">
        <CopyIconButton
          value={s3Uri}
          label="Copy S3 URI"
          alertTitle="S3 URI copied"
          stopPropagation
          className={`h-auto w-auto ${btnClass(true)}`}
        />
        <CopyIconButton
          value={url}
          icon={Link2}
          label="Copy URL"
          alertTitle="URL copied"
          stopPropagation
          className={`h-auto w-auto ${btnClass(true)}`}
        />
        <Button
          variant="ghost"
          size="icon"
          disabled={!canDownload}
          onClick={async (e) => {
            e.stopPropagation();
            setDownloadingKeys((k) => [...k, objectKey]);
            try {
              await downloadObjectApi(bucket.id, objectKey, o.name);
            } catch (error) {
              console.error("Failed to download object", error);
              alert({
                title: error instanceof Error ? error.message : "Unable to download object. Please try again.",
                severity: "error",
              });
            } finally {
              setDownloadingKeys((k) => k.filter((key) => key !== objectKey));
            }
          }}
          className={`h-auto w-auto ${btnClass(canDownload)}`}
          tooltip="Download"
        >
          <Download size={14} />
        </Button>
      </div>
    );
  };

  const columns: Column<ObjEntry>[] = [
    {
      key: "select",
      header: (
        <Checkbox
          checked={objects.length > 0 && objects.every((o) => sel.includes(o.name))}
          onCheckedChange={(checked) =>
            setSel((s) =>
              checked
                ? Array.from(new Set([...s, ...objects.map((o) => o.name)]))
                : s.filter((n) => !objects.some((o) => o.name === n))
            )
          }
          aria-label="Select all"
        />
      ),
      render: (o) => (
        <Checkbox
          checked={sel.includes(o.name)}
          onClick={(e) => e.stopPropagation()}
          onCheckedChange={() => toggle(o.name)}
          aria-label={`Select ${o.name}`}
        />
      ),
      className: "w-10",
    },
    {
      key: "name",
      header: "Name",
      className: "whitespace-nowrap",
      render: (o) =>
        o.type === "Folder" ? (
          <span
            className="flex items-center gap-2 text-primary hover:underline cursor-pointer"
            onClick={() => enterFolder(o.name)}
          >
            <Folder size={14} className="text-primary" />
            {o.name}
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <FileText size={14} className="text-muted-foreground" />
            {o.name}
          </span>
        ),
    },
    {
      key: "type",
      header: "Type",
      className: "whitespace-nowrap",
      render: (o) => o.type,
    },
    {
      key: "modified",
      header: "Last modified",
      className: "whitespace-nowrap text-muted-foreground",
      render: (o) => o.modified ?? "-",
    },
    {
      key: "size",
      header: "Size",
      className: "whitespace-nowrap text-muted-foreground",
      render: (o) => o.size ?? "-",
    },
    {
      key: "storage",
      header: "Storage class",
      className: "whitespace-nowrap text-muted-foreground",
      render: (o) => o.storage ?? "-",
    },
    {
      key: "actions",
      header: <span className="flex justify-end">Actions</span>,
      className: "text-right whitespace-nowrap",
      render: renderObjectActions,
    },
  ];

  return (
    <>
      <Header
        title="S3 Buckets"
        subtitle="Storage resources for objects and files."
        showSearch={false}
      />
      <div className="p-6">
        <div className="space-y-4">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
            <span className="text-primary cursor-pointer hover:underline" onClick={onBack}>S3 Buckets</span>
            <ChevronRight size={14} />
            <span
              className={path.length === 0 ? "text-foreground" : "text-primary cursor-pointer hover:underline"}
              onClick={path.length === 0 ? undefined : () => jumpTo(0)}
            >
              {bucket.name}
            </span>
            {path.map((seg, i) => (
              <span key={i} className="flex items-center gap-2">
                <ChevronRight size={14} />
                <span
                  className={i === path.length - 1 ? "text-foreground" : "text-primary cursor-pointer hover:underline"}
                  onClick={i === path.length - 1 ? undefined : () => jumpTo(i + 1)}
                >
                  {seg}
                </span>
              </span>
            ))}
          </div>

          {/* Tabs */}
          <div className="border-b border-border relative flex items-center gap-6 overflow-x-auto">
            {DETAIL_TABS.map((t) => (
              <button
                key={t}
                ref={(el) => { tabRefs.current[t] = el; }}
                onClick={() => setTab(t)}
                className={`pb-3 text-sm font-medium whitespace-nowrap flex items-center gap-1.5 ${tab === t ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                {t}
              </button>
            ))}
            <div
              className="absolute bottom-0 h-0.5 bg-primary transition-all duration-300 ease-out"
              style={{ left: indicator.left, width: indicator.width }}
            />
          </div>

          {tab === "Objects" && (
            <div className="space-y-4">
              <div className="bg-card border border-border rounded-lg">
                <div className="px-5 py-4 flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold">Objects</h2>
                      <Badge className="bg-orange-500 hover:bg-orange-500 text-white border-transparent rounded-full h-5 min-w-5 justify-center px-1.5">
                        {pagination.total}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Objects are entities stored in S3. Select objects to copy URIs, download or delete.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-auto w-auto p-2 rounded-full"
                      tooltip="Refresh"
                      disabled={loadingObjects}
                      onClick={() => void loadObjects()}
                    >
                      <RefreshCw size={14} className={loadingObjects ? "animate-spin" : ""} />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={sel.length === 0}
                      onClick={() => setDeletingObjects(true)}
                    >
                      <Trash2 size={14} className="mr-1.5" /> Delete
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setCreatingFolder(true)}>
                      <FolderPlus size={14} className="mr-1.5" /> Create Folder
                    </Button>
                    <Button size="sm" onClick={() => setUploading(true)}>
                      <Upload size={14} className="mr-1.5" /> Upload
                    </Button>
                  </div>
                </div>

                {/* Search */}
                <div className="px-5 pb-4 flex items-center gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Find objects by name"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9 bg-background/50"
                    />
                  </div>
                </div>
              </div>

              <DataTable
                columns={columns}
                data={objects}
                isLoading={loadingObjects}
                emptyMessage="This bucket is empty. Click Upload to add objects."
                pagination={pagination}
                onPageChange={setPage}
                rowKey={(o) => o.name}
              />
            </div>
          )}

          {tab === "Properties" && path.length > 0 && (
            <DetailCard title="Folder overview">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-5 text-sm">
                <DetailField label="AWS Region" value={regionLabel(bucket.region)} />
                <DetailField label="S3 URI" value={`s3://${bucket.name}/${prefixKey}`} mono copy />
                <DetailField label="Amazon Resource Name (ARN)" value={`arn:aws:s3:::${bucket.name}/${prefixKey}`} mono copy />
              </div>
            </DetailCard>
          )}

          {tab === "Properties" && path.length === 0 && (
            <DetailCard title="Bucket overview">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-5 text-sm">
                <DetailField label="AWS Region" value={regionLabel(bucket.region)} />
                <DetailField label="S3 URI" value={`s3://${bucket.name}`} mono copy />
                <DetailField label="Amazon Resource Name (ARN)" value={`arn:aws:s3:::${bucket.name}`} mono copy />
                <DetailField label="Creation date" value={new Date(bucket.createdAt ?? Date.now()).toLocaleString()} />
                <DetailField label="Bucket Versioning" value={bucket.meta.versioning ? "Enabled" : "Disabled"} />
                <DetailField label="Default encryption" value={bucket.meta.encryption === "aws:kms" ? "AWS KMS" : "Amazon S3 managed keys (SSE-S3)"} />
              </div>
            </DetailCard>
          )}

        </div>
      </div>

      <CreateFolderDialog
        open={creatingFolder}
        onOpenChange={setCreatingFolder}
        onCreate={async (name) => {
          try {
            await createFolderApi(bucket.id, prefixKey, name);
            setCreatingFolder(false);
            alert({
              title: "Folder created",
              description: `s3://${bucket.name}/${prefixKey}${name}/`,
              severity: "success",
            });
            await loadObjects();
            return true;
          } catch (error) {
            console.error("Failed to create folder", error);
            alert({ title: error instanceof Error ? error.message : "Unable to create folder. Please try again.", severity: "error" });
            return false;
          }
        }}
      />

      <UploadDialog
        open={uploading}
        onOpenChange={setUploading}
        existingNames={allFileNames}
        onUpload={async (entries) => {
          const results = await Promise.allSettled(
            entries.map((entry) => {
              const folderPart = entry.relativePath.includes("/")
                ? entry.relativePath.slice(0, entry.relativePath.lastIndexOf("/") + 1)
                : "";
              return uploadObjectApi(bucket.id, `${prefixKey}${folderPart}`, entry.file);
            })
          );
          const failedEntries = entries.filter((_, i) => results[i].status === "rejected");
          const succeeded = entries.length - failedEntries.length;

          if (failedEntries.length === 0) setUploading(false);

          if (succeeded) {
            alert({
              title: `Uploaded ${succeeded} object${succeeded === 1 ? "" : "s"}`,
              description: `s3://${bucket.name}/${prefixKey}`,
              severity: "success",
            });
          }
          if (failedEntries.length) {
            const message = describeFailures(results);
            alert({
              title: failedEntries.length === 1
                ? (message || "Unable to upload object. Please try again.")
                : `${failedEntries.length} objects failed to upload`,
              description: failedEntries.length === 1 ? undefined : message,
              severity: "error",
            });
          }

          await loadObjects();
          return failedEntries;
        }}
      />

      <DeleteObjectsDialog
        bucket={bucket}
        path={path}
        objects={sel.map((name) => objectCache[name]).filter((o): o is ObjEntry => Boolean(o))}
        open={deletingObjects}
        onOpenChange={setDeletingObjects}
        onConfirm={async () => {
          const targets = [...sel];
          const results = await Promise.allSettled(
            targets.map((name) => deleteObjectApi(bucket.id, `${prefixKey}${name}`))
          );
          const failedNames = targets.filter((_, i) => results[i].status === "rejected");
          const succeeded = targets.length - failedNames.length;

          if (failedNames.length === 0) setDeletingObjects(false);

          if (succeeded) {
            alert({
              title: `Deleted ${succeeded} object${succeeded === 1 ? "" : "s"}`,
              description: `s3://${bucket.name}/${prefixKey}`,
              severity: "success",
            });
          }
          if (failedNames.length) {
            const message = describeFailures(results);
            alert({
              title: failedNames.length === 1
                ? (message || "Unable to delete object. Please try again.")
                : `${failedNames.length} objects failed to delete`,
              description: failedNames.length === 1 ? undefined : message,
              severity: "error",
            });
          }

          setSel(failedNames);
          await loadObjects();
          return failedNames.length === 0;
        }}
      />
    </>

  );
}
