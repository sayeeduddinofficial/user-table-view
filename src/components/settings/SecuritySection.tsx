import { Shield } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useSystemSettings } from '@/hooks/useSystemSettings';

export const SecuritySection = () => {
  const { settings, isLoading, updateSetting, isUpdating } = useSystemSettings();

  if (isLoading) {
    return (
      <section className="glass-panel rounded-xl p-6">
        <Skeleton className="h-20 w-full mb-4" />
        <Skeleton className="h-16 w-full" />
      </section>
    );
  }

  const handleAuditToggle = (enabled: boolean) => {
    updateSetting({
      key: 'audit_logging',
      value: { enabled }
    });
  };

  return (
    <section className="glass-panel rounded-xl p-6 hover:border-primary/30 transition-colors">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-destructive/10">
          <Shield className="h-5 w-5 text-destructive" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Security</h2>
          <p className="text-sm text-muted-foreground">
            Access and authentication settings
          </p>
        </div>
      </div>

      <div className="space-y-4">

        <div className="flex items-center justify-between opacity-40 pointer-events-none select-none">
                  <div>
                    <p className="font-medium text-foreground">
                      Two-Factor Authentication
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Require 2FA for all users
                    </p>
                  </div>
                  <Switch  />
                </div>
                <Separator />
        <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Audit Logging</p>
                    <p className="text-sm text-muted-foreground">
                      {settings?.audit_logging?.enabled ?? true
        ? "Log all user actions"
        : "Only critical actions are logged"
      }
                    </p>
                  </div>
                  <Switch 
                   id="audit-logging"
            checked={settings?.audit_logging?.enabled ?? true}
            onCheckedChange={handleAuditToggle}
            disabled={isUpdating} />
                </div>
      </div>
    </section>
  );
};
