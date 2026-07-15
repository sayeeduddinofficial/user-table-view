import { Bell } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useSystemSettings } from '@/hooks/useSystemSettings';

export const NotificationsSection = () => {
  const { settings, isLoading, updateSetting, isUpdating } = useSystemSettings();

  if (isLoading) {
    return (
      <section className="glass-panel rounded-xl p-6">
        <Skeleton className="h-20 w-full mb-4" />
        <Skeleton className="h-16 w-full mb-4" />
        <Skeleton className="h-16 w-full" />
      </section>
    );
  }

  const handleToggle = (key: 'email_notifications' | 'failure_alerts', enabled: boolean) => {
    updateSetting({
      key,
      value: { enabled }
    });
  };

  return (
    <section className="glass-panel rounded-xl p-6 hover:border-primary/30 transition-colors">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-success/10">
          <Bell className="h-5 w-5 text-success" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Notifications</h2>
          <p className="text-sm text-muted-foreground">Configure alert preferences</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Email Notifications */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-foreground">Email Notifications</p>
            <p className="text-sm text-muted-foreground">
             {settings?.email_notifications?.enabled ?? true
        ? "Receive email on request completion"
        : "No emails will be sent"
      }
            </p>
          </div>
          <Switch
            checked={settings?.email_notifications?.enabled ?? true}
            onCheckedChange={(checked) => handleToggle('email_notifications', checked)}
            disabled={isUpdating}
          />
        </div>

        <Separator />

         <div className="flex items-center justify-between opacity-40 pointer-events-none select-none">
                  <div>
                    <p className="font-medium text-foreground">
                      Slack Integration
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Post updates to Slack channel
                    </p>
                  </div>
                  <Switch />
                </div>
                <Separator />

        {/* Failure Alerts */}
        <div className="flex items-center justify-between opacity-40 pointer-events-none select-none">
          <div>
            <p className="font-medium text-foreground">Failure Alerts</p>
            <p className="text-sm text-muted-foreground">
              Immediate notification on failures
            </p>
          </div>
          <Switch
            // checked={settings?.failure_alerts?.enabled ?? true}
            // onCheckedChange={(checked) => handleToggle('failure_alerts', checked)}
            // disabled={isUpdating}
          />
        </div>
      </div>
    </section>
  );
};
