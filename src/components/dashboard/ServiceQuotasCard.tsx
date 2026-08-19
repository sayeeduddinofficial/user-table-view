import type { ServiceQuota } from "./dashboardApi";
import { getBarPercentage, getServiceColor, getServiceIcon } from "./dashboardUtils";

interface ServiceQuotasCardProps {
  quotas: ServiceQuota[];
  isLoading?: boolean;
}

const TITLE = "Resources by Service";

function ServiceQuotasShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="glass-panel rounded-xl p-6">
      <h3 className="text-sm font-medium mb-4">{TITLE}</h3>
      {children}
    </div>
  );
}

export function ServiceQuotasCard({ quotas, isLoading = false }: ServiceQuotasCardProps) {
  if (isLoading) {
    return (
      <ServiceQuotasShell>
        <div className="space-y-3 animate-pulse">
          {Array.from({ length: 7 }).map((_, index) => (
            <div key={index} className="h-10 rounded bg-muted" />
          ))}
        </div>
      </ServiceQuotasShell>
    );
  }

  if (!quotas?.length) {
    return (
      <ServiceQuotasShell>
        <p className="text-xs text-muted-foreground">No quota data available.</p>
      </ServiceQuotasShell>
    );
  }

  const maxCount = Math.max(...quotas.map((quota) => quota.current ?? 0), 1);

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="border-b border-border px-6 py-3">
        <h2 className="text-lg font-semibold">{TITLE}</h2>
      </div>

      <div className="divide-y divide-border">
        {quotas.map((quota) => {
          const current = quota.current ?? 0;
          const label = quota.label || quota.service;
          const ServiceIcon = getServiceIcon(quota.service);
          const color = getServiceColor(label, quota.service);

          return (
            <div key={quota.service} className="flex items-center gap-4 px-6 py-2">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${color}20` }}
              >
                <ServiceIcon size={20} className="text-slate-500 dark:text-slate-300" />
              </div>

              <div className="flex flex-1 items-center gap-4">
                <span className="w-20 shrink-0 text-sm font-medium">{label}</span>

                <div className="flex-1">
                  <div className="relative h-4 w-full overflow-hidden rounded-full bg-muted/70">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary/80 to-primary transition-all duration-500"
                      style={{ width: `${getBarPercentage(current, maxCount)}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="w-8 text-right text-lg font-semibold">{current}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
