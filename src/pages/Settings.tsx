import { Header } from "@/components/layout/Header";
import { SSHKeyManagement } from "@/components/settings/SSHKeyManagement";
import { NotificationsSection } from "@/components/settings/NotificationsSection";
import { SecuritySection } from "@/components/settings/SecuritySection";
import { UserProfileSection } from "@/components/settings/userprofileSection";
import { AwsConfigSection } from "@/components/settings/awsconfigSection";
import { TerraformBackendSection } from "@/components/settings/terraformbackendSection";
import { useAuth } from "@/hooks/useLogin";
import { useAppStore } from "@/store/appStore";
import { isAdminUser, isSuperAdmin } from "@/utils/roles";

export default function Settings() {
  const { user } = useAuth();
  const { setCurrentUser } = useAppStore();
  const isAdmin = isAdminUser(user?.role);
  const isSuperAdminUser = isSuperAdmin(user?.role);
  const canView = isAdmin || isSuperAdminUser;

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("token");
    sessionStorage.clear();
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen">
      <Header
        title="Settings"
        subtitle="Configure your automation environment"
      />

      <div className="p-6 space-y-8">
        {/* User Profile */}
        {user && <UserProfileSection user={user} onLogout={handleLogout} />}

        {/* SSH Key Management */}
        <SSHKeyManagement />

        {/* AWS + Terraform — visible to admin & super admin */}
        {canView && (
          <div className="grid grid-cols-1 md:grid-cols-[repeat(auto-fit,minmax(0,1fr))] gap-6">
            <AwsConfigSection canEdit={isSuperAdminUser} />
            <TerraformBackendSection
              canView={canView}
              canEdit={isSuperAdminUser}
            />
          </div>
        )}

        {/* Notifications + Security — super admin only */}
        {isSuperAdminUser && (
          <div className="grid grid-cols-1 md:grid-cols-[repeat(auto-fit,minmax(0,1fr))] gap-6">
            <NotificationsSection />
            <SecuritySection />
          </div>
        )}
      </div>
    </div>
  );
}
