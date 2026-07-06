import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import {
  LoginResponse,
  type AuthUser,
  type Tenant,
  type PropertyRef,
  type Subscription,
  effectiveModulesFor,
} from "@sakthicloud/shared";
import { api, setTokens, clearTokens, isAuthenticated } from "@/lib/api-client";
import { liveChannel } from "@/lib/ws";

interface Session {
  user: AuthUser;
  tenant: Tenant;
  properties: PropertyRef[];
  activePropertyId: string | null;
}

interface AuthContextValue {
  session: Session | null;
  subscription: Subscription;
  modules: string[];
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setActiveProperty: (id: string) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);

  const login = useCallback(async (email: string, password: string) => {
    const raw = await api.post<unknown>("/auth/login", { email, password });
    const data = LoginResponse.parse(raw);
    setTokens(data.accessToken, data.refreshToken);
    setSession({
      user: data.user,
      tenant: data.tenant,
      properties: data.properties,
      activePropertyId: data.properties[0]?.id ?? null,
    });
    if (data.tenant.id) liveChannel.connect(data.tenant.id, data.accessToken);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout", {});
    } catch {
      /* best-effort */
    }
    clearTokens();
    liveChannel.disconnect();
    setSession(null);
  }, []);

  const setActiveProperty = useCallback((id: string) => {
    setSession((s) => (s ? { ...s, activePropertyId: id } : s));
  }, []);

  const subscription: Subscription = {
    plan: session?.tenant.plan ?? "core",
    addons: session?.tenant.addons ?? [],
    roomBand: session?.tenant.roomBand ?? "1-20",
  };

  const modules = session ? effectiveModulesFor(session.user) : [];

  return (
    <AuthContext.Provider value={{ session, subscription, modules, login, logout, setActiveProperty }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}

export function hasStoredSession(): boolean {
  return isAuthenticated();
}
