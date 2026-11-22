import { useState } from "react";
import { Eye, EyeOff, Gem, ShieldCheck } from "lucide-react";

export default function AdminLogin({ login }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");

    try {
      await login(email, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="loginArea luxuryLoginArea">
      <form className="loginCard" onSubmit={submit}>
        <span className="loginBrandMark" aria-hidden="true"><Gem size={24} /></span>
        <span className="eyebrow">
          <ShieldCheck size={15} aria-hidden="true" /> OWNER ACCESS
        </span>
        <h1>Welcome back, owner.</h1>
        <p>Sign in to manage product listings and daily gold rates.</p>
        <label>
          Email
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="passwordField">
          Password
          <input
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            className="passwordVisibility"
            type="button"
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            onClick={() => setShowPassword((visible) => !visible)}
          >
            {showPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
          </button>
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn gold full" disabled={busy}>
          {busy ? "Signing in..." : "Sign in to owner dashboard"}
        </button>
      </form>
    </section>
  );
}
