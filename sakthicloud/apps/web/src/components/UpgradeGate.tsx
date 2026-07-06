import { Link } from "react-router-dom";
import { ADDON_CATALOG, moduleAddonId, ALL_NAV } from "@sakthicloud/shared";

// Rendered in place of a locked module. Locked-but-visible is the upsell
// surface — the backend also enforces this with a 402 on the API, so gating
// here is UX, not the security boundary.
export function UpgradeGate({ moduleId }: { moduleId: string }) {
  const addonId = moduleAddonId(moduleId);
  const addon = ADDON_CATALOG.find((a) => a.id === addonId);
  const label = ALL_NAV.find((n) => n.id === moduleId)?.label ?? moduleId;

  return (
    <div className="sc-upgrade">
      <div className="sc-upgrade__lock">🔒</div>
      <h1 className="sc-upgrade__title">{label} is part of {addon?.label ?? "an add-on"}</h1>
      <p className="sc-upgrade__desc">{addon?.desc}</p>
      {addon && (
        <p className="sc-upgrade__price">
          ₹{addon.price.toLocaleString("en-IN")}<span>/property/month</span>
        </p>
      )}
      <Link to="/m/subscription" className="sc-btn sc-btn--primary">
        View plans &amp; enable
      </Link>
    </div>
  );
}
