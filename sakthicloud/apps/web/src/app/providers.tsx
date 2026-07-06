import { useEffect, type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { queryClient } from "@/lib/query-client";
import { AuthProvider } from "./auth-context";
import { ToastProvider } from "@/components/Toast";
import { applyTheme, getPreset, DEFAULT_THEME_ID } from "@/lib/theme";

function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    // In a full build the active tenant's brand id comes from tenant settings;
    // default preset until a session with branding loads.
    applyTheme(getPreset(DEFAULT_THEME_ID));
  }, []);
  return <>{children}</>;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>{children}</ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
