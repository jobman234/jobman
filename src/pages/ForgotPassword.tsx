import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HardHat, Mail, ArrowLeft, MailCheck } from "lucide-react";
import { toast } from "sonner";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Please enter your email address");
      return;
    }
    setLoading(true);
    const redirectUrl = window.location.hostname === 'localhost' 
      ? `${window.location.origin}/reset-password`
      : 'https://jobmanmarketplace.lovable.app/reset-password';
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      setSent(true);
    }
  };

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
          <h1 className="font-display text-2xl font-bold text-foreground">Reset your password</h1>
          <p className="text-muted-foreground mt-1">We'll send you a link to reset it</p>
        </div>

        <div className="bg-card rounded-2xl border border-border p-8 shadow-sm">
          {sent ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <MailCheck className="w-7 h-7 text-primary" />
              </div>
              <h2 className="font-display font-semibold text-lg text-foreground mb-2">Check your email</h2>
              <p className="text-sm text-muted-foreground mb-6">
                We sent a password reset link to <strong className="text-foreground">{email}</strong>. Click the link in the email to set a new password.
              </p>
              <Button variant="outline" onClick={() => setSent(false)} className="w-full">
                Try a different email
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <Label htmlFor="email">Email address</Label>
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
              <Button
                type="submit"
                className="w-full bg-gradient-hero text-primary-foreground hover:opacity-90 font-semibold"
                disabled={loading}
              >
                {loading ? "Sending..." : "Send Reset Link"}
              </Button>
            </form>
          )}

          <Link
            to="/login"
            className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mt-6 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
