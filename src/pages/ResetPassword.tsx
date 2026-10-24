import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HardHat, Lock, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // The user arrives here via the reset link which sets a session
    supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setHasSession(true);
      }
      setChecking(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setHasSession(true);
      setChecking(false);
    });
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      setSuccess(true);
      setTimeout(() => navigate("/dashboard"), 3000);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <p className="text-muted-foreground">Verifying reset link...</p>
      </div>
    );
  }

  if (!hasSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-card rounded-2xl border border-border p-8 shadow-sm">
            <h2 className="font-display text-xl font-bold text-foreground mb-2">Invalid or expired link</h2>
            <p className="text-sm text-muted-foreground mb-6">
              This password reset link is no longer valid. Please request a new one.
            </p>
            <Link to="/forgot-password">
              <Button className="w-full bg-gradient-hero text-primary-foreground hover:opacity-90 font-semibold">
                Request New Link
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-hero flex items-center justify-center">
              <HardHat className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-2xl text-foreground">Jobman</span>
          </Link>
          <h1 className="font-display text-2xl font-bold text-foreground">Set new password</h1>
          <p className="text-muted-foreground mt-1">Choose a strong password for your account</p>
        </div>

        <div className="bg-card rounded-2xl border border-border p-8 shadow-sm">
          {success ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-7 h-7 text-primary" />
              </div>
              <h2 className="font-display font-semibold text-lg text-foreground mb-2">Password updated!</h2>
              <p className="text-sm text-muted-foreground">Redirecting you to your dashboard...</p>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-5">
              <div>
                <Label htmlFor="password">New Password</Label>
                <div className="relative mt-1.5">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Min. 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative mt-1.5">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-hero text-primary-foreground hover:opacity-90 font-semibold"
                disabled={loading}
              >
                {loading ? "Updating..." : "Update Password"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
