import axios from "axios";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ApiErrorBoundary } from "@/components/ApiErrorBoundary";
import { MainLayout } from "@/components/layout/MainLayout";
import Index from "./pages/Index";
import Requests from "./pages/Requests";
import NewRequest from "./pages/NewRequest";
import Console from "./pages/Console";
import Users from "./pages/Users";
import Settings from "./pages/Settings";
import MyVMs from "./pages/MyVMs";
import S3 from "./pages/S3";
import Login from "./pages/Login";
import MicrosoftRedirect from "./pages/MicrosoftRedirect";
import NotFound from "./pages/NotFound";
import { Loader2, View } from "lucide-react";
import { AuthProvider, useAuth } from "@/hooks/useLogin";
import { useEffect } from "react";
import { useAppStore } from "./store/appStore";
import SignUp from "./pages/SignUp";
import ActivateInvitation from "./pages/ActivateInvitation";
import { isAdmin } from "./utils/roles";
import Feedback from "./pages/feedback";
import AdminFeedback from "./pages/AdminFeedback";
import QuotaRequests from "./pages/QuotaRequests";
import Profile from "./pages/Profile";
import { DialogProvider } from "@/components/ui/dialog-context";
import AuditLogs from "./pages/AuditLogs";
import LeadershipBilling from "./pages/LeadershipBilling";
import RuntimeGovernance from "./pages/RuntimeGovernance";
import RuntimeGovernanceAction from "./pages/RunTimeGovernanceAction";
import { ThemeProvider } from "./hooks/useTheme";
import QuotaRequestAction from "./pages/QuotaRequestAction";
import { env } from "@/lib/env";
import Vpcs from "./pages/Vpcs";
import { VpcDetails } from "./components/vpc/VpcDetails";
import { CreateVpc } from "./components/vpc/CreateVpc";
import { CreateFlowLog } from "./components/vpc/CreateFlowLog";
import { CreateEncryption } from "./components/vpc/CreateEncryption";
import Eks from "./pages/Eks";
import { EksDetails } from "./components/eks/EksDetails";
import { CreateEks } from "./components/eks/CreateEks";
import AwsLoadBalancers from "./pages/AwsLoadBalancers";
import CreateLoadBalancer from "./pages/CreateLoadBalancer";
import CreateSecurityGroup from "./pages/CreateSecurityGroup";
import LoadBalancerDetails from "@/components/load-balancers/LoadBalancerDetails";
import Providers from "./pages/providers";
import Route53 from "./pages/Route53";
import Rds from "./pages/Rds";
import CreateRds from "./pages/CreateRds";
import RdsDetailPage from "./pages/RdsDetail";
import HostedZoneDetails from "./components/route-53/HostedZoneDetails";
import CreateRecord from "./components/route-53/CreateRecord";
import RolesManagement from "./pages/RolesManagement";
import ViewRoles from "./components/roles/ViewRoles";

const API_AUTH_BASE = env.auth;
const queryClient = new QueryClient();
type AppProps = {
  msalEnabled?: boolean;
  redirectResult?: import("@azure/msal-browser").AuthenticationResult | null;
};
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, error } = useAuth();
  const { setCurrentUser } = useAppStore();
  useEffect(() => {
    const syncUser = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const res = await axios.get(`${API_AUTH_BASE}/api/auth/me`);
        if (res.data?.data?.user) setCurrentUser(res.data.data.user);
      } catch (err) {
        console.error("User sync failed");
      }
    };

    syncUser();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p>Loading authentication...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-red-600 mb-2">
            Authentication Error
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <a href="/login" className="text-blue-600 underline">
            Go back to login
          </a>
        </div>
      </div>
    );
  }

  if (!user) {
    
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  console.log("AdminRoute user:", user);
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (!user || !isAdmin(user.role)) {
    return <Navigate to="/my-vms" replace />;
  }

  return <>{children}</>;
}

// function SuperAdminRoute({ children }: { children: React.ReactNode }) {
//   const { user, loading } = useAuth();

//   console.log("user super admin", user.role);
//   if (loading) {
//     return (
//       <div className="min-h-screen flex items-center justify-center">
//         <Loader2 className="h-6 w-6 animate-spin" />
//       </div>
//     );
//   }

//   if (!user) return <Navigate to="/login" replace />;

//   if (user.role !== "SuperAdmin") {
//     return <Navigate to="/my-vms" replace />;
//   }

//   return <>{children}</>;
// }

function AppRoutes() {
  return (
    <Routes>
      {/* <Route path="/auth" element={<Auth />} /> */}
      <Route path="/login" element={<Login />} />
      <Route path="/microsoft/redirect" element={<MicrosoftRedirect />} />
      <Route path="/activate" element={<ActivateInvitation />} />
      {/* Public handler for email approve/reject links — no auth needed */}
      <Route path="/runtime-governance-action" element={<RuntimeGovernanceAction />} />
      <Route path="/quota-request-action" element={<QuotaRequestAction />} />
      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route
          path="/"
          element={
            <AdminRoute>
              <Index />
            </AdminRoute>
          }
        />
        <Route
          path="/leadership-billing"
          element={
            <AdminRoute>
              <LeadershipBilling />
            </AdminRoute>
          }
        />
        <Route
          path="/aws/load-balancers"
          element={
              <AwsLoadBalancers />
          }
        />
        <Route path="/aws/load-balancers/:lbId" element={<LoadBalancerDetails />} />
        <Route
          path="/aws/load-balancers/create/:kind"
          element={
              <CreateLoadBalancer />
          }
        />
        <Route path="/aws/rds" element={<Rds />} />
        <Route path="/aws/rds/create" element={<CreateRds />} />
        {/* <Route path="/aws/rds/:id" element={<RdsDetailPage />} /> */}
        <Route path="/aws/rds/:requestId" element={<RdsDetailPage />} />
        <Route path="/aws/rds/:requestId/instances/:instanceIdentifier" element={<RdsDetailPage />} />
        <Route path="/aws/rds/:id" element={<RdsDetailPage />} /> 



        <Route
          path="aws/security-groups/create"
          element={
              <CreateSecurityGroup />
          }
        />
        <Route path="/my-vms" element={<MyVMs />} />
        <Route
          path="/aws/s3"
          element={
              <S3 />
          }
        />
        <Route
          path="/aws/s3/create"
          element={
              <S3 />
          }
        />
        <Route
          path="/aws/s3/buckets/:bucketName"
          element={
              <S3 />
          }
        />
        <Route path="/aws/route53" element={<Route53 />} />
        <Route path="/aws/hostedzonedetails" element={<HostedZoneDetails />} />
        <Route path="/aws/createrecord" element={<CreateRecord />} />
        <Route path="/requests" element={<Requests />} />
        <Route path="/requests/new" element={<NewRequest />} />
        <Route path="/console" element={<Console />} />
        <Route
          path="/users"
          element={
            <AdminRoute>
              <Users />
            </AdminRoute>
          }
        />
        <Route
          path="/auditlogs"
          element={
            <AdminRoute>
              <AuditLogs />
            </AdminRoute>
          }
        />
        <Route path="/feedback" element={<Feedback />} />
        <Route
          path="/admin/feedback"
          element={
            <AdminRoute>
              <AdminFeedback />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/quota-requests"
          element={
            <AdminRoute>
              <QuotaRequests />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/runtime-governance"
          element={
            <AdminRoute>
              <RuntimeGovernance />
            </AdminRoute>
          }
        />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/aws/vpcs" element={<Vpcs />} />
        <Route path="/aws/vpcs/:vpcId" element={<VpcDetails />} />
        <Route path="/aws/vpcs/create" element={<CreateVpc />} />
        <Route path="/aws/vpcs/flowlog/create" element={<CreateFlowLog />} />
        <Route path="/aws/vpcs/encryption/create" element={<CreateEncryption />} />
        <Route path="/aws/eks" element={<Eks />} />
        <Route path="/aws/eks/:eksId" element={<EksDetails />} />
        <Route path="/aws/eks/create" element={<CreateEks />} />
        {/* <Route path="/rolesmanagement" element={<RolesManagement />} /> */}
        {/* <Route path="/roles/viewroles" element={<ViewRoles />} /> */}
      </Route>
      <Route path="*" element={<NotFound />} />
      <Route path="/Signup-access" element={<SignUp />} />
      <Route path="/profile" element={<Profile />} />
       <Route path="/providers" element={<Providers />} />
       
    </Routes>
    
  );
}

const App = ({ msalEnabled = true, redirectResult }: AppProps) => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <DialogProvider>
          <ApiErrorBoundary>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AuthProvider
                msalEnabled={msalEnabled}
                redirectResult={redirectResult}
              >
                <ErrorBoundary>
                  <AppRoutes />
                </ErrorBoundary>
              </AuthProvider>
            </BrowserRouter>
          </ApiErrorBoundary>
        </DialogProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;