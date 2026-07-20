import { useState } from "react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { BucketsTable } from "@/components/s3/BucketsTable";
import { BucketDetail } from "@/components/s3/BucketDetail";
import { DeleteBucketDialog } from "@/components/s3/DeleteBucketDialog";
import { CreateBucketWizard } from "@/components/s3/CreateBucketWizard";
import { useS3Buckets } from "@/hooks/useS3Buckets";
import { useAppStore } from "@/store/appStore";

export default function S3() {
  const { buckets, loading, createBucket, deleteBucket, refresh } = useS3Buckets();
  const setActiveRequest = useAppStore((s) => s.setActiveRequest);

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const location = useLocation();
  const navigate = useNavigate();
  const { bucketName } = useParams();

  const deleteBucketTarget = buckets.find((b) => b.id === deleteTarget);

  if (bucketName) {
    const viewingBucket = buckets.find((b) => b.name === bucketName);

    if (!viewingBucket) {
      if (buckets.length === 0) return null;
      return <Navigate to="/aws/s3" replace />;
    }

    return (
      <BucketDetail
        bucket={viewingBucket}
        onBack={() => navigate("/aws/s3")}
      />
    );
  }

  if (location.pathname === "/aws/s3/create") {
    return (
      <div>
        <Header
          title="Create Bucket"
          subtitle="Buckets are containers for data stored in S3."
          showSearch={false}
        />
        <CreateBucketWizard
          onCancel={() => navigate("/aws/s3")}
          onSubmit={async (form) => {
            const requestId = await createBucket(form);
            if (requestId) {
              setActiveRequest(requestId, "s3-service", "create");
              navigate(`/console?request=${requestId}`);
            } else {
              navigate("/aws/s3");
            }
          }}
        />
      </div>
    );
  }

  return (
    <div>
      <Header
        title="S3 Buckets"
        subtitle="Object storage buckets provisioned via Terraform"
        showSearch={false}
      />
      <div className="p-6">
        <BucketsTable
          buckets={buckets}
          loading={loading}
          onDelete={(id) => setDeleteTarget(id)}
          onRefresh={refresh}
        />
      </div>
      <DeleteBucketDialog
        bucket={deleteBucketTarget ?? null}
        open={!!deleteBucketTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onConfirm={async () => {
          if (!deleteBucketTarget) return;
          const requestId = await deleteBucket(deleteBucketTarget.id);
          if (requestId) {
            setDeleteTarget(null);
            setActiveRequest(requestId, "s3-service", "delete");
            navigate(`/console?request=${requestId}`);
          }
        }}
      />
    </div>
  );
}
