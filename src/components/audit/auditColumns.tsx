import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Column } from "@/components/common/DataTable";
import type { AuditLog } from "@/types/api";
import { ACTION_DISPLAY_LABELS, CATEGORY_DISPLAY_LABELS } from "@/types";
import { CATEGORY_BADGE_CONFIG } from "./auditConstants";
import { formatIpAddress, formatTimestamp } from "./auditUtils";

const DESCRIPTION_TOOLTIP_THRESHOLD = 48;
const JUSTIFICATION_TOOLTIP_THRESHOLD = 40;

function DetailsCell({ row }: { row: AuditLog }) {
  const details = (row.details ?? {}) as { description?: string; justification?: string };
  const description = details.description ?? "";
  const justification = details.justification ?? "";

  const tooltipText =
    [description, justification ? `Justification: ${justification}` : null]
      .filter(Boolean)
      .join("\n") || "—";

  const showTooltip =
    description.length > DESCRIPTION_TOOLTIP_THRESHOLD ||
    justification.length > JUSTIFICATION_TOOLTIP_THRESHOLD;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="max-w-[350px] text-muted-foreground">
            <div className="truncate">{description}</div>
            {justification && <div className="truncate">Justification: {justification}</div>}
          </div>
        </TooltipTrigger>
        {showTooltip && (
          <TooltipContent
            side="top"
            className="max-w-[300px] whitespace-pre-wrap break-words text-sm leading-relaxed"
          >
            {tooltipText}
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}

function CategoryCell({ category }: { category: string }) {
  const config = CATEGORY_BADGE_CONFIG[category];
  const Icon = config?.icon;

  return (
    <span
      className={`inline-flex items-center whitespace-nowrap gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
        config?.className ?? "bg-muted text-muted-foreground border border-border"
      }`}
    >
      {Icon && <Icon className="h-3 w-3" />}
      {CATEGORY_DISPLAY_LABELS[category] ?? category}
    </span>
  );
}

export const auditLogColumns: Column<AuditLog>[] = [
  {
    key: "created_at",
    header: "Timestamp",
    render: (row) => (
      <span className="font-mono text-muted-foreground">{formatTimestamp(row.created_at)}</span>
    ),
  },
  {
    key: "user_name",
    header: "User",
    render: (row) => <span className="text-foreground">{row.user_name ?? "—"}</span>,
  },
  {
    key: "action",
    header: "Action",
    render: (row) => (
      <span className="text-foreground">{ACTION_DISPLAY_LABELS[row.action] ?? row.action}</span>
    ),
  },
  {
    key: "target",
    header: "Target",
    render: (row) => <span className="font-mono text-primary">{row.target ?? "—"}</span>,
  },
  {
    key: "details",
    header: "Details",
    className: "w-[400px]",
    render: (row) => <DetailsCell row={row} />,
  },
  {
    key: "category",
    header: "Category",
    render: (row) => <CategoryCell category={row.category} />,
  },
  {
    key: "ip_address",
    header: "IP Address",
    render: (row) => (
      <span className="font-mono text-muted-foreground">{formatIpAddress(row.ip_address)}</span>
    ),
  },
];