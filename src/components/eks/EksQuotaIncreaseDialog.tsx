import { useState } from "react";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMyManager } from "@/hooks/useMyManager";
import { ManagerDisplay } from "@/components/common/ManagerDisplay";
// import {
//   Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
// } from "@/components/ui/select";
// import { ManagerOption } from "@/utils/myVMs.utils";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;

    currentMaxEksClusters: number;
    usedEksClusters: number;

    requestedquota: number;
    setrequestedquota: (v: number) => void;

    reason: string;
    setreason: (v: string) => void;

    submitquota: boolean;
    quotaError: string;
    setQuotaError: (v: string) => void;

    touched: boolean;
    setTouched: (v: boolean) => void;

    isMAxREached: boolean;

    onSubmit: (approverEmail: string) => void;
}

export function EksQuotaIncreaseDialog({
    open, onOpenChange, currentMaxEksClusters, usedEksClusters,
    requestedquota, setrequestedquota, reason, setreason,
    submitquota, quotaError, setQuotaError, touched, setTouched,
    isMAxREached, onSubmit,
}: Props) {
    // Use the new manager hook that handles both active managers and Super Admin fallback
    const { manager, superAdmins, hasActiveManager, loading: managerLoading, error: managerError } = useMyManager();
    const [selectedSuperAdmin, setSelectedSuperAdmin] = useState('');

    // Determine which email to use for submission
    const managerEmail = hasActiveManager && manager?.email
        ? manager.email
        : selectedSuperAdmin;

    // Submit is blocked if manager hasn't resolved yet or no email selected
    const canSubmit = !isMAxREached && !submitquota && !managerLoading && !!managerEmail.trim();
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Request EKS Cluster Quota Increase</DialogTitle>
                    <DialogDescription>
                        Submit a request to increase your EKS cluster quota. An admin will review and respond.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label className="text-muted-foreground text-xs">Current Quota</Label>
                            <p className="text-lg font-semibold">
                                {currentMaxEksClusters} EKS Clusters
                            </p>

                            <p className="text-xs text-muted-foreground">
                                {usedEksClusters} Cluster(s) in use
                            </p>
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="requested-quota">New limit</Label>
                            <Input
                                id="requested-quota"
                                type="number"
                                className={quotaError ? "border-red-500" : ""}
                                min="0"
                                max="50"
                                value={requestedquota === 0 ? "" : requestedquota}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setTouched(true);
                                    if (value === "") {
                                        setrequestedquota(0);
                                        setQuotaError("");
                                        return;
                                    }
                                    let numericValue = Number(value);
                                    if (value.length > 1 && value.startsWith("0")) {
                                        numericValue = Number(value.replace(/^0+/, ""));
                                    }
                                    setrequestedquota(numericValue);
                                    if (currentMaxEksClusters >= 50) {
                                        setQuotaError("Maximum EKS quota limit (50) already reached");
                                        return;
                                    }
                                    setQuotaError(numericValue <= currentMaxEksClusters ? `New limit must be greater than ${currentMaxEksClusters}` : "");
                                }}
                            />
                            {touched && quotaError && <p className="text-sm text-red-500">{quotaError}</p>}
                        </div>
                    </div>

                    <div className="space-y-1">
                        <Label htmlFor="reason">
                            Reason / Justification <span className="text-destructive">*</span>
                        </Label>
                        <Textarea
                            id="reason"
                            rows={3}
                            placeholder="Explain why you need additional EKS cluster quota..."
                            value={reason}
                            onChange={(e) => setreason(e.target.value)}
                        />
                    </div>

                    <ManagerDisplay
                        manager={manager}
                        superAdmins={superAdmins || []}
                        hasActiveManager={hasActiveManager}
                        loading={managerLoading}
                        error={managerError}
                        selectedEmail={selectedSuperAdmin}
                        onEmailChange={setSelectedSuperAdmin}
                        label="Manager (Approver)"
                    />
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button
                        onClick={() => onSubmit(managerEmail)}
                        disabled={!canSubmit}
                    >
                        {submitquota ? "Submitting..." : "Submit Request"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
