import { Card, CardContent } from "@/components/ui/card";
import { Database } from "lucide-react";
import { getUniqueAwsServices } from "./auditUtils";

interface AuditServiceFilterProps {
  selectedServices: string[];
  onChange: (services: string[]) => void;
}

export function AuditServiceFilter({ selectedServices, onChange }: AuditServiceFilterProps) {
  const toggleService = (serviceKey: string, relatedServices: string[] = []) => {
    const group = [serviceKey, ...relatedServices];
    const allSelected = group.every((service) => selectedServices.includes(service));

    if (allSelected) {
      onChange(selectedServices.filter((service) => !group.includes(service)));
      return;
    }

    onChange([
      ...selectedServices,
      ...group.filter((service) => !selectedServices.includes(service)),
    ]);
  };

  return (
    <Card className="glass-panel rounded-xl">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-sm font-bold mb-3">
          <Database className="h-4 w-4" />
          AWS Services
        </div>
        <div className="flex flex-wrap gap-2">
          {getUniqueAwsServices().map(([serviceKey, config]) => {
            const group = [serviceKey, ...(config.relatedServices ?? [])];
            const isSelected = group.some((service) => selectedServices.includes(service));

            return (
              <button
                key={serviceKey}
                type="button"
                onClick={() => toggleService(serviceKey, config.relatedServices)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  isSelected
                    ? `${config.bgSelected} ${config.color}`
                    : "text-muted-foreground bg-transparent border border-border hover:border-muted-foreground/50"
                }`}
              >
                <config.icon className={`h-3 w-3 ${config.color}`} />
                {config.shortName}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}