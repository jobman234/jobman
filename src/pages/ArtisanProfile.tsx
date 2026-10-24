import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/landing/Navbar";
import { Button } from "@/components/ui/button";
import TrustScoreBadge from "@/components/job/TrustScoreBadge";
import SaveArtisanButton from "@/components/profile/SaveArtisanButton";
import {
  Loader2, MapPin, Briefcase, UserCircle, ArrowLeft, Star, ShieldCheck, ShieldAlert,
  Clock, Play, X, ChevronLeft, ChevronRight,
} from "lucide-react";

const ArtisanProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user, userRole } = useAuth();

  const [lightbox, setLightbox] = useState<{ items: string[]; index: number } | null>(null);

  const { data: artisan, isLoading } = useQuery({
    queryKey: ["public-artisan", userId],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("artisan_profiles_public" as any)
        .select("*")
        .eq("user_id", userId)
        .maybeSingle() as any);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const { data: profile } = useQuery({
    queryKey: ["public-artisan-profile", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("public_profiles")
        .select("user_id, full_name, avatar_url, state, lga")
        .eq("user_id", userId!)
        .maybeSingle();
      return data;
    },
    enabled: !!userId,
  });

  const { data: reviews } = useQuery({
    queryKey: ["artisan-reviews", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("reviews")
        .select("rating, comment, created_at, reviewer_id")
        .eq("reviewee_id", userId!)
        .order("created_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
    enabled: !!userId,
  });

  const { data: reviewerNames } = useQuery({
    queryKey: ["reviewer-names", reviews?.map((r) => r.reviewer_id)],
    queryFn: async () => {
      if (!reviews?.length) return {};
      const { data } = await supabase
        .from("public_profiles")
        .select("user_id, full_name")
        .in("user_id", reviews.map((r) => r.reviewer_id));
      const map: Record<string, string> = {};
      data?.forEach((p) => { map[p.user_id] = p.full_name; });
      return map;
    },
    enabled: !!reviews?.length,
  });

  const avgRating = reviews?.length
    ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
    : null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center pt-32">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!artisan) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 pt-24 pb-12 text-center">
          <UserCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="font-display text-2xl font-bold text-foreground mb-2">Artisan Not Found</h1>
          <p className="text-muted-foreground mb-6">This profile may no longer be available.</p>
          <Button asChild variant="outline">
            <Link to="/find-artisan">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Browse Artisans
            </Link>
          </Button>
        </main>
      </div>
    );
  }

  const firstName = profile?.full_name?.split(" ")[0] || "Artisan";
  const isVerified = artisan.verification_status === "approved";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-12">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          {/* Profile header */}
          <div className="bg-card rounded-2xl border border-border p-6 sm:p-8 mb-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-muted flex items-center justify-center overflow-hidden ring-4 ring-border shrink-0">
                {(artisan.portrait_url || profile?.avatar_url) ? (
                  <img src={artisan.portrait_url || profile?.avatar_url || ""} alt={firstName} className="w-full h-full object-cover" />
                ) : (
                  <UserCircle className="w-20 h-20 text-muted-foreground" />
                )}
              </div>

              <div className="flex-1 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap mb-2">
                  <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
                    {firstName}
                  </h1>
                  <TrustScoreBadge userId={artisan.user_id} size="sm" />
                  {isVerified ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30">
                      <ShieldCheck className="w-3 h-3" />
                      Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                      <ShieldAlert className="w-3 h-3" />
                      Unverified
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1 text-sm text-muted-foreground mb-3">
                  <span className="inline-flex items-center gap-1">
                    <Briefcase className="w-4 h-4" />
                    {artisan.primary_trade}
                  </span>
                  {artisan.years_experience > 0 && (
                    <span>{artisan.years_experience}+ yrs experience</span>
                  )}
                </div>

                {(artisan.current_address_state || profile?.state) && (
                  <div className="flex items-center justify-center sm:justify-start gap-1 text-sm text-muted-foreground mb-3">
                    <MapPin className="w-4 h-4" />
                    {artisan.current_address_lga || profile?.lga
                      ? `${artisan.current_address_lga || profile?.lga}, `
                      : ""}
                    {artisan.current_address_state || profile?.state}
                  </div>
                )}

                {avgRating !== null && (
                  <div className="flex items-center justify-center sm:justify-start gap-1.5 mb-3">
                    <Star className="w-4 h-4 fill-primary text-primary" />
                    <span className="text-sm font-semibold text-foreground">{avgRating}</span>
                    <span className="text-sm text-muted-foreground">({reviews?.length} review{reviews?.length !== 1 ? "s" : ""})</span>
                  </div>
                )}

                {/* CTA */}
                {!user && (
                  <Button asChild className="bg-gradient-hero text-primary-foreground hover:opacity-90">
                    <Link to="/register?role=customer">Sign Up to Request {firstName} via Jobman</Link>
                  </Button>
                )}
                {user && userRole === "customer" && (
                  <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                    <Button asChild className="bg-gradient-hero text-primary-foreground hover:opacity-90">
                      <Link to="/assistant">
                        Request {firstName} via Jobman
                      </Link>
                    </Button>
                    <SaveArtisanButton artisanUserId={artisan.user_id} />
                  </div>
                )}
                {user && userRole === "artisan" && (
                  <p className="text-sm text-muted-foreground italic">Artisans cannot hire other artisans.</p>
                )}
              </div>
            </div>
          </div>

          {/* Bio */}
          {artisan.bio && (
            <div className="bg-card rounded-2xl border border-border p-6 mb-6">
              <h2 className="font-display font-semibold text-lg text-foreground mb-3">About</h2>
              <p className="text-muted-foreground leading-relaxed">{artisan.bio}</p>
            </div>
          )}

          {/* Portfolio: Photos + Videos */}
          {((artisan.work_photo_url) || (artisan.job_photos?.length > 0) || (artisan.job_videos?.length > 0)) && (
            <div className="bg-card rounded-2xl border border-border p-6 mb-6">
              <h2 className="font-display font-semibold text-lg text-foreground mb-4">Work Portfolio</h2>

              {/* Photos */}
              {((artisan.work_photo_url) || artisan.job_photos?.length > 0) && (() => {
                const allPhotos = [
                  ...(artisan.work_photo_url ? [artisan.work_photo_url] : []),
                  ...(artisan.job_photos ?? []),
                ];
                return (
                  <div className="mb-4">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Photos</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {allPhotos.map((url: string, i: number) => (
                        <button
                          key={i}
                          onClick={() => setLightbox({ items: allPhotos, index: i })}
                          className="relative group rounded-lg overflow-hidden aspect-square border border-border"
                        >
                          <img src={url} alt={`Work ${i + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                          <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/10 transition-colors" />
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Videos */}
              {artisan.job_videos?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Videos</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {artisan.job_videos.map((url: string, i: number) => (
                      <div key={i} className="rounded-lg overflow-hidden border border-border bg-muted">
                        <video src={url} controls className="w-full aspect-video object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Photo Lightbox */}
          {lightbox && (
            <div
              className="fixed inset-0 z-50 bg-foreground/90 flex items-center justify-center p-4"
              onClick={() => setLightbox(null)}
            >
              <button
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-background/20 text-background flex items-center justify-center hover:bg-background/30"
                onClick={() => setLightbox(null)}
              >
                <X className="w-5 h-5" />
              </button>
              {lightbox.index > 0 && (
                <button
                  className="absolute left-4 w-10 h-10 rounded-full bg-background/20 text-background flex items-center justify-center hover:bg-background/30"
                  onClick={(e) => { e.stopPropagation(); setLightbox((l) => l && ({ ...l, index: l.index - 1 })); }}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
              <img
                src={lightbox.items[lightbox.index]}
                alt="Portfolio"
                className="max-w-full max-h-[80vh] rounded-xl object-contain"
                onClick={(e) => e.stopPropagation()}
              />
              {lightbox.index < lightbox.items.length - 1 && (
                <button
                  className="absolute right-4 w-10 h-10 rounded-full bg-background/20 text-background flex items-center justify-center hover:bg-background/30"
                  onClick={(e) => { e.stopPropagation(); setLightbox((l) => l && ({ ...l, index: l.index + 1 })); }}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}
              <p className="absolute bottom-6 text-background/70 text-sm">
                {lightbox.index + 1} / {lightbox.items.length}
              </p>
            </div>
          )}

          {/* Reviews */}
          <div className="bg-card rounded-2xl border border-border p-6">
            <h2 className="font-display font-semibold text-lg text-foreground mb-4">
              Reviews {reviews?.length ? `(${reviews.length})` : ""}
            </h2>
            {!reviews?.length ? (
              <p className="text-sm text-muted-foreground">No reviews yet.</p>
            ) : (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div key={review.created_at} className="border-b border-border pb-4 last:border-0 last:pb-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${i < review.rating ? "fill-primary text-primary" : "text-border"}`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        by {reviewerNames?.[review.reviewer_id]?.split(" ")[0] || "Customer"}
                      </span>
                    </div>
                    {review.comment && (
                      <p className="text-sm text-muted-foreground">{review.comment}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(review.created_at).toLocaleDateString("en-NG", { year: "numeric", month: "short", day: "numeric" })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ArtisanProfile;
