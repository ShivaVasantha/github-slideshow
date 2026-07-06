import { useAuth } from "@/app/auth-context";

export function Topbar({ onToggleNav }: { onToggleNav: () => void }) {
  const { session, logout, setActiveProperty } = useAuth();
  if (!session) return null;

  const initials = session.user.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="sc-topbar">
      <button className="sc-iconbtn sc-topbar__menu" onClick={onToggleNav} aria-label="Toggle navigation">
        ☰
      </button>
      <div className="sc-topbar__tenant">{session.tenant.name}</div>

      {session.properties.length > 0 && (
        <select
          className="sc-select"
          value={session.activePropertyId ?? ""}
          onChange={(e) => setActiveProperty(e.target.value)}
          aria-label="Active property"
        >
          {session.properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      )}

      <div className="sc-topbar__spacer" />
      <div className="sc-topbar__user" title={session.user.email}>
        <span className="sc-avatar">{initials}</span>
        <span className="sc-topbar__name">{session.user.name}</span>
      </div>
      <button className="sc-btn sc-btn--ghost" onClick={() => void logout()}>
        Log out
      </button>
    </header>
  );
}
