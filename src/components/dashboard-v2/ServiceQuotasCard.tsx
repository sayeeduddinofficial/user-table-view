import {
  EC2Icon,
  RDSIcon,
  S3Icon,
  VPCIcon,
  LBIcon,
  Route53Icon,
  EKSIcon,
} from "@/components/icons/aws-icons";

const serviceIconMap = {
  ec2: EC2Icon,
  vpc: VPCIcon,
  lb: LBIcon,
  s3: S3Icon,
  rds: RDSIcon,
  route53: Route53Icon,
  eks: EKSIcon,
} as const;

function getServiceIcon(service: string) {
  const normalizedService = service?.toLowerCase();
  return (
    serviceIconMap[
      normalizedService as keyof typeof serviceIconMap
    ] ?? EC2Icon
  );
}

interface ServiceQuota {
  service: string;
  label: string;
  current: number;
  max: number;
  remaining: number;
  percentage: number;
}

interface Props {
  quotas: ServiceQuota[];
  isLoading?: boolean;
}

export function ServiceQuotasCard({
  quotas,
  isLoading = false,
}: Props) {
  if (isLoading) {
    return (
      <div className="glass-panel rounded-xl p-6">
        <h3 className="text-sm font-medium mb-4">
          Resources by Service
        </h3>

        <div className="space-y-3 animate-pulse">
          {[...Array(7)].map((_, i) => (
            <div
              key={i}
              className="h-10 rounded bg-muted"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!quotas?.length) {
    return (
      <div className="glass-panel rounded-xl p-6">
        <h3 className="text-sm font-medium mb-2">
          Resources by Service
        </h3>

        <p className="text-xs text-muted-foreground">
          No quota data available.
        </p>
      </div>
    );
  }

  const serviceColors: Record<string, string> = {
    EC2: "#3B82F6",
    VPC: "#8B5CF6",
    LB: "#F97316",
    "Load Balancers": "#F97316",
    S3: "#10B981",
    RDS: "#06B6D4",
    Route53: "#EC4899",
    "Route 53": "#EC4899",
    EKS: "#FACC15",
  };

  const maxCount = Math.max(
    ...quotas.map((q) => q.current ?? 0),
    1
  );

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="border-b border-border px-6 py-3">
        <h2 className="text-lg font-semibold">
          Resources by Service
        </h2>

      </div>

      {/* Rows */}
      <div className="divide-y divide-border">
        {quotas.map((quota) => {
          const current = quota.current ?? 0;

          const label = quota.label || quota.service;

          const ServiceIcon = getServiceIcon(quota.service);

          const color =
            serviceColors[label] ??
            serviceColors[quota.service] ??
            "#3B82F6";

          const percent = Math.max(
            (current / maxCount) * 100,
            2
          );

          return (
            <div
              key={quota.service}
              className="flex items-center gap-4 px-6 py-2"
            >
              {/* Icon */}
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                style={{
                  backgroundColor: `${color}20`,
                }}
              >
                <ServiceIcon
                  size={20}
                  className="dark:text-slate-300, text-slate-500"
                />
              </div>

              {/* Name + Progress */}
              <div className="flex flex-1 items-center gap-4">
                <span className="w-20 shrink-0 text-sm font-medium">
                  {label}
                </span>

                <div className="flex-1">
                  <div className="relative h-4 w-full overflow-hidden rounded-full bg-muted/70">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary/80 to-primary transition-all duration-500"
                      style={{
                        width: `${percent}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Count */}
              <div className="w-8 text-right text-lg font-semibold">
                {current}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}