import { Header } from "@/components/layout/Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Bug,
  FileText,
  Lightbulb,
  MessageSquarePlus,
  Send,
  Sparkles,
  Paperclip,
  X,
} from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CheckCircle } from "lucide-react";
import { useMyFeedback, useSubmitFeedback, useAttachments } from "@/hooks/useFeedback";

type FeedbackType = "improvement" | "requirement" | "enhancement" | "bug";

const typeMapping: Record<FeedbackType, string> = {
  improvement: "Improvement",
  requirement: "New Requirement",
  enhancement: "Enhancement",
  bug: "Bug Report",
};

const reverseTypeMapping: Record<string, FeedbackType> = {
  Improvement: "improvement",
  "New Requirement": "requirement",
  Enhancement: "enhancement",
  "Bug Report": "bug",
};

const typeConfig: Record<FeedbackType, { label: string; icon: typeof Lightbulb; color: string }> = {
  improvement: { label: "Improvement", icon: Lightbulb, color: "bg-yellow-500/10 text-yellow-500" },
  requirement: { label: "New Requirement", icon: MessageSquarePlus, color: "bg-primary/10 text-primary" },
  enhancement: { label: "Enhancement", icon: Sparkles, color: "bg-green-500/10 text-green-500" },
  bug: { label: "Bug Report", icon: Bug, color: "bg-destructive/10 text-destructive" },
};

const statusColors: Record<string, string> = {
  Submitted: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
  "Under Review": "bg-blue-500/10 text-blue-600 border-blue-500/30",
  "In Progress": "bg-purple-500/10 text-purple-600 border-purple-500/30",
  Resolved: "bg-green-600/10 text-green-700 border-green-600/30",
  Rejected: "bg-red-500/10 text-red-600 border-red-500/30",
};

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp", "text/plain", "text/x-log", "application/pdf"];
const ALLOWED_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp", "txt", "log", "pdf"];
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_FILES = 3;

export default function feedback() {
  const [type, setType] = useState<FeedbackType | "">("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileErrors, setFileErrors] = useState<string[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [errors, setErrors] = useState({ type: "", priority: "", title: "", description: "" });
  const [viewingFeedbackId, setViewingFeedbackId] = useState<string | null>(null);
  const [viewingFeedbackTitle, setViewingFeedbackTitle] = useState("");

  const { data: feedbackList = [] } = useMyFeedback();
  const submitMutation = useSubmitFeedback();
  const { data: attachmentItems = [], isLoading: loadingAttachments } = useAttachments(viewingFeedbackId);

  const handleFileChange = (newFiles: FileList | null) => {
    if (!newFiles) return;
    const errs: string[] = [];
    const valid: File[] = [];
    const existingNames = new Set(selectedFiles.map((f) => f.name));

    Array.from(newFiles).forEach((file) => {
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (existingNames.has(file.name)) {
        errs.push(`${file.name}: already added`);
        return;
      }
      if (!ALLOWED_TYPES.includes(file.type) && !ALLOWED_EXTENSIONS.includes(ext ?? "")) {
        errs.push(`${file.name}: unsupported file type`);
      } else if (file.size > MAX_FILE_SIZE) {
        errs.push(`${file.name}: exceeds 5 MB limit`);
      } else {
        valid.push(file);
        existingNames.add(file.name);
      }
    });

    const combined = [...selectedFiles, ...valid].slice(0, MAX_FILES);
    if (selectedFiles.length + valid.length > MAX_FILES) errs.push(`Maximum ${MAX_FILES} files allowed`);
    setSelectedFiles(combined);
    setFileErrors(errs);
  };

  const removeFile = (index: number) => setSelectedFiles((prev) => prev.filter((_, i) => i !== index));

  const handleSubmit = async () => {
    const newErrors = { type: "", priority: "", title: "", description: "" };
    let hasError = false;
    if (!type) { newErrors.type = "Feedback type is required"; hasError = true; }
    if (!priority) { newErrors.priority = "Priority is required"; hasError = true; }
    if (!title.trim()) { newErrors.title = "Title is required"; hasError = true; }
    if (!description.trim()) { newErrors.description = "Description is required"; hasError = true; }
    setErrors(newErrors);
    if (hasError) return;

    try {
      await submitMutation.mutateAsync({
        type: typeMapping[type as FeedbackType],
        priority,
        title,
        description,
        files: selectedFiles,
      });
      setShowSuccessModal(true);
      setTitle(""); setDescription(""); setPriority(""); setType(""); setSelectedFiles([]); setFileErrors([]);
    } catch {
      // error handled in hook
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header title="Feedback & Suggestions" subtitle="Help us improve the platform" />

      <div className="flex-1 p-4 md:p-6 max-w-5xl space-y-6">
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageSquarePlus className="h-5 w-5 text-primary" />
              Submit Feedback
            </CardTitle>
            <CardDescription>Share your ideas, report bugs, or request new features for the next version.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Feedback Type</Label>
                <Select value={type} onValueChange={(v) => { setType(v as FeedbackType); setErrors((p) => ({ ...p, type: "" })); }}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(typeConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <span className="flex items-center gap-2"><config.icon className="h-4 w-4" />{config.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.type && <p className="text-xs text-red-500">{errors.type}</p>}
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={(v) => { setPriority(v); setErrors((p) => ({ ...p, priority: "" })); }}>
                  <SelectTrigger><SelectValue placeholder="Select priority" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
                {errors.priority && <p className="text-xs text-red-500">{errors.priority}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={title}
                onChange={(e) => { if (e.target.value.length <= 150) { setTitle(e.target.value); setErrors((p) => ({ ...p, title: "" })); } }}
                maxLength={150}
                placeholder="Brief summary of your feedback"
              />
              {errors.title && <p className="text-xs text-red-500">{errors.title}</p>}
              <div className="text-xs text-muted-foreground text-right">{title.length}/150 characters</div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => { if (e.target.value.length <= 250) { setDescription(e.target.value); setErrors((p) => ({ ...p, description: "" })); } }}
                maxLength={250}
                rows={4}
              />
              {errors.description && <p className="text-xs text-red-500">{errors.description}</p>}
              <div className="text-xs text-muted-foreground text-right">{description.length}/250 characters</div>
            </div>

            <div className="space-y-2">
              <Label>Attachments <span className="text-muted-foreground text-xs">(optional, max 3 files, 5 MB each)</span></Label>
              <div
                className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${isDragOver ? "border-primary bg-primary/5 scale-[1.01]" : "border-border hover:border-primary/50"}`}
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setIsDragOver(false); handleFileChange(e.dataTransfer.files); }}
                onClick={() => document.getElementById("file-input")?.click()}
              >
                <Paperclip className={`h-6 w-6 mx-auto mb-2 transition-colors ${isDragOver ? "text-primary" : "text-muted-foreground"}`} />
                <p className={`text-sm transition-colors ${isDragOver ? "text-primary font-medium" : "text-muted-foreground"}`}>
                  {isDragOver ? "Drop files here to upload" : "Drag & drop files here, or click to select"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">PNG, JPG, GIF, WEBP, LOG, TXT, PDF · Max 5 MB each · Up to 3 files</p>
                <input
                  id="file-input" type="file" multiple accept=".png,.jpg,.jpeg,.gif,.webp,.log,.txt,.pdf"
                  className="hidden"
                  onClick={(e) => { (e.target as HTMLInputElement).value = ""; }}
                  onChange={(e) => handleFileChange(e.target.files)}
                />
              </div>
              {fileErrors.map((err, i) => <p key={i} className="text-xs text-red-500">{err}</p>)}
              {selectedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedFiles.map((file, i) => (
                    <div key={i} className="relative group flex items-center gap-2 bg-muted/50 rounded-md p-2 text-xs">
                      {file.type.startsWith("image/") ? (
                        <img src={URL.createObjectURL(file)} alt={file.name} className="h-10 w-10 object-cover rounded" />
                      ) : (
                        <FileText className="h-8 w-8 text-muted-foreground" />
                      )}
                      <div>
                        <p className="font-medium truncate max-w-[120px]">{file.name}</p>
                        <p className="text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <button onClick={() => removeFile(i)} className="ml-1 text-muted-foreground hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button disabled={submitMutation.isPending} onClick={handleSubmit} className="w-full sm:w-auto">
              <Send className="h-4 w-4 mr-2" />
              {submitMutation.isPending ? "Submitting..." : "Submit Feedback"}
            </Button>
          </CardContent>
        </Card>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Your Submissions</h2>
          {feedbackList.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No feedback submitted yet.</p>
          ) : (
            <div className="space-y-3">
              {feedbackList.map((fb) => {
                const mappedType = reverseTypeMapping[fb.type] || "improvement";
                const config = typeConfig[mappedType];
                const Icon = config.icon;
                return (
                  <Card key={fb.id} className="hover:border-primary/20 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${config.color} flex-shrink-0`}><Icon className="h-4 w-4" /></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-[10px]">{config.label}</Badge>
                            <Badge variant={fb.priority === "high" || fb.priority === "critical" ? "destructive" : "secondary"} className="text-[10px]">{fb.priority}</Badge>
                            <Badge className={`text-[10px] px-2 py-[2px] ${statusColors[fb.status] || ""}`}>{fb.status}</Badge>
                          </div>
                          <p className="font-medium text-sm text-foreground">{fb.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{fb.description}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
                          {Number(fb.attachment_count) > 0 && (
                            <button
                              onClick={() => { setViewingFeedbackId(fb.id); setViewingFeedbackTitle(fb.title); }}
                              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors"
                              title="View attachments"
                            >
                              <Paperclip className="h-3 w-3" />{fb.attachment_count}
                            </button>
                          )}
                          <span className="text-xs text-muted-foreground">{new Date(fb.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Attachments Viewer Dialog */}
      <Dialog open={!!viewingFeedbackId} onOpenChange={(open) => !open && setViewingFeedbackId(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Attachments</DialogTitle>
            <DialogDescription>{viewingFeedbackTitle}</DialogDescription>
          </DialogHeader>
          {loadingAttachments ? (
            <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
          ) : attachmentItems.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No attachments found.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {attachmentItems.map((att) => (
                <div key={att.id} className="flex items-center gap-3 bg-muted/50 rounded-md p-2 border border-border">
                  {att.file_type.startsWith("image/") ? (
                    <img src={att.url} alt={att.file_name} className="h-10 w-10 object-cover rounded border border-border flex-shrink-0 cursor-pointer" onClick={() => window.open(att.url, "_blank")} />
                  ) : (
                    <FileText className="h-10 w-10 text-primary flex-shrink-0 p-1" />
                  )}
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <p className="text-xs font-medium break-all whitespace-normal leading-snug">{att.file_name}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{att.file_type} · {(att.file_size / 1024).toFixed(1)} KB</p>
                  </div>
                  <a href={att.url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Open">
                      <Paperclip className="h-4 w-4 text-primary" />
                    </Button>
                  </a>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-md text-center bg-background/95 backdrop-blur">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-12 w-12 text-green-500" />
          </div>
          <DialogHeader>
            <DialogTitle className="text-xl text-center">Feedback Submitted!</DialogTitle>
            <DialogDescription className="text-center">
              Thank you for your feedback. Our team will review it and consider it for the next version.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <Button className="w-full" onClick={() => setShowSuccessModal(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
