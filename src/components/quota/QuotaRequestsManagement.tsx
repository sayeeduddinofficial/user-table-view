/**
 * QuotaRequestsManagement.tsx
 * Top-level orchestrator for Quota Requests using React Query hooks
 */

import { useState, useEffect, useRef } from "react";
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
import { useSearchParams, useNavigate } from "react-router-dom";
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "@/auth/msalConfig";
import {
  useQuotaRequests,
  useApproveQuotaRequest,
  useRejectQuotaRequest,
  useApproveQuotaRequestByToken,
  useRejectQuotaRequestByToken,
} from "@/hooks/useQuotaRequests";
import type { QuotaRequest } from "@/components/quota/quotaRequestsApi";

export function QuotaRequestsManagement() {
  const navigate = useNavigate();
  const [showContent, setShowContent] = useState(false);
  const [processingEmailAction, setProcessingEmailAction] = useState(false);
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

  const [searchParams, setSearchParams] = useSearchParams();
  const { instance } = useMsal();
  const emailActionProcessed = useRef(false);
  const initialLoadDone = useRef(false);

  const deepLinkToken = searchParams.get("token");
  const deepLinkRejectToken = searchParams.get("reject_token");
  const { currentUser } = useAppStore();

  const hasEmailToken = !!(deepLinkToken || deepLinkRejectToken);

  // React Query hooks
  const { data: requests = [], isLoading } = useQuotaRequests();
  const approveRequestMutation = useApproveQuotaRequest();
  const rejectRequestMutation = useRejectQuotaRequest();
  const approveByTokenMutation = useApproveQuotaRequestByToken();
  const rejectByTokenMutation = useRejectQuotaRequestByToken();

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

    const returnUrl = `/admin/quota-requests${queryString}${
      email ? `&email=${encodeURIComponent(email)}` : ""
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

  // Process email action tokens
  useEffect(() => {
    if (emailActionProcessed.current) return;
    if (!initialLoadDone.current) return;
    if (!hasEmailToken) {
      setShowContent(true);
      return;
    }

    const processEmailAction = async () => {
      emailActionProcessed.current = true;
      setProcessingEmailAction(true);
      setSearchParams({}, { replace: true });

      try {
        if (deepLinkToken) {
          await approveByTokenMutation.mutateAsync(deepLinkToken);
        } else if (deepLinkRejectToken) {
          await rejectByTokenMutation.mutateAsync(deepLinkRejectToken);
        }
      } finally {
        setProcessingEmailAction(false);
        setShowContent(true);
      }
    };

    processEmailAction();
  }, [initialLoadDone.current, hasEmailToken]);

  // Mark initial load as done when requests are loaded
  useEffect(() => {
    if (!isLoading) {
      initialLoadDone.current = true;
      if (!hasEmailToken) {
        setShowContent(true);
      }
    }
  }, [isLoading, hasEmailToken]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  async function handleReview() {
    if (!reviewDialog.request) return;

    const payload = {
      requestId: reviewDialog.request.id,
      adminNotes,
    };

    if (reviewDialog.action === "approved") {
      await approveRequestMutation.mutateAsync(payload);
    } else {
      await rejectRequestMutation.mutateAsync(payload);
    }

    setReviewDialog({ open: false, request: null, action: "approved" });
    setAdminNotes("");
  }

  function canApproveRequest(req: QuotaRequest) {
    if (!currentUser) return false;

    // Super Admin can approve everything
    if (currentUser.role === "SuperAdmin") {
      return true;
    }

    // Admin can approve only USER requests
    if (
      currentUser.role === "SplunkOps.Admin" &&
      req.requested_by_role === "SplunkOps.User"
    ) {
      return true;
    }

    return false;
  }

  // Resolve display status (check if expired client-side)
  function resolveStatus(req: QuotaRequest) {
    if (
      req.status.toLowerCase() === "pending" &&
      new Date(req.expires_at).getTime() < Date.now()
    ) {
      return "expired";
    }
    return req.status.toLowerCase();
  }

  function statusBadge(status: string) {
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
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (!showContent || processingEmailAction || isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
        <span className="text-sm text-muted-foreground">Loading requests...</span>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Clock className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground">No quota requests found</p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          No requests have been submitted yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
                    {" "}
                    {req.current_quota + req.requested_quota}{" "}
                  </span>{" "}
                  VMs
                </p>

                <p className="text-sm text-muted-foreground">
                  Reason: {req.reason}
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
                ? `Approve quota increase to ${
                    (reviewDialog.request?.current_quota || 0) +
                    (reviewDialog.request?.requested_quota || 0)
                  } VMs?`
                : `Reject quota increase request?`}
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
                setAdminNotes("");
                setReviewDialog({
                  open: false,
                  request: null,
                  action: "approved",
                });
              }}
            >
              Cancel
            </Button>

            <Button 
              onClick={handleReview} 
              disabled={approveRequestMutation.isPending || rejectRequestMutation.isPending}
            >
              {(approveRequestMutation.isPending || rejectRequestMutation.isPending) && (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              )}
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