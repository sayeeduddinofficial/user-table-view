import { DASHBOARD_ROLE_CONFIG } from '@/types';
import { useRoleCounts } from '@/hooks/useDashboard';

export function RoleDistribution() {
  const { data: roleCounts, isLoading, error } = useRoleCounts();

  if (isLoading) {
    return (
      <div className="glass-panel rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-6">
          Active VMs by Role
        </h2>
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-panel rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-6">
          Active VMs by Role
        </h2>
        <p className="text-red-500">Failed to load role data</p>
      </div>
    );
  }

  const roleStats = DASHBOARD_ROLE_CONFIG.map((role) => ({
    ...role,
    count: roleCounts?.[role.shortName] || 0,
  }));

  const maxCount = Math.max(...roleStats.map((r) => r.count), 1);

  return (
    <div className="glass-panel rounded-xl p-6">
      <h2 className="text-lg font-semibold text-foreground mb-6">
        Active VMs by Role
      </h2>

      <div className="space-y-4">
        {roleStats.map((role) => (
          <div key={role.shortName} className="flex items-center gap-4">
            <div className="flex items-center gap-2 w-36">
              <span className="text-lg">{role.icon}</span>
              <span className="text-sm font-medium text-foreground">
                {role.shortName}
              </span>
            </div>

            <div className="flex-1 h-8 bg-muted rounded-lg overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary/80 to-primary rounded-lg transition-all duration-500 flex items-center justify-end pr-2"
                style={{
                  width: `${Math.max((role.count / maxCount) * 100, 5)}%`,
                }}
              >
                <span className="text-xs font-medium text-primary-foreground">
                  {role.count}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}