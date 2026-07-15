import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Clock, ClipboardList } from "lucide-react";

export const RequestManagementChart = ({ data }) => {
  const calculatePercentages = (pending, approved, rejected) => {
    const total = pending + approved + rejected;
    if (total === 0) return { pending: 0, approved: 0, rejected: 0 };
    
    // Calculate exact percentages
    const pendingPercent = (pending / total) * 100;
    const approvedPercent = (approved / total) * 100;
    const rejectedPercent = (rejected / total) * 100;
    
    // Round to integers
    let pendingRounded = Math.round(pendingPercent);
    let approvedRounded = Math.round(approvedPercent);
    let rejectedRounded = Math.round(rejectedPercent);
    
    // Adjust to ensure sum is exactly 100%
    const sum = pendingRounded + approvedRounded + rejectedRounded;
    const diff = 100 - sum;
    
    if (diff !== 0) {
      // Find the value with largest rounding error and adjust it
      const errors = [
        { type: 'pending', error: Math.abs(pendingPercent - pendingRounded), value: pending },
        { type: 'approved', error: Math.abs(approvedPercent - approvedRounded), value: approved },
        { type: 'rejected', error: Math.abs(rejectedPercent - rejectedRounded), value: rejected }
      ];
      
      // Sort by error (largest first), then by value (largest first)
      errors.sort((a, b) => b.error - a.error || b.value - a.value);
      
      // Adjust the one with largest error
      if (errors[0].type === 'pending') pendingRounded += diff;
      else if (errors[0].type === 'approved') approvedRounded += diff;
      else rejectedRounded += diff;
    }
    
    return {
      pending: pendingRounded,
      approved: approvedRounded,
      rejected: rejectedRounded
    };
  };

  const quotaTotal = data.quotaRequests.pending + data.quotaRequests.approved + data.quotaRequests.rejected;
  const runtimeTotal = data.runtimeExtensions.pending + data.runtimeExtensions.approved + data.runtimeExtensions.rejected;
  
  const quotaPercentages = calculatePercentages(
    data.quotaRequests.pending,
    data.quotaRequests.approved,
    data.quotaRequests.rejected
  );
  
  const runtimePercentages = calculatePercentages(
    data.runtimeExtensions.pending,
    data.runtimeExtensions.approved,
    data.runtimeExtensions.rejected
  );

  return (
    <Card className="glass-panel rounded-xl">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-muted-foreground" />
          <CardTitle className="text-base font-semibold">Request management</CardTitle>
        </div>
        <p className="text-xs text-muted-foreground">Quota & runtime-extension workflow</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="text-primary w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-sm font-medium">Quota requests</span>
            </div>
            <span><span className="text-xs text-muted-foreground">Total: </span><span className="text-xs font-semibold">{quotaTotal}</span></span>
          </div>
          <div className="flex h-7 rounded-lg overflow-hidden">
            {data.quotaRequests.pending > 0 && (
              <div
                className="bg-amber-500 flex items-center justify-center text-xs text-white font-medium"
                style={{ width: `${quotaPercentages.pending}%` }}
              >
                {quotaPercentages.pending}%
              </div>
            )}
            {data.quotaRequests.approved > 0 && (
              <div
                className="bg-emerald-500 flex items-center justify-center text-xs text-white font-medium"
                style={{ width: `${quotaPercentages.approved}%` }}
              >
                {quotaPercentages.approved}%
              </div>
            )}
            {data.quotaRequests.rejected > 0 && (
              <div
                className="bg-red-500 flex items-center justify-center text-xs text-white font-medium"
                style={{ width: `${quotaPercentages.rejected}%` }}
              >
                {quotaPercentages.rejected}%
              </div>
            )}
          </div>
          <div className="flex gap-4 mt-2 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-amber-500" />
              <span className="text-muted-foreground">Pending: {data.quotaRequests.pending}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-emerald-500" />
              <span className="text-muted-foreground">Approved: {data.quotaRequests.approved}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-red-500" />
              <span className="text-muted-foreground">Rejected: {data.quotaRequests.rejected}</span>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Clock className="text-primary w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-sm font-medium">Runtime extensions</span>
            </div>
            <span><span className="text-xs text-muted-foreground">Total: </span><span className="text-xs font-semibold">{runtimeTotal}</span></span>
          </div>
          <div className="flex h-7 rounded-lg overflow-hidden">
            {data.runtimeExtensions.pending > 0 && (
              <div
                className="bg-amber-500 flex items-center justify-center text-xs text-white font-medium"
                style={{ width: `${runtimePercentages.pending}%` }}
              >
                {runtimePercentages.pending}%
              </div>
            )}
            {data.runtimeExtensions.approved > 0 && (
              <div
                className="bg-emerald-500 flex items-center justify-center text-xs text-white font-medium"
                style={{ width: `${runtimePercentages.approved}%` }}
              >
                {runtimePercentages.approved}%
              </div>
            )}
            {data.runtimeExtensions.rejected > 0 && (
              <div
                className="bg-red-500 flex items-center justify-center text-xs text-white font-medium"
                style={{ width: `${runtimePercentages.rejected}%` }}
              >
                {runtimePercentages.rejected}%
              </div>
            )}
          </div>
          <div className="flex gap-4 mt-2 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-amber-500" />
              <span className="text-muted-foreground">Pending: {data.runtimeExtensions.pending}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-emerald-500" />
              <span className="text-muted-foreground">Approved: {data.runtimeExtensions.approved}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-red-500" />
              <span className="text-muted-foreground">Rejected: {data.runtimeExtensions.rejected}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
