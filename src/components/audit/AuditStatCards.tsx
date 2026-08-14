import { Card, CardContent } from "@/components/ui/card";
import { CATEGORY_STAT_CONFIG } from "./auditConstants";

interface AuditStatCardsProps {
  categoryCounts: Record<string, number>;
}

export function AuditStatCards({ categoryCounts }: AuditStatCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-5">
      {CATEGORY_STAT_CONFIG.map(({ key, label, icon: Icon, color, bg }) => (
        <Card
          key={key}
          className="glass-panel rounded-xl p-6 hover:border-primary/30 transition-colors"
        >
          <CardContent className="px-0 py-0">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${bg}`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {categoryCounts[key] ?? 0}
                </p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}