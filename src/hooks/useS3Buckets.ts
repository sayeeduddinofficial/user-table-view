import { useEffect, useState } from "react";
import { useDialog } from "@/components/ui/dialog-context";
import { buildCreateBucketRequest, createBucketApi, deleteBucketApi, fetchBucketsApi } from "@/services/bucketService";
import { BucketForm, S3Bucket, regionalSuffix } from "@/utils/s3.utils";

const mapApiBucket = (item: Awaited<ReturnType<typeof fetchBucketsApi>>[number]): S3Bucket => ({
  id: typeof item.request_id === "string" ? item.request_id : typeof item.id === "string" ? item.id : crypto.randomUUID(),
  name: typeof item.bucket_name === "string"
    ? item.bucket_name
    : typeof item.bucketName === "string"
      ? item.bucketName
      : typeof item.bucket_name_prefix === "string"
        ? item.bucket_name_prefix
        : "unknown-bucket",
  region: typeof item.region === "string" ? item.region : "us-east-1",
  createdBy: typeof item.user_name === "string" ? item.user_name : "unknown",
  userId: item.user_id,
  createdAt: typeof item.created_at === "string" ? item.created_at : typeof item.createdAt === "string" ? item.createdAt : undefined,
  meta: {
    bucketType: item.bucket_type === "DIRECTORY" || item.bucketType === "directory" ? "directory" : "general",
    namespace: item.bucket_namespace === "ACCOUNT_REGIONAL" || item.bucketNamespace === "ACCOUNT_REGIONAL" ? "regional" : "global",
    objectOwnership: "acl-disabled",
    publicAccess: !item.block_public_access,
    versioning: item.versioning_enabled,
    encryption: "AES256",
    bucketKey: true,
    status: item.status,
    tags: [],
    sizeGB: 0,
    objects: 0,
    justification: typeof item.justification === "string" ? item.justification : undefined,
  },
});

export function useS3Buckets() {
  const { alert } = useDialog();
  const [buckets, setBuckets] = useState<S3Bucket[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBuckets = async (): Promise<boolean> => {
    try {
      const items = await fetchBucketsApi();
      setBuckets(items.map(mapApiBucket));
      return true;
    } catch (error) {
      console.error("Failed to load buckets", error);
      alert({ title: "Unable to load S3 buckets", severity: "error" });
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadBuckets();
  }, []);

  const createBucket = async (form: BucketForm) => {
    const bucketName = form.bucketType === "directory" && form.baseName && form.az
      ? `${form.baseName}--${form.az}--x-s3`
      : form.namespace === "regional" && form.namePrefix
        ? `${form.namePrefix}${regionalSuffix(form.region)}`
        : form.name;

    const payload = buildCreateBucketRequest(form, bucketName);

    try {
      const response = await createBucketApi(payload);
      await loadBuckets();
      alert({ title: "Bucket provisioning started", description: bucketName, severity: "success" });
      return response.data?.request_id ?? null;
    } catch (error) {
      console.error("Failed to create bucket", error);
      alert({ title: error instanceof Error ? error.message : "Unable to create bucket", severity: "error" });
      return null;
    }
  };

  const emptyBucket = (id: string) => {
    const bucket = buckets.find((b) => b.id === id);
    if (bucket) alert({ title: `Emptied ${bucket.name}`, severity: "success" });
  };

  const deleteBucket = async (id: string) => {
    const bucket = buckets.find((b) => b.id === id);

    if (!bucket) {
      return null;
    }

    try {
      await deleteBucketApi(bucket.id);
      await loadBuckets();
      alert({ title: "Bucket deletion started", description: bucket.name, severity: "success" });
      return bucket.id;
    } catch (error) {
      console.error("Failed to delete bucket", error);
      alert({ title: "Unable to delete bucket. Please try again.", severity: "error" });
      return null;
    }
  };

  return { buckets, loading, createBucket, emptyBucket, deleteBucket, refresh: loadBuckets };
}
