import { Navigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/landing/Navbar";
import SaveArtisanButton from "@/components/profile/SaveArtisanButton";
import TrustScoreBadge from "@/components/job/TrustScoreBadge";
import { Loader2, Briefcase, MapPin, UserCircle, ArrowLeft, Heart, ShieldCheck } from "lucide-react";

const SavedArtisans = () => {
  const { user, userRole, loading: authLoading } = useAuth();

  const { data: saved, isLoading } = useQuery({
    queryKey: ["saved-artisans", user?.id],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("saved_artisans" as any)
        .select("id, artisan_user_id, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (!rows?.length) return [];

      const artisanIds = (rows as any[]).map((r) => r.artisan_user_id);

      const { data: artisans } = await supabase
        .from("artisan_profiles_public" as any)
        .select("user_id, primary_trade, bio, years_experience, portrait_url, verification_status, current_address_state, current_address_lga")
        .in("user_id", artisanIds);

      const { data: profiles } = await supabase
        .from("public_profiles")
        .select("user_id, full_name, avatar_url, state, lga")
        .in("user_id", artisanIds);

      const artisanMap = Object.fromEntries((artisans ?? []).map((a: any) => [a.user_id, a]));
      const profileMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.user_id, p]));

      return (rows as any[]).map((r) => ({
        savedId: r.id,
        artisanUserId: r.artisan_user_id,
        savedAt: r.created_at,
        artisan: artisanMap[r.artisan_user_id] ?? null,
        profile: profileMap[r.artisan_user_id] ?? null,
      }));
    },
    enabled: !!user && userRole === "customer",
  });

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (userRole !== "customer") return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-12">
        <div className="max-w-3xl mx-auto">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </Link>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-6">Saved Artisans</h1>

          {!saved?.length ? (
            <div className="text-center py-16 bg-card rounded-2xl border border-border">
              <Heart className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">No saved artisans yet</p>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                Save artisans you like while browsing so you can find them again.
              </p>
              <Link
                to="/find-artisan"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
              >
                Browse artisans
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {saved.map((entry) => {
                const name = entry.profile?.full_name?.split(" ")[0] || "Artisan";
                const isVerified = entry.artisan?.verification_status === "approved";
                return (
                  <div
                    key={entry.savedId}
                    className="bg-card rounded-xl border border-border p-4 sm:p-5 flex items-start gap-3"
                  >
                    <Link
                      to={`/artisan/${entry.artisanUserId}`}
                      className="w-16 h-16 rounded-full bg-muted flex items-center justify-center overflow-hidden ring-2 ring-border shrink-0"
                    >
                      {(entry.artisan?.portrait_url || entry.profile?.avatar_url) ? (
                        <img
                          src={entry.artisan?.portrait_url || entry.profile?.avatar_url}
                          alt={name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <UserCircle className="w-10 h-10 text-muted-foreground" />
                      )}
                    </Link>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <Link to={`/artisan/${entry.artisanUserId}`} className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="font-display font-semibold text-foreground truncate">{name}</h2>
                            <TrustScoreBadge userId={entry.artisanUserId} size="sm" />
                            {isVerified && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30 shrink-0">
                                <ShieldCheck className="w-3 h-3" />
                                Verified
                              </span>
                            )}
                          </div>
                        </Link>
                        <SaveArtisanButton artisanUserId={entry.artisanUserId} />
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                        {entry.artisan?.primary_trade && (
                          <span className="flex items-center gap-1">
                            <Briefcase className="w-3.5 h-3.5" /> {entry.artisan.primary_trade}
                          </span>
                        )}
                        {(entry.artisan?.current_address_state || entry.profile?.state) && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {entry.profile?.lga ? `${entry.profile.lga}, ` : ""}
                            {entry.profile?.state}
                          </span>
                        )}
                      </div>

                      {entry.artisan?.bio && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{entry.artisan.bio}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default SavedArtisans;
