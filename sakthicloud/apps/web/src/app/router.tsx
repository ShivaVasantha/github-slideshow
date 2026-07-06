import { lazy, Suspense, type ComponentType, type ReactNode } from "react";
import { Routes, Route, Navigate, useParams } from "react-router-dom";
import { isModuleLocked } from "@sakthicloud/shared";
import { useAuth } from "./auth-context";
import { AppShell } from "./shell/AppShell";
import { LoginPage } from "@/features/auth/LoginPage";
import { UpgradeGate } from "@/components/UpgradeGate";
import { ModulePlaceholder } from "@/features/_shared/ModulePlaceholder";

// Code-split per module — each feature is its own chunk, loaded on demand and
// only when the tenant is entitled. This is the payoff over Babel-in-browser:
// a tenant on Core never downloads the Finance or Spa bundles.
const RoomsPage = lazy(() =>
  import("@/features/front-desk/rooms/RoomsPage").then((m) => ({ default: m.RoomsPage })),
);

/** Feature registry: module id → its lazy component. Grows as modules migrate. */
const FEATURES: Record<string, ComponentType> = {
  rooms: RoomsPage,
};

function ModuleRoute() {
  const { moduleId = "" } = useParams();
  const { modules, subscription } = useAuth();

  if (!modules.includes(moduleId)) return <Navigate to="/m/dashboard" replace />;
  if (isModuleLocked(moduleId, subscription)) return <UpgradeGate moduleId={moduleId} />;

  const Feature = FEATURES[moduleId];
  return (
    <Suspense fallback={<div className="sc-loading">Loading…</div>}>
      {Feature ? <Feature /> : <ModulePlaceholder moduleId={moduleId} />}
    </Suspense>
  );
}

function Protected({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function AppRouter() {
  const { session } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={session ? <Navigate to="/m/dashboard" replace /> : <LoginPage />} />
      <Route
        element={
          <Protected>
            <AppShell />
          </Protected>
        }
      >
        <Route path="/m/:moduleId" element={<ModuleRoute />} />
      </Route>
      <Route path="*" element={<Navigate to={session ? "/m/dashboard" : "/login"} replace />} />
    </Routes>
  );
}
