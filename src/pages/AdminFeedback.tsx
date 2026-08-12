import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Lightbulb,
  Bug,
  Sparkles,
  MessageSquarePlus,
  Search,
  Eye,
  StickyNote,
  FileText,
  Download,
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "react-router-dom";
// import { ROLE_LABELS } from "@/types";
import { useDialog } from "@/components/ui/dialog-context";
import { useAllFeedback, useAttachments, useReviewFeedback, useDownloadAttachment } from "@/hooks/useFeedback";
import type { FeedbackRow } from "@/components/feedback/feedbackApi";

type FeedbackType = "improvement" | "requirement" | "enhancement" | "bug";

const typeConfig: Record<string, { label: string; icon: typeof Lightbulb; color: string }> = {
  improvement: { label: "Improvement", icon: Lightbulb, color: "bg-yellow-500/10 text-yellow-500" },
  requirement: { label: "Requirement", icon: MessageSquarePlus, color: "bg-primary/10 text-primary" },
  enhancement: { label: "Enhancement", icon: Sparkles, color: "bg-green-500/10 text-green-500" },
  bug: { label: "Bug Report", icon: Bug, color: "bg-destructive/10 text-destructive" },
};

const typeReverseMapping: Record<string, FeedbackType> = {
  Improvement: "improvement",
  "New Requirement": "requirement",
  Enhancement: "enhancement",
  "Bug Report": "bug",
};

const statusColors: Record<string, string> = {
  Submitted: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
  "Under Review": "bg-blue-500/10 text-blue-600 border-blue-500/30",
  "In Progress": "bg-purple-500/10 text-purple-600 border-purple-500/30",
  Resolved: "bg-green-600/10 text-green-700 border-green-600/30",
  Rejected: "bg-red-500/10 text-red-600 border-red-500/30",
};

const getCurrentUserInfo = (): { id: number | null; role: string | null } => {
  try {
    const token = localStorage.getItem("token");
    if (!token) return { id: null, role: null };
    const payload = JSON.parse(atob(token.split(".")[1]));
    return { id: Number(payload.id || payload.sub || payload.userId), role: payload.role || null };
  } catch {
    return { id: null, role: null };
  }
};

export default function AdminFeedback() {
  const { alert } = useDialog();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [{ id: currentUserId, role: currentUserRole }] = useState(getCurrentUserInfo);
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackRow | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const location = useLocation();
  const isAdminFeedbackRoute = location.pathname === "/admin/feedback";

  const { data: feedbackList = [], isLoading: loading } = useAllFeedback(isAdminFeedbackRoute);
  const { data: attachments = [] } = useAttachments(selectedFeedback?.id ?? null, isAdminFeedbackRoute && !!selectedFeedback?.id);
  const reviewMutation = useReviewFeedback();
  const downloadMutation = useDownloadAttachment();

  const handleUpdateFeedback = async () => {
    if (!selectedFeedback) return;

    if (adminNotes && !adminNotes.trim()) {
      alert({ title: "Invalid input", description: "Admin notes cannot contain only spaces", severity: "error" });
      return;
    }

    const statusUnchanged = newStatus === selectedFeedback.status;
    const notesUnchanged = adminNotes.trim() === (selectedFeedback.admin_notes || "").trim();
    if (statusUnchanged && notesUnchanged) {
      alert({ title: "No changes detected", description: "Please update the status or add admin notes before saving.", severity: "warning" });
      return;
    }

    await reviewMutation.mutateAsync({ feedbackId: selectedFeedback.id, status: newStatus, adminNotes });
    setSelectedFeedback(null);
    setAdminNotes("");
    setNewStatus("");
  };

  const filtered = feedbackList.filter((fb) => {
    const matchesSearch =
      !search ||
      fb.title.toLowerCase().includes(search.toLowerCase()) ||
      fb.user_email?.toLowerCase().includes(search.toLowerCase()) ||
      fb.user_role?.toLowerCase().includes(search.toLowerCase()) ||
      fb.priority?.toLowerCase().includes(search.toLowerCase()) ||
      fb.status?.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "all" || fb.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const counts = {
    all: feedbackList.length,
    improvement: feedbackList.filter((f) => f.type === "Improvement").length,
    requirement: feedbackList.filter((f) => f.type === "New Requirement").length,
    enhancement: feedbackList.filter((f) => f.type === "Enhancement").length,
    bug: feedbackList.filter((f) => f.type === "Bug Report").length,
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header title="Feedback Management" subtitle="Review all user feedback" showNewRequest={false} />

      <div className="sticky top-14 md:top-16 z-20 bg-background/80 backdrop-blur-lg border-b border-border px-4 md:px-6 py-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by title, user email, or name..." className="pl-9" />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types ({counts.all})</SelectItem>
              <SelectItem value="New Requirement">New Requirements ({counts.requirement})</SelectItem>
              <SelectItem value="Improvement">Improvements ({counts.improvement})</SelectItem>
              <SelectItem value="Enhancement">Enhancements ({counts.enhancement})</SelectItem>
              <SelectItem value="Bug Report">Bugs ({counts.bug})</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading feedback...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <MessageSquarePlus className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>No feedback found</p>
          </div>
        ) : (
          filtered.map((fb) => {
            const mappedType: FeedbackType = typeReverseMapping[fb.type] || "improvement";
            const canReview =
              currentUserRole === "SuperAdmin" ||
              (fb.user_role === "SplunkOps.User" && Number(fb.user_id) !== currentUserId);
            const config = typeConfig[mappedType];
            const Icon = config.icon;
            return (
              <Card key={fb.id} className="hover:border-primary/20 transition-colors">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className={`p-2 rounded-lg ${config.color} flex-shrink-0 self-start`}><Icon className="h-4 w-4" /></div>
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-[10px]">{config.label}</Badge>
                        <Badge variant={fb.priority === "high" || fb.priority === "critical" ? "destructive" : "secondary"} className="text-[10px]">{fb.priority}</Badge>
                        <Badge className={`text-[10px] ${statusColors[fb.status] || ""}`} variant="outline">{fb.status}</Badge>
                      </div>
                      <p className="font-medium text-sm text-foreground">{fb.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 break-words whitespace-pre-wrap line-clamp-2" title={fb.description}>{fb.description}</p>
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span>From: <span className="font-medium text-foreground">{fb.user_name || fb.user_email}</span></span>
                        <span>{new Date(fb.created_at).toLocaleDateString()}</span>
                      </div>
                      {fb.admin_notes && canReview && (
                        <div className="mt-2 text-xs bg-muted/50 rounded-md p-2 flex items-start gap-2">
                          <StickyNote className="h-3 w-3 mt-0.5 text-primary flex-shrink-0" />
                          <span className="text-muted-foreground">{fb.admin_notes}</span>
                        </div>
                      )}
                    </div>
                    {canReview && (
                      <Button
                        variant="ghost" size="sm" className="self-start flex-shrink-0"
                        onClick={() => { setSelectedFeedback(fb); setNewStatus(fb.status); setAdminNotes(fb.admin_notes || ""); }}
                      >
                        <Eye className="h-4 w-4 mr-1" />Review
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Review Dialog */}
      <Dialog open={!!selectedFeedback} onOpenChange={(open) => !open && setSelectedFeedback(null)}>
        <DialogContent className="sm:max-w-lg max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Feedback</DialogTitle>
            <DialogDescription>Update status and add notes for this feedback.</DialogDescription>
          </DialogHeader>
          {selectedFeedback && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/30 p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Title</span>
                  <span className="text-foreground font-medium text-right max-w-[60%]">{selectedFeedback.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <span className="text-foreground">{typeConfig[typeReverseMapping[selectedFeedback.type] || "improvement"]?.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Priority</span>
                  <Badge variant="outline" className="text-xs">{selectedFeedback.priority}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">User</span>
                  <span className="text-foreground">{selectedFeedback.user_role || selectedFeedback.user_email}</span>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Description</Label>
                <p className="text-sm text-foreground bg-muted/30 rounded-md p-3">{selectedFeedback.description}</p>
              </div>

              {attachments.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Attachments ({attachments.length})</Label>
                  <div className="flex flex-col gap-2">
                    {attachments.map((att) => (
                      <div key={att.id} className="flex items-center gap-3 bg-muted/50 rounded-md p-2 border border-border">
                        {att.file_type.startsWith("image/") ? (
                          <img src={att.url} alt={att.file_name} className="h-10 w-10 object-cover rounded border border-border flex-shrink-0 cursor-pointer" onClick={() => window.open(att.url, "_blank")} title="Click to open in new tab" />
                        ) : (
                          <div className="cursor-pointer" title="Double click to download" onDoubleClick={() => downloadMutation.mutate({ feedbackId: selectedFeedback.id, attachmentId: att.id, fileName: att.file_name })}>
                            <FileText className="h-10 w-10 text-primary flex-shrink-0 p-1" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <p className="text-xs font-medium break-all whitespace-normal leading-snug">{att.file_name}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{att.file_type} · {(att.file_size / 1024).toFixed(1)} KB</p>
                        </div>
                        <Button
                          variant="ghost" size="sm" className="h-8 w-8 p-0 flex-shrink-0"
                          onClick={() => downloadMutation.mutate({ feedbackId: selectedFeedback.id, attachmentId: att.id, fileName: att.file_name })}
                        >
                          <Download className="h-4 w-4 text-primary" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {selectedFeedback?.status === "Submitted" && <SelectItem value="Submitted" disabled>Submitted</SelectItem>}
                    <SelectItem value="Under Review">Under Review</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Resolved">Resolved</SelectItem>
                    <SelectItem value="Rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Admin Notes</Label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => {
                    if (e.target.value.length > 150) {
                      alert({ title: "Character limit exceeded", description: "Admin notes cannot exceed 150 characters", severity: "warning" });
                      return;
                    }
                    setAdminNotes(e.target.value);
                  }}
                  maxLength={150}
                  placeholder="Add notes about this feedback..."
                  rows={3}
                />
                <div className="text-xs text-muted-foreground text-right">{adminNotes.length}/150 characters</div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleUpdateFeedback} disabled={reviewMutation.isPending} className="flex-1">Save</Button>
                <Button variant="outline" onClick={() => setSelectedFeedback(null)} className="flex-1">Cancel</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
