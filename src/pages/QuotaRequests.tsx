import { useEffect, useState, useCallback, useRef } from "react";
import { Header } from "@/components/layout/Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, Clock, Loader2, RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useAppStore } from "@/store/appStore";
import { useDialog } from "@/components/ui/dialog-context";
import { getClientIp } from "@/utils/getClientIP";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "@/auth/msalConfig";
import { env } from "@/lib/env";
import { jwtDecode } from "jwt-decode";

interface QuotaRequest {
  id: string;
  user_id: string;
  user_email: string | null;
  user_name: string | null;
  current_quota: number;
  requested_quota: number;
  reason: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  requested_by_role: string;
  manager_email: string;
  expires_at: string;
  service: string;
}
const API_VM_URL = env.vmRequest;
function getAccessToken() {
  return localStorage.getItem("token");
}

export default function QuotaRequests() {
  const { alert } = useDialog();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<QuotaRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingEmailAction, setProcessingEmailAction] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [reviewDialog, setReviewDialog] = useState<{
    open: boolean;
    request: QuotaRequest | null;
    action: "approved" | "rejected";
  }>({
    open: false,
    request: null,
    action: "approved",
  });
  const [adminNotes, setAdminNotes] = useState("");
  const [updating, setUpdating] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();
  const { instance } = useMsal();
  const emailActionProcessed = useRef(false);
  const initialLoadDone = useRef(false);

  const deepLinkToken = searchParams.get("token");
  const deepLinkRejectToken = searchParams.get("reject_token");
  const { currentUser } = useAppStore();

  const hasEmailToken = !!(deepLinkToken || deepLinkRejectToken);

  // Friendly messages for email link-based action errors
  const emailActionFriendlyErrors: Record<string, string> = {
    INVALID_TOKEN: "Invalid approval link. Please contact your administrator.",
    INVALID_OR_EXPIRED_TOKEN: "This link has expired (links are valid for 48 hours). No action was taken.",
    REQUEST_NOT_FOUND: "This quota request could not be found. It may have been deleted.",
    ALREADY_PROCESSED: "This request has already been approved or rejected. No further action is needed.",
    REQUEST_EXPIRED: "This request has expired. It may have been superseded by a newer request or the 48-hour time limit has passed.",
    QUOTA_EXCEEDED: "Approval would exceed the maximum VM quota (50). No action was taken.",
    UNAUTHORIZED_USER: "This link was sent to a different manager. Only the recipient manager can approve or reject this request.",
  };

  // Check authentication on component mount
  useEffect(() => {
    const appToken = localStorage.getItem("token");
    if (appToken || !hasEmailToken) return;

    const email = searchParams.get("email") || "";
    const source = searchParams.get("source") || "";
    const query = [];
    if (deepLinkToken) query.push(`token=${deepLinkToken}`);
    if (deepLinkRejectToken) query.push(`reject_token=${deepLinkRejectToken}`);
    const queryString = query.length ? `?${query.join("&")}` : "";

    const returnUrl = `/admin/quota-requests${queryString}${email ? `&email=${encodeURIComponent(email)}` : ""
      }${source ? `&source=${encodeURIComponent(source)}` : ""}`;

    if (source === "email") {
      sessionStorage.setItem("postLoginReturnUrl", returnUrl);
      sessionStorage.removeItem("emailLoginTriggered");

      instance
        .loginRedirect({
          ...loginRequest,
          loginHint: email || undefined,
          prompt: "select_account",
        })
        .catch((err: unknown) => {
          console.error("[QuotaRequests] loginRedirect failed:", err);
          navigate(
            `/login?returnUrl=${encodeURIComponent(returnUrl)}&email=${encodeURIComponent(email)}&source=${encodeURIComponent(source)}`,
            { replace: true }
          );
        });
    } else {
      navigate(`/login?returnUrl=${encodeURIComponent(returnUrl)}`, { replace: true });
    }
  }, []);

  const statusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return (
          <Badge variant="outline" className="border-warning text-warning">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "approved":
        return (
          <Badge className="bg-success text-success-foreground">
            <Check className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        );
      case "denied":
        return (
          <Badge variant="destructive">
            <X className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      case "expired":
        return (
          <Badge variant="outline" className="border-muted text-muted-foreground">
            <Clock className="h-3 w-3 mr-1" />
            Expired
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };
  const fetchQuotaRequests = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const token = await getAccessToken();
      const response = await fetch(`${API_VM_URL}/api/vms/getall/quota-requests`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "x-client-ip": (await getClientIp()) || "",
        },
      });

      const data = await response.json();
      const payload = Array.isArray(data?.data) ? data.data : [];
      setRequests(payload);
      initialLoadDone.current = true;

      if (!response.ok) {
        throw new Error(data?.error || data?.message || "Failed to load quota requests");
      }
    } catch (err) {
      console.error("Error fetching quota requests:", err);
      if (!silent) {
        alert({
          title: "Failed to load quota requests",
          severity: "error",
        });
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [alert]);

  // Initial fetch
  useEffect(() => {
    const loadData = async () => {
      if (!hasEmailToken) {
        // Normal page load - fetch and show immediately
        await fetchQuotaRequests(false);
        setShowContent(true);
      } else {
        // Email token present - fetch silently, wait for processing
        await fetchQuotaRequests(true);
      }
    };
    loadData();
  }, [hasEmailToken]);

  // Process email action tokens
  useEffect(() => {
    if (emailActionProcessed.current) return;
    if (!initialLoadDone.current) return;
    if (!hasEmailToken) {
      // No email token, show content immediately
      setShowContent(true);
      return;
    }

    const processEmailAction = async () => {
      emailActionProcessed.current = true;
      setProcessingEmailAction(true);
      setSearchParams({}, { replace: true });

      try {
        if (deepLinkToken) {
          await handleEmailApprove(deepLinkToken);
        } else if (deepLinkRejectToken) {
          await handleEmailReject(deepLinkRejectToken);
        }
      } finally {
        setProcessingEmailAction(false);
        setShowContent(true);
      }
    };

    processEmailAction();
  }, [initialLoadDone.current, hasEmailToken]);

  const handleEmailApprove = async (jwtToken: string) => {
    try {
      const authToken = localStorage.getItem("token");
      const decoded: any = jwtDecode(jwtToken);

      let endpoint = "";

      switch (decoded.service?.toLowerCase()) {
        case "s3":
          endpoint =
            `${env.bucketService}s3-quota/approve?token=${encodeURIComponent(jwtToken)}`;
          break;

        case "vpc":
          endpoint =
            `${env.vpcService}/vpc-quota/approve?token=${encodeURIComponent(jwtToken)}`;
          break;

        case "lb":
          endpoint =
            `${env.lbService}/lb-quota/approve?token=${encodeURIComponent(jwtToken)}`;
          break;

        case "route53":
          endpoint =
            `${env.route53Service}/route53-quota/approve?token=${encodeURIComponent(jwtToken)}`;
          break;

        case "rds":
          endpoint =
            `${env.rds}/rds-quota/approve?token=${encodeURIComponent(jwtToken)}`;
          break;

        case "eks":
          endpoint =
            `${env.eksClusterService}/eks/eks-quota/approve?token=${encodeURIComponent(jwtToken)}`;
          break;

        default:
          endpoint =
            `${API_VM_URL}/api/vms/quota-request/approve?token=${encodeURIComponent(jwtToken)}`;
      }

      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "x-client-ip": (await getClientIp()) || "",
        },
      });
      const data = await res.json();

      if (!res.ok) {
        alert({
          title: emailActionFriendlyErrors[data?.code] || data?.message || "Approval failed.",
          severity: data?.code === "ALREADY_PROCESSED" ? "warning" : "error",
        });
        await fetchQuotaRequests(true);
        return;
      }

      alert({
        title: "Quota request approved successfully.",
        severity: "success"
      });
      await fetchQuotaRequests(true);
    } catch (err) {
      console.error("Email approve failed:", err);
      alert({
        title: "An unexpected error occurred during approval.",
        severity: "error"
      });
    }
  };

  const handleEmailReject = async (jwtToken: string) => {
    try {
      const authToken = localStorage.getItem("token");
      const decoded: any = jwtDecode(jwtToken);

      let endpoint = "";

      switch (decoded.service?.toLowerCase()) {
        case "s3":
          endpoint =
            `${env.bucketService}s3-quota/reject?token=${encodeURIComponent(jwtToken)}`;
          break;

        case "vpc":
          endpoint =
            `${env.vpcService}/vpc-quota/reject?token=${encodeURIComponent(jwtToken)}`;
          break;

        case "lb":
          endpoint =
            `${env.lbService}/lb-quota/reject?token=${encodeURIComponent(jwtToken)}`;
          break;

        case "route53":
          endpoint =
            `${env.route53Service}/route53-quota/reject?token=${encodeURIComponent(jwtToken)}`;
          break;

        case "rds":
          endpoint =
            `${env.rds}/rds-quota/reject?token=${encodeURIComponent(jwtToken)}`;
          break;

        case "eks":
          endpoint =
            `${env.eksClusterService}/eks/eks-quota/reject?token=${encodeURIComponent(jwtToken)}`;
          break;
        default:
          endpoint =
            `${API_VM_URL}/api/vms/quota-request/reject?token=${encodeURIComponent(jwtToken)}`;
      }
      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "x-client-ip": (await getClientIp()) || "",
        },
      });
      const data = await res.json();

      if (!res.ok) {
        alert({
          title: emailActionFriendlyErrors[data?.code] || data?.message || "Rejection failed.",
          severity: data?.code === "ALREADY_PROCESSED" ? "warning" : "error",
        });
        await fetchQuotaRequests(true);
        return;
      }

      alert({
        title: "Quota request rejected successfully.",
        severity: "success"
      });
      await fetchQuotaRequests(true);
    } catch (err) {
      console.error("Email reject failed:", err);
      alert({
        title: "An unexpected error occurred during rejection.",
        severity: "error"
      });
    }
  };

  const handleREVIEW = async () => {
    if (!reviewDialog.request) return;
    try {
      setUpdating(true);
      const token = await getAccessToken();
      let endpoint = "";
      let method = "POST";

      const service = reviewDialog.request?.service?.toLowerCase();

      if (service === "vpc") {
        endpoint =
          reviewDialog.action === "approved"
            ? `${env.vpcService}/vpc-quota/approve/${reviewDialog.request.id}`
            : `${env.vpcService}/vpc-quota/deny/${reviewDialog.request.id}`;

        method = "POST";
      }
      else if (service === "lb") {
        endpoint =
          reviewDialog.action === "approved"
            ? `${env.lbService}/lb-quota/${reviewDialog.request.id}/approve`
            : `${env.lbService}/lb-quota/${reviewDialog.request.id}/deny`;

        method = "POST";
      }
      else if (service === "vm") {
        endpoint =
          reviewDialog.action === "approved"
            ? `${API_VM_URL}/api/vms/quota-request/${reviewDialog.request.id}/approve`
            : `${API_VM_URL}/api/vms/quota-request/${reviewDialog.request.id}/deny`;

        method = "PUT";
      }
      else if (service === "rds") {
        endpoint =
          reviewDialog.action === "approved"
            ? `${env.rds}/rds-quota/approve/${reviewDialog.request.id}`
            : `${env.rds}/rds-quota/deny/${reviewDialog.request.id}`;

        method = "POST";
      }
      else if (service === "eks") {
        endpoint =
          reviewDialog.action === "approved"
            ? `${env.eksClusterService}/eks/eks-quota/approve/${reviewDialog.request.id}`
            : `${env.eksClusterService}/eks/eks-quota/deny/${reviewDialog.request.id}`;

        method = "POST";
      }
      else if (service === "s3") {
        endpoint =
          reviewDialog.action === "approved"
            ? `${env.bucketService}s3-quota/${reviewDialog.request.id}/approve`
            : `${env.bucketService}s3-quota/${reviewDialog.request.id}/deny`;

        method = "POST";
      }
      else if (service === "route53") {
        endpoint =
          reviewDialog.action === "approved"
            ? `${env.route53Service}/route53-quota/approve/${reviewDialog.request.id}`
            : `${env.route53Service}/route53-quota/deny/${reviewDialog.request.id}`;

        method = "POST";
      }
      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-client-ip": (await getClientIp()) || "",
        },
        body: JSON.stringify({ admin_notes: adminNotes }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to update request");
      }
      alert({
        title: `Request ${reviewDialog.action === "approved" ? "approved" : "rejected"} successfully`,
        severity: "success",
      });
      setReviewDialog({ open: false, request: null, action: "approved" });
      setAdminNotes("");
      await fetchQuotaRequests(true);
    } catch (err) {
      console.error("Error updating quota request:", err);
      alert({
        title: err instanceof Error ? err.message : "Failed to update request",
        severity: "error",
      });
    } finally {
      setUpdating(false);
    }
  };
  const canApproveRequest = (req: QuotaRequest) => {
    if (!currentUser) return false;
    if (currentUser.role === "SuperAdmin")
       return true;
    if (currentUser.role === "SplunkOps.Admin" && req.requested_by_role === "SplunkOps.User") return true;
    // Approver can approve requests where they are the assigned manager
    if (currentUser.role === "SplunkOps.Approver" && req.manager_email === currentUser.email) return true;
    return false;
  };

  // Resolve display status (check if expired client-side)
  const resolveStatus = (req: QuotaRequest) => {
    if (
      req.status.toLowerCase() === "pending" &&
      new Date(req.expires_at).getTime() < Date.now()
    ) {
      return "expired";
    }
    return req.status.toLowerCase();
  };

  return (
    <div className="min-h-screen">
      <Header
        title="Quota Requests"
        subtitle="Review and manage quota increase requests"
        showNewRequest={false}
      />

      <div className="p-4 md:p-6">
        {(!showContent || processingEmailAction || loading) ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
            <span className="text-sm text-muted-foreground">Loading requests...</span>
          </div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Clock className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No quota requests found</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              No requests have been submitted yet.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => {
              const displayStatus = resolveStatus(req);
              const isPending = displayStatus === "pending";

              return (
                <div
                  key={req.id}
                  className="glass-panel rounded-xl p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-4"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-foreground">
                        {req.user_name || req.user_email}
                      </span>
                      {statusBadge(displayStatus)}
                    </div>

                    <p className="text-sm text-muted-foreground">
                      {req.user_email}
                    </p>

                    <p className="text-sm text-muted-foreground">
                      Quota:
                      <span className="text-foreground font-medium">
                        {" "}
                        {req.current_quota}{" "}
                      </span>
                      →
                      <span className="text-primary font-medium">
                        {req.current_quota + req.requested_quota}
                      </span>

                      {req.service === "vm" && " VMs"}
                      {req.service === "vpc" && " VPCs"}
                      {req.service === "lb" && " Load Balancers"}
                      {req.service === "rds" && " RDS Databases"}
                      {req.service === "eks" && " EKS Clusters"}
                      {req.service === "s3" && " S3 Buckets"}
                      {req.service === "route53" && " DNS Records"}
                    </p>

                    <p className="text-sm text-muted-foreground">
                      Reason: {req.reason}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Service:
                      <span className="font-medium text-foreground">
                        {" "}{req.service?.toUpperCase()}
                      </span>
                    </p>
                    {req.admin_notes && (
                      <p className="text-sm italic text-muted-foreground">
                        Admin notes: {req.admin_notes}
                      </p>
                    )}

                    <p className="text-xs text-muted-foreground">
                      {new Date(req.created_at).toLocaleString()}
                    </p>
                  </div>

                  {isPending && canApproveRequest(req) && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-success text-success-foreground hover:bg-success/90"
                        onClick={() =>
                          setReviewDialog({
                            open: true,
                            request: req,
                            action: "approved",
                          })
                        }
                      >
                        <Check className="h-4 w-4 mr-1" /> Approve
                      </Button>

                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() =>
                          setReviewDialog({
                            open: true,
                            request: req,
                            action: "rejected",
                          })
                        }
                      >
                        <X className="h-4 w-4 mr-1" /> Reject
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog
        open={reviewDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setReviewDialog({ open: false, request: null, action: "approved" });
            setAdminNotes("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewDialog.action === "approved" ? "Approve" : "Reject"} Quota
              Request
            </DialogTitle>

            <DialogDescription>
              {reviewDialog.action === "approved"
                ? `Approve quota increase to ${(reviewDialog.request?.current_quota || 0) +
                (reviewDialog.request?.requested_quota || 0)
                } ${reviewDialog.request?.service === "vm"
                  ? "VMs"
                  : reviewDialog.request?.service === "vpc"
                    ? "VPCs"
                    : reviewDialog.request?.service === "lb"
                      ? "Load Balancers"
                      : reviewDialog.request?.service === "rds"
                        ? "RDS Databases"
                        : reviewDialog.request?.service === "eks"
                          ? "EKS Clusters"
                          : reviewDialog.request?.service === "s3"
                            ? "S3 Buckets"
                            : reviewDialog.request?.service === "route53"
                              ? "DNS Records"
                              : "Resources"
                }?`
                : "Reject quota increase request?"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label>Admin Notes</Label>
            <Textarea
              value={adminNotes}
              placeholder="Add any notes for the requester..."
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAdminNotes(""); // clear notes
                setReviewDialog({
                  open: false,
                  request: null,
                  action: "approved",
                });
              }}
            >
              Cancel
            </Button>

            <Button onClick={handleREVIEW} disabled={updating}>
              {updating && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {reviewDialog.action === "approved"
                ? "Confirm Approval"
                : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
