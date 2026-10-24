import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff, Mail, Lock, MailCheck } from "lucide-react";
import jobmanLogo from "@/assets/jobman-logo.png";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import SocialLoginButtons from "@/components/SocialLoginButtons";

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailNotVerified, setEmailNotVerified] = useState(false);
  const [resending, setResending] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setEmailNotVerified(false);

    // Store remember me preference before login
    if (rememberMe) {
      localStorage.setItem("jobman_remember_me", "true");
    } else {
      localStorage.removeItem("jobman_remember_me");
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      if (error.message.toLowerCase().includes("email not confirmed")) {
        setEmailNotVerified(true);
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success("Welcome back!");
      navigate(redirectTo || "/dashboard");
    }
  };

  const handleResendVerification = async () => {
    setResending(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    setResending(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Verification email sent! Check your inbox.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <img src={jobmanLogo} alt="Jobman" className="h-16" />
          </Link>
          <h1 className="font-display text-2xl font-bold text-foreground">Welcome back</h1>
          <p className="text-muted-foreground mt-1">Sign in to your account</p>
        </div>

        <div className="bg-card rounded-2xl border border-border p-8 shadow-sm">
          {emailNotVerified && (
            <Alert className="mb-5 border-warning bg-warning/10">
              <MailCheck className="h-4 w-4 text-warning" />
              <AlertDescription className="text-sm">
                <p className="font-semibold text-foreground mb-1">Email not verified</p>
                <p className="text-muted-foreground mb-2">Please check your inbox and click the verification link before signing in.</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResendVerification}
                  disabled={resending}
                  className="text-xs"
                >
                  {resending ? "Sending..." : "Resend verification email"}
                </Button>
              </AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <Label htmlFor="email">Email</Label>
              <div className="relative mt-1.5">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  required
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

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked === true)}
                />
                <Label htmlFor="remember" className="text-xs text-muted-foreground cursor-pointer">
                  Remember me
                </Label>
              </div>
              <Link to="/forgot-password" className="text-xs text-muted-foreground hover:text-primary transition-colors">
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-hero text-primary-foreground hover:opacity-90 font-semibold"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <SocialLoginButtons />

          <p className="text-center text-sm text-muted-foreground mt-6">
            Don't have an account?{" "}
            <Link to="/register" className="text-primary font-semibold hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
