import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Genie, GenieLogo } from "./Genie";
import { ThemeToggle } from "./AppShell";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useApp } from "@/lib/app-state";
import { authService } from "@/lib/api/services";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-4 w-4"} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

function MicrosoftIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-4 w-4"} viewBox="0 0 24 24">
      <rect x="1" y="1" width="10" height="10" fill="#F25022" />
      <rect x="13" y="1" width="10" height="10" fill="#7FBA00" />
      <rect x="1" y="13" width="10" height="10" fill="#00A4EF" />
      <rect x="13" y="13" width="10" height="10" fill="#FFB900" />
    </svg>
  );
}

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const navigate = useNavigate();
  const { login, register, loginWithOAuth, isBackendOnline } = useApp();
  const signup = mode === "signup";

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "microsoft" | null>(null);

  // Modal state when keys are not configured yet
  const [missingConfigModal, setMissingConfigModal] = useState<"google" | "microsoft" | null>(null);

  // Check for OAuth callback code in URL search parameters
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const provider = (params.get("provider") || params.get("oauth_provider") || "google") as "google" | "microsoft";

    if (code) {
      setOauthLoading(provider);
      const redirectUri = window.location.origin + window.location.pathname;
      loginWithOAuth(provider, code, undefined, redirectUri)
        .then(() => {
          toast.success(`Successfully logged in with ${provider === "google" ? "Google" : "Windows"}! ✨`);
          navigate({ to: "/exam-checkin" });
        })
        .catch((err: any) => {
          const msg = err?.data?.message || err?.message || "OAuth login failed";
          toast.error(msg);
        })
        .finally(() => {
          setOauthLoading(null);
        });
    }
  }, [loginWithOAuth, navigate]);

  const handleOAuthClick = async (provider: "google" | "microsoft") => {
    setOauthLoading(provider);
    try {
      const redirectUri = window.location.origin + window.location.pathname;
      const info = await authService.getOAuthInfo(redirectUri);

      if (provider === "google") {
        if (info.googleConfigured && info.googleAuthUrl) {
          window.location.href = info.googleAuthUrl;
          return;
        }
      } else {
        if (info.microsoftConfigured && info.microsoftAuthUrl) {
          window.location.href = info.microsoftAuthUrl;
          return;
        }
      }

      // If not configured in .env, prompt the user with demo option & setup instructions
      setMissingConfigModal(provider);
    } catch {
      setMissingConfigModal(provider);
    } finally {
      setOauthLoading(null);
    }
  };

  const handleDemoOAuthLogin = async (provider: "google" | "microsoft") => {
    setMissingConfigModal(null);
    setOauthLoading(provider);
    try {
      await loginWithOAuth(provider, `demo_${provider}_code`);
      toast.success(`Signed in as demo ${provider === "google" ? "Google" : "Windows"} account! ✨`);
      navigate({ to: "/exam-checkin" });
    } catch (err: any) {
      toast.error(err?.message || "Demo sign in failed");
    } finally {
      setOauthLoading(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter both email and password");
      return;
    }
    if (signup && !fullName) {
      toast.error("Please enter your full name");
      return;
    }
    if (signup && password.length < 8) {
      toast.error("Password must be at least 8 characters and include letters & numbers");
      return;
    }

    setLoading(true);
    try {
      if (signup) {
        await register(fullName, email, password);
        toast.success("Account created successfully! ✨");
        navigate({ to: "/onboarding" });
      } else {
        await login(email, password);
        toast.success("Welcome back! ✨");
        navigate({ to: "/exam-checkin" });
      }
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || "Authentication failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="hidden flex-col items-center justify-center gap-6 bg-gradient-magic p-12 text-primary-foreground md:flex">
        <Genie pose={signup ? "high" : "mid"} className="h-72 w-72 animate-float" />
        <h2 className="text-3xl font-semibold">{signup ? "Make your first wish." : "Welcome back, scholar."}</h2>
      </div>
      <div className="flex flex-col bg-background p-8">
        <div className="flex items-center justify-between">
          <Link to="/">
            <GenieLogo />
          </Link>
          <div className="flex items-center gap-3">
            {isBackendOnline !== null && (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                  isBackendOnline ? "bg-emerald-500/15 text-emerald-600" : "bg-amber-500/15 text-amber-600"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${isBackendOnline ? "bg-emerald-500" : "bg-amber-500"}`} />
                {isBackendOnline ? "Backend Live" : "Offline Demo"}
              </span>
            )}
            <ThemeToggle />
          </div>
        </div>

        <div className="mx-auto my-auto flex w-full max-w-sm flex-col gap-4">
          <div>
            <h1 className="text-3xl font-semibold">{signup ? "Create account" : "Log in"}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {signup ? "Sign up to track exams, study kits, and flashcards." : "Enter your details to access your study portal."}
            </p>
          </div>

          {/* Social OAuth Buttons */}
          <div className="grid grid-cols-1 gap-2.5 pt-2">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="relative flex h-11 w-full items-center justify-center gap-3 rounded-xl border-border bg-card/50 hover:bg-accent hover:text-accent-foreground font-medium transition-all"
              onClick={() => handleOAuthClick("google")}
              disabled={oauthLoading !== null || loading}
            >
              {oauthLoading === "google" ? (
                <span className="flex items-center gap-2 text-xs">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  Connecting Google...
                </span>
              ) : (
                <>
                  <GoogleIcon className="h-4 w-4" />
                  <span>Continue with Google</span>
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="lg"
              className="relative flex h-11 w-full items-center justify-center gap-3 rounded-xl border-border bg-card/50 hover:bg-accent hover:text-accent-foreground font-medium transition-all"
              onClick={() => handleOAuthClick("microsoft")}
              disabled={oauthLoading !== null || loading}
            >
              {oauthLoading === "microsoft" ? (
                <span className="flex items-center gap-2 text-xs">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  Connecting Windows...
                </span>
              ) : (
                <>
                  <MicrosoftIcon className="h-4 w-4" />
                  <span>Continue with Windows / Microsoft</span>
                </>
              )}
            </Button>
          </div>

          {/* Divider */}
          <div className="relative my-2 text-center text-xs uppercase after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
            <span className="relative z-10 bg-background px-3 font-medium text-muted-foreground">
              or continue with email
            </span>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {signup && (
              <div className="grid gap-2">
                <Label>Full name</Label>
                <Input
                  className="h-11 rounded-xl"
                  placeholder="e.g. Jane Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            )}
            <div className="grid gap-2">
              <Label>Email</Label>
              <Input
                className="h-11 rounded-xl"
                type="email"
                placeholder="you@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label>Password</Label>
              <Input
                className="h-11 rounded-xl"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button variant="magic" size="lg" type="submit" disabled={loading || oauthLoading !== null} className="mt-2">
              {loading ? "Connecting..." : signup ? "Sign up" : "Log in"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              {signup ? "Have an account? " : "New here? "}
              <Link to={signup ? "/login" : "/signup"} className="font-bold text-primary">
                {signup ? "Log in" : "Sign up"}
              </Link>
            </p>
          </form>
        </div>
      </div>

      {/* Developer OAuth Setup Modal when keys are missing in .env */}
      {missingConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              {missingConfigModal === "google" ? (
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
                  <GoogleIcon className="h-5 w-5" />
                </div>
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10">
                  <MicrosoftIcon className="h-5 w-5" />
                </div>
              )}
              <div>
                <h3 className="text-lg font-semibold">
                  {missingConfigModal === "google" ? "Google" : "Windows / Microsoft"} Credentials
                </h3>
                <p className="text-xs text-muted-foreground">Quick Setup & Instant Demo</p>
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-muted/60 p-3.5 text-xs text-muted-foreground space-y-2">
              <p>
                To enable live {missingConfigModal === "google" ? "Google" : "Microsoft"} login in production, add these to your <code className="font-semibold text-foreground">.env</code>:
              </p>
              <pre className="rounded bg-background p-2 font-mono text-[11px] text-foreground overflow-x-auto">
                {missingConfigModal === "google"
                  ? "GOOGLE_CLIENT_ID=your_id\nGOOGLE_CLIENT_SECRET=your_secret"
                  : "MICROSOFT_CLIENT_ID=your_id\nMICROSOFT_CLIENT_SECRET=your_secret"}
              </pre>
            </div>

            <div className="mt-5 flex flex-col gap-2">
              <Button
                variant="magic"
                className="w-full h-10 rounded-xl font-medium"
                onClick={() => handleDemoOAuthLogin(missingConfigModal)}
              >
                Sign In with Demo {missingConfigModal === "google" ? "Google" : "Windows"} Account
              </Button>
              <Button
                variant="ghost"
                className="w-full h-10 rounded-xl text-xs text-muted-foreground"
                onClick={() => setMissingConfigModal(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
