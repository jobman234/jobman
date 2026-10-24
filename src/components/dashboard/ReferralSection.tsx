import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Gift, Copy, Share2, Users, CheckCircle2, Clock, FileCheck, MapPin, UserCheck, ChevronDown, ChevronUp, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const ReferralSection = () => {
  const { user } = useAuth();
  const [expandedReferral, setExpandedReferral] = useState<string | null>(null);

  const { data: profile } = useQuery({
    queryKey: ["referral-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("referral_code")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: wallet } = useQuery({
    queryKey: ["referral-wallet", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("wallets")
        .select("referral_balance")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: referrals } = useQuery({
    queryKey: ["referral-events", user?.id],
    queryFn: async () => {
      const { data: events } = await supabase
        .from("referral_events" as any)
        .select("*")
        .eq("referrer_id", user!.id)
        .order("rewarded_at", { ascending: false });
      
      if (!events || events.length === 0) return [];

      // Get referred users' profiles and verification status.
      // profiles RLS only allows "own row" or "admin" -- a referrer has no
      // policy letting them read a referred user's row directly, so this
      // always returned nothing. full_name is exactly one of the columns
      // public_profiles already exposes safely to everyone, so read it from
      // there instead of the raw table.
      const referredIds = (events as any[]).map((e: any) => e.referred_user_id);
      const { data: profiles } = await supabase
        .from("public_profiles")
        .select("user_id, full_name")
        .in("user_id", referredIds);

      // A referrer has no RLS access to another user's artisan_profiles row
      // (only "own row" and "admin" can read it -- it holds NIN, government
      // ID photos, home address, and reference contacts), so progress is
      // computed server-side and only the three booleans ever come back.
      const { data: progress } = await supabase.rpc("get_referral_verification_progress" as any, {
        _referred_user_ids: referredIds,
      });

      const profileMap = Object.fromEntries((profiles || []).map((p) => [p.user_id, p]));
      const artisanMap = Object.fromEntries(
        ((progress ?? []) as any[]).map((p) => [p.referred_user_id, p])
      );

      return (events as any[]).map((e: any) => ({
        ...e,
        referred_name: profileMap[e.referred_user_id]?.full_name || "User",
        artisan: artisanMap[e.referred_user_id] || null,
      }));
    },
    enabled: !!user,
  });

  const referralCode = profile?.referral_code ?? "";
  const referralLink = referralCode
    ? `${window.location.origin}/register?ref=${referralCode}`
    : "";
  const referralBalance = Number(wallet?.referral_balance ?? 0);
  const referralCount = referrals?.length ?? 0;

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast.success("Referral link copied!");
  };

  const shareWhatsApp = () => {
    const text = `Join me on Jobman — Nigeria's trusted artisan marketplace! Use my referral link to sign up: ${referralLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const shareInstagram = () => {
    navigator.clipboard.writeText(referralLink);
    toast.success("Link copied — paste it in your Instagram bio or story!");
  };

  const shareFacebook = () => {
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`,
      "_blank"
    );
  };

  const getVerificationProgress = (progress: any) => {
    if (!progress) return { steps: [], completed: 0, total: 3 };
    const steps = [
      {
        label: "ID Verification",
        done: !!progress.id_verification_done,
        icon: FileCheck,
      },
      {
        label: "Address Verification",
        done: !!progress.address_verification_done,
        icon: MapPin,
      },
      {
        label: "Reference Verification",
        done: !!progress.reference_verification_done,
        icon: UserCheck,
      },
    ];
    return { steps, completed: steps.filter((s) => s.done).length, total: 3 };
  };

  return (
    <div className="bg-card rounded-xl border border-border p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Gift className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="font-display font-semibold text-lg text-foreground">Referral Program</h2>
          <p className="text-xs text-muted-foreground">Earn ₦300 for every friend who completes verification</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-primary/5 rounded-lg p-3 border border-primary/10">
          <p className="text-xs text-muted-foreground mb-0.5">Referral Earnings</p>
          <p className="font-display font-bold text-lg text-primary">
            ₦{referralBalance.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-muted/50 rounded-lg p-3 border border-border">
          <p className="text-xs text-muted-foreground mb-0.5">Total Referrals</p>
          <div className="flex items-center gap-1.5">
            <Users className="w-4 h-4 text-foreground" />
            <p className="font-display font-bold text-lg text-foreground">{referralCount}</p>
          </div>
        </div>
      </div>

      {/* Referral link */}
      <div>
        <p className="text-xs text-muted-foreground mb-2 font-medium">Your referral link</p>
        <div className="flex gap-2">
          <div className="flex-1 bg-muted rounded-lg px-3 py-2 text-xs text-muted-foreground font-mono truncate border border-border">
            {referralLink || "Generating..."}
          </div>
          <Button size="sm" variant="outline" onClick={copyLink} disabled={!referralLink}>
            <Copy className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Your code */}
      {referralCode && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Your code:</span>
          <span className="font-mono font-bold text-sm bg-muted px-2 py-0.5 rounded border border-border text-foreground tracking-widest">
            {referralCode}
          </span>
          <button
            onClick={() => { navigator.clipboard.writeText(referralCode); toast.success("Code copied!"); }}
            className="text-primary hover:text-primary/80 transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Share buttons */}
      <div>
        <p className="text-xs text-muted-foreground mb-2 font-medium">Share via</p>
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            onClick={shareWhatsApp}
            disabled={!referralLink}
            className="bg-[hsl(142,70%,35%)] hover:bg-[hsl(142,70%,30%)] text-white border-0"
          >
            <Share2 className="w-3.5 h-3.5 mr-1.5" />
            WhatsApp
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={shareFacebook}
            disabled={!referralLink}
            className="border-[hsl(220,40%,50%)] text-[hsl(220,40%,50%)] hover:bg-[hsl(220,40%,50%)]/10"
          >
            <Share2 className="w-3.5 h-3.5 mr-1.5" />
            Facebook
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={shareInstagram}
            disabled={!referralLink}
            className="border-[hsl(310,60%,50%)] text-[hsl(310,60%,50%)] hover:bg-[hsl(310,60%,50%)]/10"
          >
            <Share2 className="w-3.5 h-3.5 mr-1.5" />
            Instagram
          </Button>
        </div>
      </div>

      {/* Referee progress tracking */}
      {referrals && referrals.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-2 font-medium">Referral Progress</p>
          <div className="space-y-3">
            {referrals.slice(0, 5).map((r: any) => {
              const progress = getVerificationProgress(r.artisan);
              const isCredited = r.referral_credited;
              const isExpanded = expandedReferral === r.id;
              return (
                <div key={r.id} className="bg-muted/50 rounded-lg border border-border p-3 space-y-2">
                  <div
                    className={`flex items-center justify-between ${!isCredited ? "cursor-pointer" : ""}`}
                    onClick={() => !isCredited && setExpandedReferral(isExpanded ? null : r.id)}
                  >
                    <p className="text-sm font-medium text-foreground">{r.referred_name}</p>
                    <div className="flex items-center gap-2">
                      {isCredited ? (
                        <Badge className="bg-primary/10 text-primary border-primary/30 text-[10px]">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Credited ₦{Number(r.reward_amount).toLocaleString()}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] cursor-pointer hover:bg-muted-foreground/20 transition-colors">
                          <Clock className="w-3 h-3 mr-1" />
                          Pending
                          {isExpanded ? (
                            <ChevronUp className="w-3 h-3 ml-1" />
                          ) : (
                            <ChevronDown className="w-3 h-3 ml-1" />
                          )}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {!isCredited && isExpanded && (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-start gap-1.5 text-[11px] text-muted-foreground bg-muted rounded-md p-2 border border-border">
                        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-primary" />
                        <span>Your ₦{Number(r.reward_amount).toLocaleString()} referral bonus will be credited once {r.referred_name} completes all verification steps below.</span>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {progress.steps.map((step) => {
                          const StepIcon = step.icon;
                          return (
                            <div
                              key={step.label}
                              className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-full border ${
                                step.done
                                  ? "bg-primary/10 text-primary border-primary/20"
                                  : "bg-muted text-muted-foreground border-border"
                              }`}
                            >
                              <StepIcon className="w-3 h-3" />
                              {step.done ? "✓" : "○"} {step.label.replace(" Verification", "")}
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {progress.completed}/{progress.total} steps completed
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReferralSection;
