import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, KeyRound, Mail, RefreshCw, ShieldCheck } from "lucide-react";
import { Genie, GenieLogo } from "@/components/Genie";
import { ThemeToggle } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { TopographyBackground } from "@/components/animate-ui/backgrounds/topography";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset Password — StudyGenie" },
      { name: "description", content: "Reset your StudyGenie password." },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"request" | "verify" | "reset" | "success">("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Trigger countdown when cooldown is active
  const startCooldown = () => {
    setResendCooldown(30);
    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Please enter your email address");
      return;
    }

    setLoading(true);
    try {
      // Simulate/Trigger sending code to user's email
      await new Promise((resolve) => setTimeout(resolve, 800));
      toast.success(`Verification code sent to ${email}`);
      setStep("verify");
      startCooldown();
    } catch {
      toast.error("Failed to send verification code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
      toast.success(`New code sent to ${email}`);
      startCooldown();
    } catch {
      toast.error("Could not resend code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length < 6) {
      toast.error("Please enter the complete 6-digit verification code");
      return;
    }

    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
      toast.success("Code verified! Set your new password.");
      setStep("reset");
    } catch {
      toast.error("Invalid verification code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      toast.success("Password reset successfully! ✨");
      setStep("success");
    } catch {
      toast.error("Failed to update password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative grid min-h-screen md:grid-cols-2 overflow-hidden bg-background">
      {/* Decorative Interactive Background on desktop side */}
      <div className="relative hidden flex-col items-center justify-center gap-6 overflow-hidden bg-gradient-to-br from-primary/95 via-primary to-purple-900 p-12 text-primary-foreground md:flex">
        <TopographyBackground className="absolute inset-0 opacity-20 pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center text-center max-w-md">
          <Genie pose="mid" className="h-64 w-64 animate-float drop-shadow-2xl" />
          <h2 className="mt-4 text-3xl font-semibold tracking-tight">Account Recovery</h2>
          <p className="mt-2 text-sm text-primary-foreground/80 leading-relaxed">
            Don't worry! It happens to the best of scholars. We'll help you secure and regain access to your account in no time.
          </p>
        </div>
      </div>

      {/* Main Form View */}
      <div className="flex flex-col justify-between p-6 sm:p-8 md:p-12">
        <header className="flex items-center justify-between">
          <Link to="/">
            <GenieLogo />
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
          </div>
        </header>

        <main className="mx-auto my-auto w-full max-w-sm py-8">
          {/* STEP 1: Enter Email */}
          {step === "request" && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground mb-1"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to log in
                </Link>
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-2">
                  <Mail className="h-6 w-6" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight">Forgot password?</h1>
                <p className="text-sm text-muted-foreground">
                  Enter the email address associated with your StudyGenie account and we'll send you a 6-digit verification code.
                </p>
              </div>

              <form onSubmit={handleRequestCode} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@university.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    className="h-11 rounded-xl"
                  />
                </div>

                <Button
                  variant="magic"
                  size="lg"
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 rounded-xl font-medium"
                >
                  {loading ? "Sending code..." : "Send Verification Code"}
                </Button>
              </form>
            </div>
          )}

          {/* STEP 2: Enter Verification Code */}
          {step === "verify" && (
            <div className="space-y-6">
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setStep("request")}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground mb-1"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Change email
                </button>
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-2">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight">Check your email</h1>
                <p className="text-sm text-muted-foreground">
                  We sent a 6-digit verification code to{" "}
                  <span className="font-semibold text-foreground">{email}</span>.
                </p>
              </div>

              <form onSubmit={handleVerifyCode} className="space-y-5">
                <div className="space-y-2 flex flex-col items-center">
                  <Label className="self-start">Verification Code</Label>
                  <InputOTP
                    maxLength={6}
                    value={code}
                    onChange={(val) => setCode(val)}
                    autoFocus
                  >
                    <InputOTPGroup className="gap-2">
                      <InputOTPSlot index={0} className="h-12 w-11 rounded-xl text-lg font-semibold" />
                      <InputOTPSlot index={1} className="h-12 w-11 rounded-xl text-lg font-semibold" />
                      <InputOTPSlot index={2} className="h-12 w-11 rounded-xl text-lg font-semibold" />
                      <InputOTPSlot index={3} className="h-12 w-11 rounded-xl text-lg font-semibold" />
                      <InputOTPSlot index={4} className="h-12 w-11 rounded-xl text-lg font-semibold" />
                      <InputOTPSlot index={5} className="h-12 w-11 rounded-xl text-lg font-semibold" />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                <Button
                  variant="magic"
                  size="lg"
                  type="submit"
                  disabled={loading || code.length < 6}
                  className="w-full h-11 rounded-xl font-medium"
                >
                  {loading ? "Verifying..." : "Verify Code"}
                </Button>

                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                  <span>Didn't receive the email?</span>
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={resendCooldown > 0 || loading}
                    className="inline-flex items-center gap-1 font-semibold text-primary disabled:opacity-50 hover:underline cursor-pointer"
                  >
                    <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* STEP 3: Reset Password */}
          {step === "reset" && (
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-2">
                  <KeyRound className="h-6 w-6" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight">Set new password</h1>
                <p className="text-sm text-muted-foreground">
                  Your identity has been verified. Choose a strong new password for your account.
                </p>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    autoFocus
                    className="h-11 rounded-xl"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Must be at least 8 characters with letters and numbers.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="h-11 rounded-xl"
                  />
                </div>

                <Button
                  variant="magic"
                  size="lg"
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 rounded-xl font-medium mt-2"
                >
                  {loading ? "Updating..." : "Reset Password"}
                </Button>
              </form>
            </div>
          )}

          {/* STEP 4: Success */}
          {step === "success" && (
            <div className="space-y-6 text-center">
              <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 mb-2">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold tracking-tight">Password Reset Complete</h1>
                <p className="text-sm text-muted-foreground">
                  Your password has been successfully updated. You can now log in with your new credentials.
                </p>
              </div>

              <Button
                variant="magic"
                size="lg"
                onClick={() => navigate({ to: "/login" })}
                className="w-full h-11 rounded-xl font-medium"
              >
                Continue to Log In
              </Button>
            </div>
          )}
        </main>

        <footer className="text-center text-xs text-muted-foreground">
          Remember your password?{" "}
          <Link to="/login" className="font-bold text-primary hover:underline">
            Log in
          </Link>
        </footer>
      </div>
    </div>
  );
}
