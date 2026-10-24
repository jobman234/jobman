import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  Loader2, Users, HardHat, ShieldCheck, Clock, Briefcase, Wallet, Scale, Gift, TrendingUp,
} from "lucide-react";
import AdminOverviewDetailDialog, { type DetailType } from "./AdminOverviewDetailDialog";

const AdminOverview = () => {
  const [activeDetail, setActiveDetail] = useState<DetailType>(null);

  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: async () => {
      const [profilesRes, rolesRes, artisansRes, jobsRes, walletsRes, disputesRes, referralsRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("user_roles").select("role"),
        supabase.from("artisan_profiles").select("verification_status"),
        supabase.from("jobs").select("status"),
        supabase.from("wallets").select("balance"),
        supabase.from("disputes").select("status"),
        supabase.from("referral_events").select("reward_amount, referral_credited"),
      ]);

      const roles = rolesRes.data || [];
      const artisans = artisansRes.data || [];
      const jobs = jobsRes.data || [];
      const wallets = walletsRes.data || [];
      const disputes = disputesRes.data || [];
      const referrals = (referralsRes.data || []) as any[];

      return {
        totalUsers: profilesRes.count ?? 0,
        customers: roles.filter((r) => r.role === "customer").length,
        artisans: roles.filter((r) => r.role === "artisan").length,
        pendingVerifications: artisans.filter((a) => a.verification_status === "pending").length,
        approvedArtisans: artisans.filter((a) => a.verification_status === "approved").length,
        openJobs: jobs.filter((j) => j.status === "open").length,
        totalJobs: jobs.length,
        totalWalletBalance: wallets.reduce((sum, w) => sum + Number(w.balance), 0),
        openDisputes: disputes.filter((d) => d.status === "open" || d.status === "under_review").length,
        totalDisputes: disputes.length,
        totalReferrals: referrals.length,
        totalRewardsPaid: referrals.filter((r) => r.referral_credited).reduce((sum, r) => sum + Number(r.reward_amount), 0),
        pendingRewards: referrals.filter((r) => !r.referral_credited).length,
      };
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!stats) return null;

  const cards: { label: string; value: string | number; icon: any; color: string; bg: string; detailType: DetailType }[] = [
    { label: "Total Users", value: stats.totalUsers, icon: Users, color: "text-foreground", bg: "bg-muted", detailType: "totalUsers" },
    { label: "Customers", value: stats.customers, icon: Users, color: "text-info", bg: "bg-info/10", detailType: "customers" },
    { label: "Artisans", value: stats.artisans, icon: HardHat, color: "text-primary", bg: "bg-primary/10", detailType: "artisans" },
    { label: "Pending Verifications", value: stats.pendingVerifications, icon: Clock, color: "text-warning", bg: "bg-warning/10", detailType: "pendingVerifications" },
    { label: "Verified Artisans", value: stats.approvedArtisans, icon: ShieldCheck, color: "text-primary", bg: "bg-primary/10", detailType: "approvedArtisans" },
    { label: "Open Jobs", value: stats.openJobs, icon: Briefcase, color: "text-accent", bg: "bg-accent/10", detailType: "openJobs" },
    { label: "Total Jobs", value: stats.totalJobs, icon: Briefcase, color: "text-foreground", bg: "bg-muted", detailType: "totalJobs" },
    { label: "Total Wallet Balance", value: `₦${stats.totalWalletBalance.toLocaleString()}`, icon: Wallet, color: "text-primary", bg: "bg-primary/10", detailType: "totalWalletBalance" },
    { label: "Open Disputes", value: stats.openDisputes, icon: Scale, color: "text-destructive", bg: "bg-destructive/10", detailType: "openDisputes" },
    { label: "Total Disputes", value: stats.totalDisputes, icon: Scale, color: "text-foreground", bg: "bg-muted", detailType: "totalDisputes" },
  ];

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.label}
              onClick={() => setActiveDetail(card.detailType)}
              className="bg-card rounded-xl border border-border p-4 text-left transition-all hover:shadow-md hover:border-primary/30 cursor-pointer"
            >
              <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center mb-2", card.bg)}>
                <Icon className={cn("w-5 h-5", card.color)} />
              </div>
              <p className="font-display text-2xl font-bold text-foreground">{card.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{card.label}</p>
            </button>
          );
        })}
      </div>

      {/* Referral Statistics */}
      <div className="mt-6">
        <h2 className="font-display font-semibold text-lg text-foreground mb-3 flex items-center gap-2">
          <Gift className="w-5 h-5 text-primary" />
          Referral Statistics
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-2 bg-primary/10">
              <Gift className="w-5 h-5 text-primary" />
            </div>
            <p className="font-display text-2xl font-bold text-foreground">{stats.totalReferrals}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Total Referrals</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-2 bg-primary/10">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <p className="font-display text-2xl font-bold text-foreground">₦{stats.totalRewardsPaid.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Total Rewards Paid</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-2 bg-warning/10">
              <Clock className="w-5 h-5 text-warning" />
            </div>
            <p className="font-display text-2xl font-bold text-foreground">{stats.pendingRewards}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Pending Rewards</p>
          </div>
        </div>
      </div>

      {/* Top Referrers */}
      <TopReferrers />

      <AdminOverviewDetailDialog type={activeDetail} onClose={() => setActiveDetail(null)} />
    </>
  );
};

const TopReferrers = () => {
  const { data: topReferrers, isLoading } = useQuery({
    queryKey: ["admin-top-referrers"],
    queryFn: async () => {
      const { data: events } = await supabase
        .from("referral_events")
        .select("referrer_id, reward_amount, referral_credited");

      if (!events || events.length === 0) return [];

      // Group by referrer
      const referrerMap: Record<string, { total: number; credited: number; totalAmount: number }> = {};
      (events as any[]).forEach((e: any) => {
        if (!referrerMap[e.referrer_id]) {
          referrerMap[e.referrer_id] = { total: 0, credited: 0, totalAmount: 0 };
        }
        referrerMap[e.referrer_id].total++;
        if (e.referral_credited) {
          referrerMap[e.referrer_id].credited++;
          referrerMap[e.referrer_id].totalAmount += Number(e.reward_amount);
        }
      });

      const sorted = Object.entries(referrerMap)
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 5);

      const referrerIds = sorted.map(([id]) => id);
      const { data: profiles } = referrerIds.length
        ? await supabase.from("profiles").select("user_id, full_name, email").in("user_id", referrerIds)
        : { data: [] };

      const profileMap = Object.fromEntries((profiles || []).map((p) => [p.user_id, p]));

      return sorted.map(([id, stats]) => ({
        user_id: id,
        full_name: profileMap[id]?.full_name || "—",
        email: profileMap[id]?.email || "—",
        ...stats,
      }));
    },
  });

  if (isLoading || !topReferrers || topReferrers.length === 0) return null;

  return (
    <div className="mt-4">
      <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
        <TrendingUp className="w-4 h-4 text-primary" />
        Top Referrers
      </h3>
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left px-4 py-2 font-semibold text-foreground">#</th>
              <th className="text-left px-4 py-2 font-semibold text-foreground">Name</th>
              <th className="text-left px-4 py-2 font-semibold text-foreground">Referrals</th>
              <th className="text-left px-4 py-2 font-semibold text-foreground">Earned</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {topReferrers.map((r, i) => (
              <tr key={r.user_id} className="hover:bg-muted/30">
                <td className="px-4 py-2 text-muted-foreground">{i + 1}</td>
                <td className="px-4 py-2">
                  <p className="font-medium text-foreground">{r.full_name}</p>
                  <p className="text-xs text-muted-foreground">{r.email}</p>
                </td>
                <td className="px-4 py-2">
                  <span className="font-medium">{r.total}</span>
                  <span className="text-xs text-muted-foreground ml-1">({r.credited} credited)</span>
                </td>
                <td className="px-4 py-2 font-medium text-primary">₦{r.totalAmount.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminOverview;
