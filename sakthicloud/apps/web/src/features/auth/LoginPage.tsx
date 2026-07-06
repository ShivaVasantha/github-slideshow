import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/app/auth-context";
import { ApiError } from "@/lib/api-client";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email, password);
      navigate("/m/dashboard", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="sc-login">
      <form className="sc-login__card" onSubmit={onSubmit}>
        <div className="sc-login__brand">SakthiCloud</div>
        <p className="sc-login__sub">Hotel management, signed in.</p>

        <label className="sc-field">
          <span>Email</span>
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label className="sc-field">
          <span>Password</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        {error && <div className="sc-login__error">{error}</div>}

        <button type="submit" className="sc-btn sc-btn--primary sc-login__submit" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
