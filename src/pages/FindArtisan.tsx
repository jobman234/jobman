import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/landing/Navbar";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import TrustScoreBadge from "@/components/job/TrustScoreBadge";
import SaveArtisanButton from "@/components/profile/SaveArtisanButton";
import { cn } from "@/lib/utils";
import {
  Search, MapPin, Star, Briefcase, Sparkles, Loader2, UserCircle, ArrowLeft,
} from "lucide-react";

const TRADES = [
  "All Trades",
  "Bricklaying & Masonry", "Painting & Finishing", "Electrical Work",
  "Plumbing", "Carpentry", "Welding & Fabrication", "Roofing",
  "Tiling & Flooring", "POP & Screeding", "Aluminium & Glass",
  "Iron Bending", "Contractor", "General Construction",
  "Engineer", "Architect", "Surveyor", "Quantity Surveyor",
  "Interior Design", "Landscaping", "HVAC", "Bathroom Fitting",
  "Fencing & Gates", "Solar Installation", "Waterproofing", "Doors & Windows",
];

const STATES = [
  "All States",
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue",
  "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT",
  "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi",
  "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo",
  "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara",
];

const FindArtisan = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTrade, setSelectedTrade] = useState("All Trades");
  const [selectedState, setSelectedState] = useState("All States");

  const isDefaultView = selectedTrade === "All Trades" && selectedState === "All States" && !searchQuery;

  // Fetch boosted artisans
  const { data: boostedIds } = useQuery({
    queryKey: ["boosted-artisans"],
    queryFn: async () => {
      const { data } = await supabase
        .from("active_profile_boosts" as any)
        .select("user_id");
      return new Set((data as any[])?.map((b: any) => b.user_id) ?? []);
    },
  });

  // Fetch approved public artisan profiles
  const { data: artisans, isLoading } = useQuery({
    queryKey: ["find-artisans", selectedTrade, selectedState, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from("artisan_profiles_public" as any)
        .select("user_id, primary_trade, bio, years_experience, current_address_state, current_address_lga, portrait_url, verification_status, has_verification_docs") as any;

      if (selectedTrade !== "All Trades") {
        query = query.eq("primary_trade", selectedTrade);
      }
      if (selectedState !== "All States") {
        query = query.eq("current_address_state", selectedState);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  // Fetch profiles for names
  const { data: profileMap } = useQuery({
    queryKey: ["artisan-profile-names", artisans?.map((a) => a.user_id)],
    queryFn: async () => {
      if (!artisans?.length) return {};
      const { data } = await supabase
        .from("public_profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", artisans.map((a) => a.user_id));
      const map: Record<string, { name: string; avatar: string | null }> = {};
      data?.forEach((p) => { map[p.user_id] = { name: p.full_name, avatar: p.avatar_url }; });
      return map;
    },
    enabled: !!artisans?.length,
  });

  // Fetch average ratings
  const { data: ratingMap } = useQuery({
    queryKey: ["artisan-ratings", artisans?.map((a) => a.user_id)],
    queryFn: async () => {
      if (!artisans?.length) return {};
      const { data } = await supabase
        .from("reviews")
        .select("reviewee_id, rating");
      const map: Record<string, { avg: number; count: number }> = {};
      data?.forEach((r) => {
        if (!map[r.reviewee_id]) map[r.reviewee_id] = { avg: 0, count: 0 };
        map[r.reviewee_id].count++;
        map[r.reviewee_id].avg += r.rating;
      });
      Object.keys(map).forEach((k) => {
        map[k].avg = Math.round((map[k].avg / map[k].count) * 10) / 10;
      });
      return map;
    },
    enabled: !!artisans?.length,
  });

  // Filter by search query and sort boosted first
  const filtered = artisans
    ?.filter((a) => {
      if (!searchQuery) return true;
      const name = profileMap?.[a.user_id]?.name?.toLowerCase() || "";
      const trade = a.primary_trade.toLowerCase();
      const q = searchQuery.toLowerCase();
      return name.includes(q) || trade.includes(q);
    })
    .sort((a, b) => {
      const aBoost = boostedIds?.has(a.user_id) ? 1 : 0;
      const bBoost = boostedIds?.has(b.user_id) ? 1 : 0;
      return bBoost - aBoost;
    }) ?? [];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-12">
        <div className="max-w-4xl mx-auto">
          <button onClick={() => window.history.back()} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-2">Find an Artisan</h1>
          <p className="text-muted-foreground mb-6">
            {isDefaultView
              ? "Select a state or trade to browse artisans, or view our featured professionals below."
              : "Browse skilled professionals near you."}
          </p>

          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or trade..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedTrade} onValueChange={setSelectedTrade}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRADES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedState} onValueChange={setSelectedState}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Results */}
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <UserCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                {isDefaultView
                  ? "No featured artisans at the moment. Select a state or trade to browse all artisans."
                  : "No artisans found matching your criteria."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filtered.map((artisan) => {
                const profile = profileMap?.[artisan.user_id];
                const rating = ratingMap?.[artisan.user_id];
                const isBoosted = boostedIds?.has(artisan.user_id);

                return (
                  <Link
                    to={`/artisan/${artisan.user_id}`}
                    key={artisan.user_id}
                    className={cn(
                      "relative bg-card rounded-xl border p-5 transition-all hover:shadow-md block",
                      isBoosted
                        ? "border-primary/30 ring-1 ring-primary/10"
                        : "border-border"
                    )}
                  >
                    {/* Clicking save shouldn't also navigate into the card's own link */}
                    <div
                      className="absolute top-3 right-3 z-10"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      <SaveArtisanButton artisanUserId={artisan.user_id} iconOnly />
                    </div>

                    {isBoosted && (
                      <div className="flex items-center gap-1 text-xs font-semibold text-primary mb-2">
                        <Sparkles className="w-3 h-3" />
                        Featured Artisan
                      </div>
                    )}

                    <div className="flex items-start gap-3">
                      <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center shrink-0 overflow-hidden ring-2 ring-border">
                        {(() => {
                          const imgUrl = artisan.portrait_url || profile?.avatar;
                          if (imgUrl) {
                            return (
                              <img 
                                src={imgUrl} 
                                alt={profile?.name || "Artisan"} 
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.parentElement?.querySelector('.fallback-icon')?.classList.remove('hidden');
                                }}
                              />
                            );
                          }
                          return null;
                        })()}
                        <UserCircle className={cn("w-12 h-12 text-muted-foreground fallback-icon", (artisan.portrait_url || profile?.avatar) && "hidden")} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-display font-bold text-foreground truncate">
                            {profile?.name?.split(" ")[0] || "Artisan"}
                          </h3>
                          <TrustScoreBadge userId={artisan.user_id} size="sm" />
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Briefcase className="w-3 h-3" /> {artisan.primary_trade}
                          </span>
                          {artisan.years_experience && artisan.years_experience > 0 && (
                            <span>{artisan.years_experience}+ yrs exp</span>
                          )}
                          {artisan.current_address_state && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {artisan.current_address_lga ? `${artisan.current_address_lga}, ` : ""}
                              {artisan.current_address_state}
                            </span>
                          )}
                        </div>
                        {rating && (
                          <div className="flex items-center gap-1 mt-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3 h-3 ${i < Math.round(rating.avg) ? "fill-primary text-primary" : "fill-none text-muted-foreground/40"}`}
                              />
                            ))}
                            <span className="text-xs text-muted-foreground ml-0.5">({rating.count})</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {artisan.bio && (
                      <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{artisan.bio}</p>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default FindArtisan;
