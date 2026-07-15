import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useLogin";

export function usePostLoginRedirect() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading || !user) return;

    const roles: string[] = user.roles || [];

    if (roles.includes("SplunkOps.Admin")) {
      navigate("/", { replace: true });
    } else {
      navigate("/my-vms", { replace: true });
    }
  }, [user, loading]);
}
