import { useAuth } from "@/contexts/AuthContext";
import { Navigate, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/landing/Navbar";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck, Clock, CheckCircle2, XCircle, AlertTriangle, Briefcase, Plus, Search, Wallet, Settings, Sparkles, UserCircle, LogOut, ImagePlus, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import BoostInfoCard from "@/components/profile/BoostInfoCard";
import PushNotificationPrompt from "@/components/PushNotificationPrompt";
import ReferralSection from "@/components/dashboard/ReferralSection";
import ProfileVisibilityToggle from "@/components/dashboard/ProfileVisibilityToggle";
import ArtisanPortfolio from "@/components/profile/ArtisanPortfolio";

const STATUS_CONFIG = {
  unverified: {
    icon: ShieldCheck,
    label: "Not Verified",
    color: "text-muted-foreground",
    bg: "bg-muted",
    border: "border-border",
    message: "Complete your verification to become a public artisan and start receiving job requests.",
    cta: "Start Verification",
  },
  pending: {
    icon: Clock,
    label: "Under Review",
    color: "text-warning",
    bg: "bg-warning/10",
    border: "border-warning/30",
    message: "Your verification is being reviewed. This typically takes 24–48 hours. We'll notify you once a decision is made.",
    cta: null,
  },
  approved: {
    icon: CheckCircle2,
    label: "Verified",
    color: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/30",
    message: "Your profile is verified and public! Customers can now find and hire you for jobs.",
    cta: null,
  },
  rejected: {
    icon: XCircle,
    label: "Rejected",
    color: "text-destructive",
    bg: "bg-destructive/10",
    border: "border-destructive/30",
    message: "Your verification was not approved. Please review the feedback below and resubmit.",
    cta: "Resubmit Verification",
  },
} as const;

const Dashboard = () => {
  const { user, loading, userRole } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/");
  };

  // Check onboarding status
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile-onboarding", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: artisanProfile } = useQuery({
    queryKey: ["artisan-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("artisan_profiles")
        .select("verification_status, rejection_note, primary_trade")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user && userRole === "artisan",
  });

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect to onboarding if not completed
  if (profile && !(profile as any).onboarding_completed) {
    return <Navigate to="/onboarding" replace />;
  }

  const status = artisanProfile?.verification_status ?? "unverified";
  const config = STATUS_CONFIG[status];
  const StatusIcon = config.icon;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-12">
        <div className="max-w-2xl space-y-4">
          <PushNotificationPrompt />
          <div className="flex items-start justify-between gap-4 mb-8">
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-2">
                Welcome, {user.user_metadata?.full_name || "User"}
              </h1>
              <p className="text-muted-foreground">
                Your role: <span className="font-semibold capitalize text-foreground">{userRole || "loading..."}</span>
                {(userRole === "admin" || userRole === "super_admin") && (
                  <Link to="/admin" className="ml-3 inline-flex items-center gap-1 text-sm text-primary hover:underline font-semibold">
                    <Settings className="w-3.5 h-3.5" /> Admin Panel
                  </Link>
                )}
              </p>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm">
                <Link to="/profile">
                  <UserCircle className="w-4 h-4 mr-1.5" />
                  Profile
                </Link>
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogout} className="text-destructive hover:text-destructive">
                <LogOut className="w-4 h-4 mr-1.5" />
                Logout
              </Button>
            </div>
          </div>

          {userRole === "artisan" ? (
            <div className="space-y-4">
              {/* Urgent verification prompt for unverified artisans */}
              {(status === "unverified" || status === "rejected") && (
                <div className="flex gap-3 p-4 rounded-xl bg-warning/10 border border-warning/30">
                  <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-foreground text-sm">Action Required: Verify Your Identity</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      You must verify your identity to receive job requests, accept bids, and withdraw funds from your wallet.
                    </p>
                    <Button asChild size="sm" className="mt-2 bg-gradient-hero text-primary-foreground hover:opacity-90">
                      <Link to="/verify">
                        <ShieldCheck className="w-4 h-4 mr-1.5" />
                        {status === "rejected" ? "Resubmit Verification" : "Start Verification Now"}
                      </Link>
                    </Button>
                  </div>
                </div>
              )}
              <div className={cn("rounded-xl border p-6 space-y-4", config.bg, config.border)}>
                <div className="flex items-center gap-3">
                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", config.bg)}>
                    <StatusIcon className={cn("w-5 h-5", config.color)} />
                  </div>
                  <div>
                    <p className={cn("font-display font-bold text-sm", config.color)}>{config.label}</p>
                    <p className="text-xs text-muted-foreground">Verification Status</p>
                  </div>
                </div>

                <p className="text-sm text-foreground">{config.message}</p>

                {status === "rejected" && artisanProfile?.rejection_note && (
                  <div className="flex gap-2 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                    <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-destructive mb-1">Reason for rejection</p>
                      <p className="text-sm text-foreground">{artisanProfile.rejection_note}</p>
                    </div>
                  </div>
                )}

                {config.cta && (
                  <Button asChild className="bg-gradient-hero text-primary-foreground hover:opacity-90">
                    <Link to="/verify">
                      <ShieldCheck className="w-4 h-4 mr-2" />
                      {config.cta}
                    </Link>
                  </Button>
                )}
              </div>

              {/* Browse jobs */}
              {status === "approved" && (
                <div className="bg-card rounded-xl border border-border p-6">
                  <h2 className="font-display font-semibold text-lg mb-2 text-foreground">Find Work</h2>
                  <p className="text-muted-foreground text-sm mb-4">The Jobman team matches you to customer requests in your trade and area. Keep your profile public and verified to get picked.</p>
                  <div className="flex gap-3 flex-wrap">
                    <Button asChild variant="outline">
                      <Link to="/jobs">
                        <Briefcase className="w-4 h-4 mr-2" />
                        My Jobs
                      </Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link to="/profile">
                        <Search className="w-4 h-4 mr-2" />
                        Update My Profile
                      </Link>
                    </Button>
                  </div>
                </div>
              )}

              {/* Trade info */}
              {artisanProfile?.primary_trade && (
                <div className="bg-card rounded-xl border border-border p-6">
                  <h2 className="font-display font-semibold text-lg mb-1 text-foreground">Your Trade</h2>
                  <p className="text-muted-foreground mb-3">{artisanProfile.primary_trade}</p>
                </div>
              )}

              {/* Boost promotion */}
              <BoostInfoCard />

              {/* Wallet */}
              <div className="bg-card rounded-xl border border-border p-6">
                <h2 className="font-display font-semibold text-lg mb-2 text-foreground">Wallet</h2>
                <p className="text-muted-foreground text-sm mb-4">View your balance, transactions, and pending payments.</p>
                <Button asChild variant="outline">
                  <Link to="/wallet">
                    <Wallet className="w-4 h-4 mr-2" />
                    Open Wallet
                  </Link>
                </Button>
              </div>

              {/* Portfolio uploads */}
              <div className="bg-card rounded-xl border border-border p-6">
                <h2 className="font-display font-semibold text-lg mb-1 text-foreground flex items-center gap-2">
                  <ImagePlus className="w-5 h-5 text-primary" />
                  Work Portfolio
                </h2>
                <p className="text-muted-foreground text-sm mb-4">Upload photos and videos of your completed projects to attract more customers.</p>
                <ArtisanPortfolio userId={user.id} />
              </div>

              {/* Profile visibility */}
              <ProfileVisibilityToggle />

              {/* Referral program */}
              <ReferralSection />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-card rounded-xl border border-border p-6">
                <h2 className="font-display font-semibold text-lg mb-3 text-foreground">Getting Started</h2>
                <p className="text-muted-foreground mb-4">
                  Tell the Jobman Concierge what you need and we'll match you with verified artisans anywhere in Nigeria.
                </p>
                <div className="flex gap-3 flex-wrap">
                  <Button asChild className="bg-gradient-hero text-primary-foreground hover:opacity-90">
                    <Link to="/assistant">
                      <Plus className="w-4 h-4 mr-2" />
                      Request an Artisan
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link to="/assistant">
                      <Briefcase className="w-4 h-4 mr-2" />
                      My Requests
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link to="/jobs">
                      <Briefcase className="w-4 h-4 mr-2" />
                      My Jobs
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link to="/find-artisan">
                      <Search className="w-4 h-4 mr-2" />
                      Search Artisans
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link to="/saved-artisans">
                      <Heart className="w-4 h-4 mr-2" />
                      Saved Artisans
                    </Link>
                  </Button>
                </div>
              </div>

              {/* Wallet */}
              <div className="bg-card rounded-xl border border-border p-6">
                <h2 className="font-display font-semibold text-lg mb-2 text-foreground">Wallet</h2>
                <p className="text-muted-foreground text-sm mb-4">View your balance, transactions, and pending payments.</p>
                <Button asChild variant="outline">
                  <Link to="/wallet">
                    <Wallet className="w-4 h-4 mr-2" />
                    Open Wallet
                  </Link>
                </Button>
              </div>

              {/* Referral program */}
              <ReferralSection />
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
