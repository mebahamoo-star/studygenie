import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Genie, GenieLogo } from "./Genie";
import { ThemeToggle } from "./AppShell";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useApp } from "@/lib/app-state";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const navigate = useNavigate();
  const { login, register, isBackendOnline } = useApp();
  const signup = mode === "signup";

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

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
        <form onSubmit={handleSubmit} className="mx-auto my-auto flex w-full max-w-sm flex-col gap-4">
          <h1 className="text-3xl font-semibold">{signup ? "Create account" : "Log in"}</h1>
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
          <Button variant="magic" size="lg" type="submit" disabled={loading} className="mt-2">
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
  );
}
