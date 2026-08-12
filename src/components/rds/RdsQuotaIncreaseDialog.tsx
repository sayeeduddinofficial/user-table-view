import { useState, useEffect } from "react";
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

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;

    currentMaxRds: number;
    usedRds: number;

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
const MAX_RDS_QUOTA = 10;
export function RdsQuotaIncreaseDialog({
    open, onOpenChange, currentMaxRds, usedRds,
    requestedquota, setrequestedquota, reason, setreason,
    submitquota, quotaError, setQuotaError, touched, setTouched,
    isMAxREached, onSubmit,
}: Props) {
    // Use the new manager hook that handles both active managers and Super Admin fallback
    const { manager, superAdmins, hasActiveManager, loading: managerLoading, error: managerError } = useMyManager();
    const [selectedSuperAdmin, setSelectedSuperAdmin] = useState('');
    const [quotaTouched, setQuotaTouched] = useState(false);
    const [reasonTouched, setReasonTouched] = useState(false);
    const [submitTouched, setSubmitTouched] = useState(false);

    useEffect(() => {
        if (!open) {
            setQuotaTouched(false);
            setReasonTouched(false);
            setSubmitTouched(false);
        }
    }, [open]);

    const managerEmail = hasActiveManager && manager?.email
        ? manager.email
        : selectedSuperAdmin;

    const newLimitError = quotaTouched
        ? requestedquota === 0
            ? "New limit is required"
            : quotaError
        : "";
    const reasonError = reasonTouched
        ? !reason.trim()
            ? "Reason is required"
            : submitTouched && reason.trim().length < 10
            ? "Reason must be at least 10 characters"
            : ""
        : submitTouched && reason.trim().length < 10
        ? "Reason must be at least 10 characters"
        : "";
    const managerError2 = submitTouched && !managerLoading && !managerEmail.trim() ? "Please select an approver" : "";

    const resetForm = () => {
        setrequestedquota(0);
        setreason("");
        setQuotaError("");
        setTouched(false);
        setSelectedSuperAdmin("");
        setQuotaTouched(false);
        setReasonTouched(false);
        setSubmitTouched(false);
    };
    return (
        <Dialog
            open={open}
            onOpenChange={(open) => {
                if (!open) {
                    resetForm();
                }
                onOpenChange(open);
            }}
        >
            <DialogContent 
                className="sm:max-w-md"
                onInteractOutside={(event) => event.preventDefault()}>
                <DialogHeader>
                    <DialogTitle>Request RDS Quota Increase</DialogTitle>
                    <DialogDescription>
                        Submit a request to increase your RDS quota. An admin will review and respond.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label className="text-muted-foreground text-xs">
                                Current Quota
                            </Label>

                            <p className="text-lg font-semibold">
                                {currentMaxRds} RDS Databases
                            </p>

                            <p className="text-xs text-muted-foreground">
                                {usedRds} RDS Database(s) in use
                            </p>

                            {isMAxREached && (
                                <p className="text-sm text-red-500 mt-1">
                                    {`Maximum RDS quota limit (${MAX_RDS_QUOTA}) already reached.`}
                                </p>
                            )}
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="requested-quota">New limit</Label>
                            <Input
                                id="requested-quota"
                                type="number"
                                min={currentMaxRds + 1}
                                max={MAX_RDS_QUOTA}
                                className={newLimitError ? "border-red-500" : ""}
                                value={requestedquota === 0 ? "" : requestedquota}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setQuotaTouched(true);
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
                                    if (currentMaxRds >= MAX_RDS_QUOTA) {
                                        setQuotaError(
                                            `Maximum RDS quota limit (${MAX_RDS_QUOTA}) already reached`
                                        );
                                        return;
                                    }

                                    if (numericValue <= currentMaxRds) {
                                        setQuotaError(
                                            `New limit must be greater than ${currentMaxRds}`
                                        );
                                        return;
                                    }

                                    if (numericValue > MAX_RDS_QUOTA) {
                                        setQuotaError(
                                            `Maximum allowed quota is ${MAX_RDS_QUOTA}`
                                        );
                                        return;
                                    }

                                    setQuotaError("");
                                }}
                            />
                            {newLimitError && <p className="text-sm text-red-500">{newLimitError}</p>}
                        </div>
                    </div>

                    <div className="space-y-1">
                        <Label htmlFor="reason">
                            Reason / Justification
                        </Label>
                        <Textarea
                            id="reason"
                            rows={3}
                            placeholder="Explain why you need additional RDS quota..."
                            value={reason}
                            onChange={(e) => {
                                setReasonTouched(true);
                                setreason(e.target.value);
                            }}
                        />
                        {reasonError && (
                            <p className="text-sm text-red-500">
                                {reasonError}
                            </p>
                        )}
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
                    {managerError2 && (
                        <p className="text-sm text-red-500">{managerError2}</p>
                    )}
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => {
                            resetForm();
                            onOpenChange(false);
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={() => {
                            setTouched(true);
                            setQuotaTouched(true);
                            setReasonTouched(true);
                            setSubmitTouched(true);
                            if (requestedquota === 0 || quotaError) return;
                            if (requestedquota <= currentMaxRds) return;
                            if (requestedquota > MAX_RDS_QUOTA) return;
                            if (!reason.trim() || reason.trim().length < 10) return;
                            if (!managerEmail.trim()) return;
                            onSubmit(managerEmail);
                        }}
                        disabled={isMAxREached || submitquota}
                    >
                        {submitquota ? "Submitting..." : "Submit Request"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
