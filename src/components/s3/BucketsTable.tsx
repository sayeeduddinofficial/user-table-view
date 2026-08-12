import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDialog } from "@/components/ui/dialog-context";
import { Database, Lock, RefreshCw, Search, Trash2, History, Monitor, ArrowUpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader } from "@/components/common/Loader";
import { S3Bucket, encryptionLabel, regionLabel } from "@/utils/s3.utils";
import { CopyIconButton } from "@/components/s3/shared";
import { useAppStore } from "@/store/appStore";
import { S3QuotaIncreaseDialog } from "@/components/s3/S3QuotaIncreaseDialog";
import { env } from "@/lib/env";
import { getClientIp } from "@/utils/getClientIP";

function formatDate(value?: string): string {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.valueOf())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function BucketsTable({
  buckets, loading, onDelete, onRefresh,
}: {
  buckets: S3Bucket[];
  loading?: boolean;
  onDelete: (id: string) => void;
  onRefresh: () => Promise<boolean>;
}) {
  const navigate = useNavigate();
  const { alert } = useDialog();
  const currentUser = useAppStore((s) => s.currentUser);
  const refreshCurrentUser = useAppStore((s) => s.refreshCurrentUser);
  useEffect(() => {
   if (!currentUser) refreshCurrentUser();
  }, []);
  const MAX_BUCKETS = currentUser?.maxBuckets ?? 1;
  const userBucketCount = buckets.filter(
    (b: any) =>
      Number(b.userId) === Number(currentUser?.id) ||
      Number(b.user_id) === Number(currentUser?.id)
  ).length;
  const hasReachedQuota = userBucketCount >= MAX_BUCKETS;
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [showQuotaDialog, setShowQuotaDialog] = useState(false);
  const [requestedquota, setrequestedquota] = useState(0);
  const [reason, setreason] = useState("");
  const [submitquota, setsubmitquota] = useState(false);
  const [quotaError, setQuotaError] = useState("");
  const [touched, setTouched] = useState(false);
  console.log(currentUser);
  const MIN_SPIN_MS = 500;
  const handleRefresh = async () => {
    setRefreshing(true);
    const start = Date.now();
    try {
      const ok = await onRefresh();
      await refreshCurrentUser();
      const elapsed = Date.now() - start;
      if (elapsed < MIN_SPIN_MS) {
        await new Promise((resolve) => setTimeout(resolve, MIN_SPIN_MS - elapsed));
      }
      alert({
        title: ok ? "Refreshed" : "Failed to Refresh",
        severity: ok ? "success" : "error",
      });
    } finally {
      setRefreshing(false);
    }
  };

  const filtered = buckets.filter((b) =>
    search
      ? b.name.toLowerCase().includes(search.toLowerCase()) ||
      regionLabel(b.region).toLowerCase().includes(search.toLowerCase()) ||
      b.id.toLowerCase().includes(search.toLowerCase())
      : true
  );

  const stats = {
    total: buckets.length,
    encrypted: buckets.filter((b) => !!b.meta.encryption).length,
    versioned: buckets.filter((b) => b.meta.versioning).length,
    remainingQuota: Math.max(
      0,
      MAX_BUCKETS - userBucketCount
    ),
  };

  const statusBadge = (r: S3Bucket) => {
    const status = r.meta.status?.toUpperCase();
    if (status === "FAILED") {
      return <Badge variant="outline" className="bg-destructive/15 text-destructive border-destructive/30">Failed</Badge>;
    }
    if (status === "PENDING" || status === "PROVISIONING") {
      return <Badge variant="outline" className="bg-blue-500/15 text-blue-400 border-blue-500/30">Provisioning</Badge>;
    }

    return <Badge variant="outline" className="bg-success/15 text-success border-success/30">Completed</Badge>;
  };

  return (
    <div className="space-y-4">
      {/* Stat cards */}
      <div className="flex flex-wrap gap-3">
        <StatCard icon={<Database className="h-4 w-4" />} value={stats.total} label="Total Buckets" color="text-primary bg-primary/10" />
        <StatCard icon={<Lock className="h-4 w-4" />} value={stats.encrypted} label="Encrypted" color="text-success bg-success/10" />
        <StatCard icon={<History className="h-4 w-4" />} value={stats.versioned} label="Versioned" color="text-cyan-400 bg-cyan-400/10" />
        <div className="flex-auto w-full sm:w-auto max-w-full sm:max-w-[400px] min-w-[220px] flex items-center gap-3 rounded-lg border border-border/50 bg-card/50 backdrop-blur px-4 py-3 hover:border-primary/30 transition-colors">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
              <svg width={16} height={16} viewBox="0 0 22 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path stroke="#10B981" fillRule="evenodd" clipRule="evenodd" d="M19.512 12.5994L19.6274 11.7415C20.5307 12.2938 20.828 12.625 20.9199 12.7679C20.7677 12.7976 20.3825 12.8122 19.512 12.5994ZM17.4356 20.2546C17.4325 20.278 17.431 20.3011 17.431 20.3245C17.431 20.4048 17.2335 20.7125 16.3572 21.0605C15.9674 21.2149 15.5053 21.3534 14.9846 21.4744C13.6426 21.7852 11.9966 21.9569 10.3501 21.9569C5.94528 21.9569 3.27071 20.8231 3.27071 20.3245C3.27071 20.3011 3.26915 20.278 3.26603 20.2546L1.26868 5.36823C1.39757 5.44333 1.53634 5.51583 1.68135 5.58624C1.72085 5.60501 1.76347 5.62274 1.80349 5.641C1.93083 5.69993 2.06336 5.7573 2.20109 5.81258C2.25774 5.83501 2.31439 5.85692 2.37208 5.87934C2.51969 5.93463 2.67197 5.98834 2.82893 6.03998C2.86999 6.05302 2.90949 6.06814 2.95211 6.08118C3.15065 6.14376 3.35699 6.20322 3.57008 6.26059C3.62517 6.27467 3.68234 6.28823 3.73795 6.30283C3.90531 6.34508 4.07474 6.38628 4.24834 6.42488C4.3185 6.44052 4.38763 6.45617 4.45831 6.47077C4.65321 6.51197 4.85123 6.55109 5.05341 6.58812C5.09187 6.5949 5.12981 6.60324 5.16879 6.61002C5.40891 6.65279 5.65423 6.69138 5.90214 6.72685C5.97023 6.73728 6.03935 6.74562 6.10796 6.75553C6.2987 6.78161 6.49048 6.80612 6.68487 6.82907C6.76179 6.83742 6.83715 6.84628 6.91407 6.85463C7.14795 6.87966 7.38287 6.90261 7.62039 6.92295C7.6469 6.92503 7.67237 6.92764 7.69887 6.93025C7.96134 6.95163 8.22589 6.96884 8.49148 6.98397C8.56528 6.98814 8.6396 6.99127 8.71392 6.99544C8.91454 7.00483 9.1162 7.01317 9.31786 7.01995C9.39582 7.02256 9.47326 7.02517 9.5507 7.02673C9.81785 7.03351 10.084 7.03769 10.3501 7.03769C10.6162 7.03769 10.8828 7.03351 11.1499 7.02673C11.2274 7.02517 11.3048 7.02256 11.3823 7.01995C11.5844 7.01317 11.7856 7.00483 11.9867 6.99544C12.061 6.99127 12.1348 6.98814 12.2086 6.98397C12.4742 6.96884 12.7393 6.95163 13.0023 6.93025C13.0272 6.92816 13.0522 6.92503 13.0776 6.92295C13.3162 6.90313 13.5527 6.87966 13.7871 6.8541C13.8635 6.84628 13.9383 6.83742 14.0142 6.82907C14.2101 6.80612 14.4035 6.78161 14.5953 6.75501C14.6628 6.74562 14.7304 6.73728 14.7975 6.72737C15.0464 6.69138 15.2928 6.65227 15.5339 6.61002C15.5698 6.60324 15.6041 6.59594 15.6405 6.58968C15.8458 6.55213 16.0479 6.51197 16.246 6.47025C16.314 6.45617 16.3816 6.44052 16.4487 6.42592C16.6264 6.38628 16.8 6.34456 16.97 6.30127C17.0225 6.28719 17.076 6.27467 17.128 6.26111C17.3431 6.20374 17.5521 6.14376 17.7527 6.08014C17.7906 6.06814 17.826 6.0551 17.8629 6.04311C18.0255 5.98991 18.1825 5.93515 18.3337 5.87726C18.3888 5.85692 18.4424 5.83553 18.4964 5.81415C18.6383 5.7573 18.7755 5.69889 18.907 5.63735C18.9429 5.62066 18.9819 5.60449 19.0177 5.58728C19.1638 5.51687 19.3035 5.44385 19.4334 5.36823L18.5016 12.312C16.1259 11.5636 12.9576 10.1153 11.5195 9.4373C11.5179 8.86361 11.0527 8.39683 10.4805 8.39683C9.90776 8.39683 9.44104 8.86517 9.44104 9.43991C9.44104 10.0152 9.90776 10.483 10.4805 10.483C10.6676 10.483 10.8412 10.4293 10.9935 10.3417C12.6359 11.1193 15.9061 12.6098 18.3608 13.3603L17.4356 20.2546ZM10.3501 1.04308C15.7709 1.04308 19.59 2.72819 19.6617 3.66435L19.6477 3.77336C19.6384 3.80465 19.618 3.83698 19.602 3.86984C19.5875 3.89696 19.5771 3.9246 19.5573 3.95277C19.5338 3.9851 19.5012 4.01848 19.471 4.05082C19.4444 4.0795 19.422 4.10819 19.3908 4.13687C19.354 4.17025 19.3072 4.20415 19.2636 4.23805C19.2261 4.26673 19.1929 4.29542 19.1503 4.32515C19.0993 4.35905 19.039 4.39347 18.9813 4.42789C18.934 4.45658 18.8904 4.48474 18.8374 4.51342C18.7724 4.54837 18.6976 4.58383 18.6253 4.61878C18.5697 4.6459 18.5172 4.67406 18.4564 4.70066C18.3764 4.73664 18.2875 4.77159 18.2012 4.80705C18.1362 4.83261 18.076 4.85921 18.0068 4.88528C17.9143 4.91971 17.8114 4.95413 17.7116 4.98803C17.6389 5.01306 17.5697 5.03862 17.4933 5.06365C17.3868 5.09703 17.2709 5.12989 17.1586 5.16222C17.0775 5.18569 17.0011 5.2102 16.9169 5.23263C16.799 5.26497 16.6711 5.29522 16.5459 5.32599C16.457 5.34789 16.3728 5.37084 16.2803 5.3917C16.1477 5.42195 16.0064 5.45011 15.8671 5.4788C15.7735 5.4981 15.6841 5.51844 15.5869 5.53669C15.4393 5.56537 15.2818 5.59093 15.127 5.61649C15.0303 5.6337 14.9378 5.65143 14.8385 5.66655C14.6795 5.69159 14.5116 5.71297 14.3463 5.7354C14.2419 5.74948 14.1426 5.76512 14.036 5.77816C13.863 5.79955 13.6811 5.81728 13.5017 5.83553C13.3952 5.84649 13.2928 5.859 13.1842 5.86943C13.0044 5.8856 12.8157 5.8976 12.6301 5.91116C12.5132 5.9195 12.4015 5.93045 12.283 5.93776C12.0849 5.94923 11.8791 5.95653 11.6759 5.96435C11.5621 5.96905 11.4529 5.97635 11.3376 5.98C11.0153 5.98939 10.6863 5.9946 10.3501 5.9946C10.0143 5.9946 9.68479 5.98939 9.36256 5.98C9.24769 5.97635 9.13907 5.96905 9.02577 5.96487C8.82203 5.95653 8.61569 5.94923 8.41767 5.93776C8.30073 5.93045 8.19003 5.9195 8.07465 5.91168C7.88754 5.8976 7.69784 5.8856 7.51645 5.86943C7.41042 5.85952 7.31063 5.84701 7.20668 5.83605C7.02478 5.81728 6.84027 5.80007 6.6646 5.77816C6.56169 5.76512 6.4645 5.75 6.36367 5.73696C6.19527 5.71401 6.02428 5.69211 5.86212 5.66655C5.76701 5.65195 5.67813 5.63474 5.5851 5.61857C5.42554 5.59197 5.26494 5.5659 5.11318 5.53669C5.02171 5.51948 4.93803 5.50018 4.84967 5.48245C4.70519 5.4522 4.5581 5.42299 4.41985 5.3917C4.33357 5.37188 4.25509 5.3505 4.1709 5.33016C4.03992 5.29782 3.90739 5.26601 3.78317 5.23263C3.70417 5.21125 3.63297 5.1883 3.55812 5.16639C3.4391 5.13249 3.31853 5.09807 3.2073 5.06313C3.13558 5.04018 3.07217 5.01619 3.00356 4.99324C2.89858 4.95726 2.79047 4.92127 2.69328 4.88476C2.62935 4.86077 2.57374 4.83574 2.51345 4.81122C2.42198 4.77472 2.32791 4.73821 2.24423 4.70066C2.18758 4.6751 2.13872 4.64902 2.08623 4.62347C2.00983 4.58696 1.93135 4.54993 1.86326 4.5129C1.81388 4.48578 1.77335 4.45971 1.72813 4.43258C1.66784 4.39608 1.60391 4.36009 1.5509 4.3241C1.51036 4.29646 1.47917 4.26882 1.44279 4.2417C1.39757 4.20624 1.34924 4.17129 1.31078 4.13635C1.28011 4.10871 1.2588 4.08107 1.23334 4.0529C1.20215 4.01952 1.16837 3.98562 1.14498 3.95277C1.12523 3.9246 1.11536 3.89748 1.10132 3.87036C1.08417 3.83751 1.0639 3.80517 1.05455 3.77336L1.04051 3.66435C1.11276 2.72819 4.93075 1.04308 10.3501 1.04308ZM21.9834 12.6615C21.8712 12.0596 21.1814 11.4239 19.7777 10.6222L20.6704 3.96372V3.9632V3.96268L20.6976 3.7598C20.7007 3.73685 20.7022 3.7139 20.7022 3.69095C20.7022 1.5156 15.2465 0 10.3501 0C5.45465 0 0 1.5156 0 3.69095C0 3.7139 0.00155922 3.73685 0.00467765 3.7598L0.031704 3.96268V3.9632V3.96372L2.23175 20.3648C2.29984 22.2834 7.23267 23 10.3501 23C12.073 23 13.8022 22.8195 15.2184 22.491C15.7896 22.3585 16.3005 22.2037 16.7387 22.0306C17.8649 21.5835 18.4471 21.0223 18.4699 20.3648L19.3721 13.6388C19.9049 13.7645 20.3425 13.8282 20.6991 13.8282C21.2142 13.8282 21.5608 13.6967 21.7818 13.4323C21.9641 13.2148 22.0354 12.941 21.9834 12.6615Z" fill="#10B981" />
              </svg>
            </div>

            <div>
              <p className="text-2xl font-bold text-foreground leading-tight">
                {stats.remainingQuota}
              </p>
              <p className="text-xs text-muted-foreground">
                Quota Remaining
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="ml-auto border-primary text-primary bg-primary/10 text-xs whitespace-nowrap hover:bg-primary hover:text-white"
            onClick={() => setShowQuotaDialog(true)}
          >
            <ArrowUpCircle className="h-3.5 w-3.5 mr-1" />
            Request Increase
          </Button>
        </div>
      </div>

      {/* Search + actions */}
      <Card className="sticky top-16 z-30 glass-panel backdrop-blur border-border/50 p-0">
        <CardContent className="py-0 px-0">
          <div className="flex items-center gap-3 p-4 px-6">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, region, or request ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-background/50"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              className="rounded-full shrink-0"
              onClick={handleRefresh}
              disabled={refreshing || loading}
            >
              <RefreshCw size={14} className={refreshing || loading ? "animate-spin" : ""} />
            </Button>
            <Button
              onClick={() => navigate("/aws/s3/create")}
              disabled={hasReachedQuota}
              className="bg-primary hover:bg-primary/90 text-white gap-1.5 shrink-0"
              tooltip={
                hasReachedQuota
                  ? `Bucket quota reached (${MAX_BUCKETS}). Request a quota increase.`
                  : undefined
              }
            >
              + Create Bucket
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-lg border border-border/50 bg-card/50 backdrop-blur overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[1400px]">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-muted-foreground border-b border-border/50">
                {[
                  "Request ID",
                  "Bucket Name",
                  "Type",
                  "Encryption",
                  "Versioning",
                  "Public Access",
                  "Region",
                  "Creation Date",
                ].map((h) => (
                  <th key={h} className="px-5 py-3 text-left font-medium whitespace-nowrap">
                    {h}
                  </th>
                ))}
                <th className="px-5 py-3 text-right font-medium whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading || refreshing ? (
                <tr>
                  <td colSpan={11}>
                    <Loader label="Loading buckets..." />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-5 py-16 text-center text-muted-foreground text-sm">
                    No buckets yet. Click <span className="text-foreground">Create Bucket</span> to provision your first one.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-border/40 last:border-0 hover:bg-accent/20 transition-colors"
                  >
                    <td className="px-5 py-4 font-mono text-muted-foreground whitespace-nowrap">{r.id}</td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <button
                        onClick={() => navigate(`/aws/s3/buckets/${encodeURIComponent(r.name)}?region=${encodeURIComponent(r.region)}&tab=objects`)}
                        className="text-primary hover:underline text-sm font-mono"
                      >
                        {r.name}
                      </button>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <Badge variant="outline" className="bg-orange-500/15 text-orange-400 border-orange-500/30">
                        {r.meta.bucketType === "directory" ? "Directory" : "General"}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-muted-foreground ">{encryptionLabel(r.meta.encryption)}</td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      {r.meta.versioning ? (
                        <Badge variant="outline" className="bg-success/15 text-success border-success/30">Enable</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-muted/40 text-muted-foreground border-border">Disable</Badge>
                      )}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-muted-foreground ">{r.meta.publicAccess ? "Allowed" : "Blocked"}</td>
                    <td className="px-5 py-4 whitespace-nowrap text-muted-foreground ">{regionLabel(r.region)}</td>

                    <td className="px-5 py-4 whitespace-nowrap text-muted-foreground">
                      {formatDate(r.createdAt)}
                    </td>
                    {/* <td className="px-5 py-4 whitespace-nowrap">{statusBadge(r)}</td> */}
                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <CopyIconButton
                          value={`arn:aws:s3:::${r.name}`}
                          label="Copy ARN"
                          alertTitle="ARN copied"
                          className="h-auto w-auto p-1.5 text-muted-foreground hover:text-foreground"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDelete(r.id)}
                          className="h-auto w-auto p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          tooltip="Delete Bucket"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <S3QuotaIncreaseDialog
        open={showQuotaDialog}
        onOpenChange={setShowQuotaDialog}
        currentMaxBuckets={MAX_BUCKETS}
        usedBuckets={userBucketCount}
        requestedquota={requestedquota}
        setrequestedquota={setrequestedquota}
        reason={reason}
        setreason={setreason}
        submitquota={submitquota}
        quotaError={quotaError}
        setQuotaError={setQuotaError}
        touched={touched}
        setTouched={setTouched}
        isMAxREached={false}
        onSubmit={async (approverEmail) => {
          if (!currentUser?.id) return;

          try {
            setsubmitquota(true);
            const token = localStorage.getItem("token");
            const response = await fetch(
              `${env.bucketService}s3-quota/${currentUser?.id}/request`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                  "x-client-ip": (await getClientIp()) || "",
                },
                body: JSON.stringify({
                  requestedQuota: requestedquota - MAX_BUCKETS,
                  reason,
                  approverEmail,
                }),
              }
            );

            const data = await response.json();

            if (!response.ok) {
              throw new Error(
                data?.message ||
                data?.error ||
                "Failed to submit S3 quota request"
              );
            }

            alert({
              title: "S3 quota request submitted successfully",
              severity: "success",
            });
            await refreshCurrentUser();
            setShowQuotaDialog(false);
            setrequestedquota(0);
            setreason("");
            setQuotaError("");
            setTouched(false);

          } catch (error: any) {
            alert({
              title: "Failed",
              description:
                error?.message ||
                "Failed to submit S3 quota request",
              severity: "error",
            });
          } finally {
            setsubmitquota(false);
          }
        }}
      />
    </div>
  );
}

function StatCard({ icon, value, label, color }: { icon: React.ReactNode; value: number; label: string; color: string }) {
  return (
    <div className="flex-1 min-w-[140px] flex items-center gap-3 rounded-lg border border-border/50 bg-card/50 backdrop-blur px-4 py-3 hover:border-primary/30 transition-colors">
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg shrink-0 ${color}`}>{icon}</div>
      <div>
        <p className="text-2xl font-bold text-foreground leading-tight">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
