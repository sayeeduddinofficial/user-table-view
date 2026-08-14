import { Header } from "@/components/layout/Header";
import { VMRequestForm } from "@/components/requests/VMRequestForm";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/store/appStore";
import { useEffect, useState } from "react";
import { useDialog } from "@/components/ui/dialog-context";
import { getClientIp } from "@/utils/getClientIP";
import { env } from "@/lib/env";

const API_BASE = env.vmRequest;
const API_AUTH = env.auth;

export default function NewRequest() {
  const { alert } = useDialog();
  const navigate = useNavigate();
  const { refreshCurrentUser } = useAppStore();
  const { setActiveRequest } = useAppStore.getState();
  const setCurrentUser = useAppStore((s) => s.setCurrentUser);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function getAccessToken() {
    return localStorage.getItem("token");
  }
  useEffect(() => {
    const loadUser = async () => {
      try {

        // Get MSAL token
        const token = await getAccessToken();

        // Fetch user data with MSAL token to ensure categories are loaded
        const res = await fetch(`${API_AUTH}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          console.warn("Failed to fetch user data");
          setIsLoadingUser(false);
          return;
        }

        const response = await res.json();

        const user = response?.data?.user;

        if (!user) {
          console.error("User object missing in response");
          return;
        }

        setCurrentUser({
          ...user,
          allowedCategories: Array.isArray(user.allowedCategories)
            ? user.allowedCategories.map(Number)
            : [],
          allowedInstanceTypes: Array.isArray(user.allowedInstanceTypes)
            ? user.allowedInstanceTypes
            : [],
        });
      } catch (err) {
        console.error("Error loading user:", err);
      } finally {
        setIsLoadingUser(false);
      }
    };

    loadUser();
  }, []);

  // This function will be called when user clicks "Submit Request"
  const submitRequest = async (payload: any) => {
    if (isSubmitting) return;
    
    try {
      setIsSubmitting(true);
      const token = await getAccessToken();

      const response = await fetch(`${API_BASE}/api/provision`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          "x-client-ip": (await getClientIp()) || "",
        },
        body: JSON.stringify(payload),
      });
      //  parse ONCE
      const data = await response.json();

      // HTTP error → handle here
      if (!response.ok) {
        alert({
          title: data.message || "Failed to submit VM request",
          severity: "error",
        });
        return;
      }

      // Handle new sendSuccess format
      const responseData = data.status === "SUCCESS" ? data.data : data;
      const requestId = responseData.requestId;

      // success path
      // Instead of incrementing currentVMs locally, refresh user from backend
      await refreshCurrentUser();
      localStorage.setItem("vmChanged", Date.now().toString());
      alert({
        title: "Request submitted successfully",
        severity: "success",
      });
      
      // Set the active request and navigate to console
      setActiveRequest(requestId);
      navigate(`/console?request=${requestId}`);
    } catch (error: any) {
      // network / unexpected errors
      alert({
        title: error.message || "Something went wrong",
      });
      console.error("Provisioning error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingUser) {
    return (
      <div className="min-h-screen">
        <Header
          title="New VM Request"
          subtitle="Configure and submit a new Splunk VM provisioning request"
          showNewRequest={false}
        />
        <div className="p-6 text-center">
          <p>Loading user data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header
        title="New VM Request"
        subtitle="Configure and submit a new Splunk VM provisioning request"
        showNewRequest={false}
      />

      <div className="p-6">
        <VMRequestForm onSubmit={submitRequest} isSubmitting={isSubmitting} />
      </div>
    </div>
  );
}
