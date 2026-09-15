import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { Button } from "../components/Button";

export function AuthPage({ register = false }: { register?: boolean }) {
  const auth = useAuth(), navigate = useNavigate(), location = useLocation();
  const [email, setEmail] = useState(""), [password, setPassword] = useState(""), [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null), [busy, setBusy] = useState(false);
  const [confirmationSent,setConfirmationSent]=useState(false);
  const requested=(location.state as {from?:string}|null)?.from;
  const destination=requested?.startsWith("/")&&!requested.startsWith("//")?requested:"/";
  if (auth.mode === "local") return <Navigate to="/" replace />;
  if (auth.user) return <Navigate to={destination} replace />;
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (register && password !== confirmation) { setError("Passwords do not match."); return; }
    if (!password) { setError("Enter your password."); return; }
    setBusy(true); setError(null);
    try {
      if (register) { const signedIn=await auth.signUp(email,password); if(!signedIn){setConfirmationSent(true);return;} } else await auth.signIn(email,password);
      navigate(destination, { replace: true });
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Authentication failed."); }
    finally { setBusy(false); }
  };
  return <div className="page-shell flex min-h-[72vh] items-center justify-center">
    <section className="w-full max-w-md rounded-xl border border-outline bg-surface p-6 shadow-2xl sm:p-8" aria-labelledby="auth-title">
      <p className="text-xs font-bold uppercase tracking-[.2em] text-accent-secondary">AniVerse Online</p>
      <h1 id="auth-title" className="mt-2 text-3xl font-black">{register ? "Create account" : "Welcome back"}</h1>
      <p className="mt-2 text-sm text-muted">{register ? "Create your private cloud library." : "Sign in to continue to your AniVerse library."}</p>
      <form aria-busy={busy} className="mt-7 space-y-4" onSubmit={submit}>
        {confirmationSent && <p role="status" className="text-accent-secondary">Check your email to confirm your account.</p>}
        <label className="block text-sm font-semibold">Email<input className="control-surface mt-2 h-11 w-full rounded-md px-3" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label className="block text-sm font-semibold">Password<input className="control-surface mt-2 h-11 w-full rounded-md px-3" type="password" aria-describedby={error || auth.error ? "auth-error" : undefined} aria-invalid={Boolean(error || auth.error)} autoComplete={register ? "new-password" : "current-password"} required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        {register && <label className="block text-sm font-semibold">Confirm password<input className="control-surface mt-2 h-11 w-full rounded-md px-3" type="password" aria-describedby={error || auth.error ? "auth-error" : undefined} aria-invalid={Boolean(error || auth.error)} autoComplete="new-password" required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label>}
        {(error || auth.error) && <p id="auth-error" role="alert" className="text-sm text-rose-300">{error ?? auth.error}</p>}
        <Button type="submit" className="w-full justify-center" disabled={busy}>{busy ? "Please wait..." : register ? "Create Account" : "Sign In"}</Button>
      </form>
      <p className="mt-5 text-center text-sm text-muted">{register ? "Already registered? " : "New to AniVerse? "}<Link className="font-semibold text-accent-secondary hover:underline" to={register ? "/login" : "/register"}>{register ? "Sign in" : "Create account"}</Link></p>
    </section>
  </div>;
}
