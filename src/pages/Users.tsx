import { Header } from '@/components/layout/Header';
import { UserManagement } from '@/components/users/UserManagement';
import { useAuth } from "@/hooks/useLogin";
import { useNavigate } from "react-router-dom";
import { useEffect } from 'react';
import { isAdmin } from "@/utils/roles";

export default function Users() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !isAdmin(user.role)) {
      navigate("/", { replace: true });
    }
  }, [user]);

  return (
    <div className="min-h-screen">
      <Header
        title="User Management"
        subtitle="Manage users, quotas, and instance type permissions"
      />

      <div className="p-6">
        <UserManagement />
      </div>
    </div>
  );
}
