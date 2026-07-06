import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function AppShell() {
  const [navOpen, setNavOpen] = useState(false);
  return (
    <div className={"sc-shell" + (navOpen ? " sc-shell--nav-open" : "")}>
      <aside className="sc-shell__nav">
        <Sidebar onNavigate={() => setNavOpen(false)} />
      </aside>
      {navOpen && <div className="sc-shell__scrim" onClick={() => setNavOpen(false)} />}
      <div className="sc-shell__main">
        <Topbar onToggleNav={() => setNavOpen((v) => !v)} />
        <main className="sc-shell__content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
