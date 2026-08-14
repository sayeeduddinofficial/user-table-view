import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpCircle, Globe, Layers, Network, RefreshCw, Search } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useDialog } from "@/components/ui/dialog-context";
import { Route53QuotaIncreaseDialog } from "@/components/route-53/Route53QuotaIncreaseDialog";
import {
  Route53QuotaIcon,
  Route53StatCard,
} from "@/components/route-53/route53Shared";
import {
  HOSTED_ZONES,
  MAX_ROUTE53_QUOTA,
} from "@/components/route-53/route53Constants";
import {
  countRecordsInZone,
  filterHostedZones,
  recordHasIPv4Value,
} from "@/components/route-53/route53Utils";
import { requestRoute53QuotaIncrease } from "@/services/route53Api";
import { useRoute53Overview } from "@/hooks/useRoute53";
import { useAppStore } from "@/store/appStore";

const TABLE_COLUMNS = [
  "Hosted Zone Name",
  "Type",
  "Created By",
  "Record Count",
  "Description",
  "Hosted Zone ID",
];

export default function Route53() {
  const { alert } = useDialog();
  const currentUser = useAppStore((s) => s.currentUser);
  const refreshCurrentUser = useAppStore(
    (s) => s.refreshCurrentUser
  );
  useEffect(() => {
    if (!currentUser) refreshCurrentUser();
  }, []);

  const { records, usedRecords, loading, refresh } = useRoute53Overview();

  const [search, setSearch] = useState("");
  const [showQuotaDialog, setShowQuotaDialog] = useState(false);
  const [requestedQuota, setRequestedQuota] = useState(0);
  const [reason, setReason] = useState("");
  const [submittingQuota, setSubmittingQuota] = useState(false);
  const [quotaError, setQuotaError] = useState("");
  const [touched, setTouched] = useState(false);

  // useEffect(() => {
  //   refreshCurrentUser();
  // }, [refreshCurrentUser]);

  const maxRecords = currentUser?.maxDnsRecords ?? 0;
  const remainingQuota = maxRecords - usedRecords;
  const hasReachedSystemLimit = maxRecords >= MAX_ROUTE53_QUOTA;

  const aliasRecordsCount = useMemo(
    () => records.filter((record) => record.is_alias).length,
    [records]
  );
  const ipRecordsCount = useMemo(
    () => records.filter(recordHasIPv4Value).length,
    [records]
  );
  const rows = useMemo(() => filterHostedZones(HOSTED_ZONES, search), [search]);

  const handleRefresh = async () => {
    await Promise.all([refresh(), refreshCurrentUser()]);
    alert({ title: "Refreshed", severity: "success" });
  };

  const resetQuotaForm = () => {
    setRequestedQuota(0);
    setReason("");
    setTouched(false);
    setQuotaError("");
  };

  const handleQuotaSubmit = async (approverEmail: string) => {
    try {
      setSubmittingQuota(true);
      await requestRoute53QuotaIncrease(currentUser?.id ?? "", {
        requestedQuota: requestedQuota - maxRecords,
        reason,
        approverEmail,
      });
      alert({
        title: "Route53 quota request submitted successfully",
        severity: "success",
      });
      setShowQuotaDialog(false);
      resetQuotaForm();
    } catch (error) {
      alert({
        title:
          error instanceof Error
            ? error.message
            : "Failed to submit Route53 quota request",
        severity: "error",
      });
    } finally {
      setSubmittingQuota(false);
    }
  };

  return (
    <div>
      <Header
        title="Hosted zones"
        subtitle="Automatic mode is the current search behavior optimized for best filter results."
        showSearch={false}
      />

      <div className="space-y-4 p-6">
        {/* Stats */}
        <div className="flex flex-wrap gap-3">
          <Route53StatCard
            icon={<Globe className="h-4 w-4 text-primary" />}
            iconBg="bg-primary/10"
            value={HOSTED_ZONES.length}
            label="Hosted Zones"
          />

          <Route53StatCard
            icon={<Network className="h-4 w-4 text-cyan-400" />}
            iconBg="bg-cyan-500/10"
            value={loading ? "-" : aliasRecordsCount}
            label="Alias Records"
          />

          <Route53StatCard
            icon={<Layers className="h-4 w-4 text-emerald-400" />}
            iconBg="bg-emerald-500/10"
            value={loading ? "-" : ipRecordsCount}
            label="IP Records"
          />

          <Route53StatCard
            icon={<Route53QuotaIcon />}
            iconBg="bg-pink-500/10"
            value={remainingQuota}
            label="Records Remaining"
            className="w-full max-w-full flex-auto sm:w-auto sm:max-w-[400px] min-w-[220px]"
            action={
              <Button
                variant="outline"
                size="sm"
                className="whitespace-nowrap border-primary bg-primary/10 text-xs text-primary hover:bg-primary hover:text-primary-foreground"
                onClick={() => setShowQuotaDialog(true)}
              >
                <ArrowUpCircle className="mr-1 h-3.5 w-3.5" />
                Request Increase
              </Button>
            }
          />
        </div>

        {/* Search & Actions */}
        <Card className="glass-panel sticky top-16 z-30 border-border/50 p-0 backdrop-blur">
          <CardContent className="px-0 py-0">
            <div className="flex items-center gap-3 p-4 px-6">
              <div className="relative flex-1">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  placeholder="Search by hosted zone name, type, or id..."
                  className="bg-background/50 pl-9"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>

              <Button
                variant="outline"
                size="icon"
                className="shrink-0 rounded-full"
                onClick={handleRefresh}
              >
                <RefreshCw size={14} />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <div className="overflow-hidden rounded-lg border border-border/50 bg-card/50 backdrop-blur">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] text-sm">
              <thead>
                <tr className="border-b border-border/50 text-xs uppercase tracking-wide text-muted-foreground">
                  {TABLE_COLUMNS.map((column) => (
                    <th
                      key={column}
                      className="whitespace-nowrap px-5 py-3 text-left font-medium"
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={TABLE_COLUMNS.length}
                      className="px-5 py-8 text-center text-muted-foreground"
                    >
                      No hosted zones found.
                    </td>
                  </tr>
                ) : (
                  rows.map((zone) => (
                    <tr
                      key={zone.id}
                      className="border-b border-border/40 transition-colors hover:bg-accent/20"
                    >
                      <td className="px-5 py-4">
                        <Link
                          to="/aws/hostedzonedetails"
                          className="font-medium text-primary hover:underline"
                        >
                          {zone.name}
                        </Link>
                      </td>
                      <td className="px-5 py-4">{zone.type}</td>
                      <td className="px-5 py-4">{zone.createdBy}</td>
                      <td className="px-5 py-4">
                        {loading ? "-" : countRecordsInZone(records, zone.name)}
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">
                        {zone.description}
                      </td>
                      <td className="px-5 py-4 font-mono text-muted-foreground">
                        {zone.id}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Route53QuotaIncreaseDialog
        open={showQuotaDialog}
        onOpenChange={setShowQuotaDialog}
        currentMaxRecords={maxRecords}
        usedRecords={usedRecords}
        requestedquota={requestedQuota}
        setrequestedquota={setRequestedQuota}
        reason={reason}
        setreason={setReason}
        submitquota={submittingQuota}
        quotaError={quotaError}
        setQuotaError={setQuotaError}
        touched={touched}
        setTouched={setTouched}
        isMAxREached={hasReachedSystemLimit}
        onSubmit={handleQuotaSubmit}
      />
    </div>
  );
}