import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useLogin";
import {Tooltip,TooltipContent,TooltipProvider,TooltipTrigger} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog,DialogContent,DialogDescription,  DialogFooter, DialogHeader,  DialogTitle,DialogTrigger,} from "@/components/ui/dialog";
import { Table,TableBody, TableCell,TableHead,  TableHeader,  TableRow,} from "@/components/ui/table";
import { Key,Plus,Download,Trash2,Loader2,Calendar,AlertTriangle,} from "lucide-react";

import { format, isBefore, addDays } from "date-fns";
import { MAX_ALLOWED_SSH_KEYS } from "@/constants";
import { useAwsConfig } from "@/hooks/useAwsConfig";
import { useDialog } from "../ui/dialog-context";
import { ApiError } from "@/lib/api";
import {
  fetchMySSHKeysApi,
  createSSHKeyApi,
  fetchPrivateKeyApi,
  deleteSSHKeyApi,
} from "@/services/sshKeyApi";
import type { SSHKey, ValidationDetail } from "@/services/sshKeyApi";

const SSH_KEY_NAME_REGEX = /^[a-zA-Z0-9_-]+$/;

export function SSHKeyManagement() {
  const { confirm, alert } = useDialog();
  const { user } = useAuth();
  const [keys, setKeys] = useState<SSHKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [keyName, setKeyName] = useState("");
  const [expirationDays, setExpirationDays] = useState(30);
  const [expirationError, setExpirationError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const { data: awsConfig } = useAwsConfig();
  const isAwsConnected = awsConfig?.status === "CONNECTED";

  const displayedNameError = (() => {
    const raw = fieldErrors.name || "";
    if (!raw) return "";
    if (/(already exists|exists|duplicate)/i.test(raw) && keyName) {
      return `SSH key pair "${keyName}" already exists.`;
    }
    return raw;
  })();

  if (!user) return null;

  useEffect(() => {
    fetchKeys();
  }, [isAwsConnected]);

  useEffect(() => {
    if (!isDialogOpen) {
      setFieldErrors({});
      setExpirationError("");
      setExpirationDays(30);
    }
  }, [isDialogOpen]);

  const validateKeyName = (name: string): boolean => {
    if (!name.trim()) {
      setFieldErrors((prev) => ({ ...prev, name: "Key name is required" }));
      return false;
    }

    if (name.includes(" ")) {
      setFieldErrors((prev) => ({ ...prev, name: "Spaces are not allowed" }));
      return false;
    }

    if (!SSH_KEY_NAME_REGEX.test(name)) {
      setFieldErrors((prev) => ({ ...prev, name: "Only letters, numbers, hyphens (-) and underscores (_) are allowed" }));
      return false;
    }

    setFieldErrors((prev) => ({ ...prev, name: "" }));
    return true;
  };

  const validateExpiration = (value: string): boolean => {
    if (!/^\d+$/.test(value)) {
      setExpirationError("Enter between 30 to 90 days");
      return false;
    }
    const num = Number(value);
    if (num < 30 || num > 90) {
      setExpirationError("Enter between 30 to 90 days");
      return false;
    }
    setExpirationError("");
    return true;
  };

  const fetchKeys = async () => {
    if (!user) return;
    try {
      const data = await fetchMySSHKeysApi();
      setKeys(data);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Failed to load SSH keys";
      alert({ title: message, severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  const generateKeyPair = async () => {
    if (!validateKeyName(keyName)) return;
    if (!validateExpiration(String(expirationDays))) return;

    setGenerating(true);
    try {
      await createSSHKeyApi({ name: keyName.trim(), expirationDays });
      alert({ title: "SSH key pair generated successfully", severity: "success" });
      setIsDialogOpen(false);
      setKeyName("");
      setExpirationDays(30);
      fetchKeys();
    } catch (error) {
      if (error instanceof ApiError) {
        const details = error.details as { validation?: ValidationDetail[] } | undefined;
        if (details?.validation) {
          const fe: Record<string, string> = {};
          details.validation.forEach((v) => { if (v.field) fe[v.field] = v.message; });
          setFieldErrors(fe);
        } else if (/(already exists|duplicate)/i.test(error.message)) {
          setFieldErrors({ name: error.message });
        } else {
          alert({ title: error.message, severity: "error" });
        }
      } else {
        alert({ title: "Failed to generate SSH key", severity: "error" });
      }
    } finally {
      setGenerating(false);
    }
  };

  const downloadPublicKey = (key: SSHKey) => {
    const blob = new Blob([key.public_key], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${key.name}.pub`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    alert({ title: "Public key downloaded", severity: "success" });
  };

  const downloadPrivate = async (keyId: string) => {
    try {
      const data = await fetchPrivateKeyApi(keyId);
      const blob = new Blob([data.private_key], { type: "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${data.name || "id_rsa"}.pem`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      alert({ title: "Private key downloaded", severity: "success" });
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Failed to download private key";
      alert({ title: message, severity: "error" });
    }
  };

  const deleteKey = async (keyId: string) => {
    const confirmed = await confirm({
      title: "Are you sure you want to delete this ssh-key? This action cannot be undone.",
      icon: "destroy",
    });
    if (!confirmed) return;

    try {
      await deleteSSHKeyApi(keyId);
      alert({ title: "SSH key deleted", severity: "success" });
      fetchKeys();
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Failed to delete SSH key";
      alert({ title: message, severity: "error" });
    }
  };

  const isExpired = (expiresAt: string) => isBefore(new Date(expiresAt), new Date());
  const isExpiringSoon = (expiresAt: string) => {
    const expiry = new Date(expiresAt);
    return !isExpired(expiresAt) && isBefore(expiry, addDays(new Date(), 7));
  };

  const tooltipMessage = !isAwsConnected
    ? "AWS Disconnected"
    : keys.length >= MAX_ALLOWED_SSH_KEYS
    ? `Maximum of ${MAX_ALLOWED_SSH_KEYS} SSH keys allowed`
    : "";

  const isDisabled = keys.length >= MAX_ALLOWED_SSH_KEYS || !isAwsConnected;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <section className="glass-panel rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Key className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">SSH Key Management</h2>
            <p className="text-sm text-muted-foreground">Generate and manage SSH key pairs for VM access</p>
          </div>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <DialogTrigger asChild>
                    <Button disabled={!isAwsConnected || isDisabled}>
                      <Plus className="h-4 w-4 mr-2" />
                      Generate Key Pair
                    </Button>
                  </DialogTrigger>
                </span>
              </TooltipTrigger>

              {isDisabled && (
                <TooltipContent>
                  <p>{tooltipMessage}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate SSH Key Pair</DialogTitle>
              <DialogDescription>Create a new SSH key pair for VM provisioning.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Key Name</Label>
                <Input
                  value={keyName}
                  onChange={(e) => {
                    const value = e.target.value;
                    setKeyName(value);
                    setFieldErrors((p) => ({ ...p, name: "" }));
                    if (value) validateKeyName(value);
                  }}
                  placeholder="my-ssh-key"
                />
                {displayedNameError && <p className="text-sm text-destructive">{displayedNameError}</p>}
              </div>

              <div className="space-y-2">
                <Label>Expiration (days)</Label>
                <Input
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={expirationDays}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (!/^\d{0,2}$/.test(value)) return;
                    setExpirationDays(Number(value));
                    validateExpiration(value);
                  }}
                />
                {expirationError ? (
                  <p className="text-sm text-destructive">{expirationError}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Key will expire on {format(addDays(new Date(), expirationDays), "PPP")}
                  </p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button onClick={generateKeyPair} disabled={generating || !!expirationError}>
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {keys.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No SSH keys generated yet</p>
          <p className="text-sm mt-1">Generate a key pair to use for VM provisioning</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Name</TableHead>
                <TableHead>Fingerprint</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {keys.map((key) => (
                <TableRow key={key.id}>
                  <TableCell className="font-medium">{key.name}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {key.fingerprint?.slice(0, 20)}...
                  </TableCell>
                  <TableCell>{format(new Date(key.created_at), "PP")}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(key.expires_at), "PP")}
                    </div>
                  </TableCell>
                  <TableCell>
                    {isExpired(key.expires_at) ? (
                      <Badge variant="destructive">Expired</Badge>
                    ) : isExpiringSoon(key.expires_at) ? (
                      <Badge variant="outline" className="border-warning text-warning">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Expiring Soon
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-success text-success">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <TooltipProvider>
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => downloadPublicKey(key)} tooltip="Download Public Key">
                          <Download className="h-4 w-4" />
                          <span className="ml-1 text-xs">.pub</span>
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => downloadPrivate(key.id)} tooltip="Download Private Key">
                          <Download className="h-4 w-4" />
                          <span className="ml-1 text-xs">key</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={!isAwsConnected}
                          onClick={() => deleteKey(key.id)}
                          className={!isAwsConnected ? "text-muted-foreground/30 cursor-not-allowed" : "text-muted-foreground hover:text-destructive"}
                          tooltip={isAwsConnected ? "Delete Key" : "AWS Disconnected"}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TooltipProvider>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}
