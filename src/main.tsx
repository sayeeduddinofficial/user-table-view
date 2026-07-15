import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { PublicClientApplication,AuthenticationResult} from "@azure/msal-browser";
import { MsalProvider } from "@azure/msal-react";
import { msalConfig } from "./auth/msalConfig.tsx";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import '@/services/authService.tsx'; // Import the authService to set up Axios interceptors

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        if (error?.status === 401 || error?.code === 'ROLE_CHANGED' || error?.code === 'UNAUTHORIZED') return false;
        return failureCount < 2;
      },
    },
  },
});

const root = createRoot(document.getElementById("root")!);

const isSecure =
  window.isSecureContext && window.crypto && window.crypto.subtle;

async function bootstrap() {
  if (!isSecure) {
    console.warn("Running in insecure context. MSAL disabled.");

    // Render app WITHOUT MsalProvider
    root.render(<App msalEnabled={false} />);
    return;
  }

  try {
    const msalInstance = new PublicClientApplication(msalConfig);
    await msalInstance.initialize();
    let redirectResult: AuthenticationResult | null = null;
    try {
      redirectResult = await msalInstance.handleRedirectPromise();
    } catch (redirectErr) {
      console.error("MSAL handleRedirectPromise error:", redirectErr);
    }
    root.render(
      
      <QueryClientProvider client={queryClient}>
        <MsalProvider instance={msalInstance}>
          <App msalEnabled={true} redirectResult={redirectResult}/>
        </MsalProvider>
      </QueryClientProvider>
    );
  } catch (error) {
    console.error("MSAL bootstrap failed:", error);
    root.render(<App msalEnabled={false} />);
  }
}

bootstrap();


