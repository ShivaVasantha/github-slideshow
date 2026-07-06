import { NavLink } from "react-router-dom";
import { ALL_NAV, SECTION_ORDER, isModuleLocked, type SectionName } from "@sakthicloud/shared";
import { useAuth } from "@/app/auth-context";

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { modules, subscription } = useAuth();

  // Only modules the user's role/override grants; grouped by section, in order.
  const visible = ALL_NAV.filter((n) => modules.includes(n.id));
  const bySection = new Map<SectionName, typeof visible>();
  for (const item of visible) {
    if (!bySection.has(item.sec)) bySection.set(item.sec, []);
    bySection.get(item.sec)!.push(item);
  }

  return (
    <nav className="sc-sidebar" aria-label="Modules">
      <div className="sc-sidebar__brand">SakthiCloud</div>
      {SECTION_ORDER.map((section) => {
        const items = bySection.get(section);
        if (!items || items.length === 0) return null;
        return (
          <div key={section} className="sc-sidebar__section">
            <div className="sc-sidebar__section-label">{section}</div>
            {items.map((item) => {
              const locked = isModuleLocked(item.id, subscription);
              // Locked add-on modules stay visible (upsell surface); route to the
              // module, where an UpgradeGate renders instead of the feature.
              return (
                <NavLink
                  key={item.id}
                  to={`/m/${item.id}`}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    "sc-navitem" + (isActive ? " sc-navitem--active" : "") + (locked ? " sc-navitem--locked" : "")
                  }
                >
                  <span className="sc-navitem__label">{item.label}</span>
                  {locked && <span className="sc-navitem__lock" aria-label="Requires upgrade">🔒</span>}
                </NavLink>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}
