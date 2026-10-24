import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import useEmblaCarousel from "embla-carousel-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import {
  MapPin, Briefcase, Sparkles, UserCircle, ArrowRight, ChevronLeft, ChevronRight, Loader2, Star,
} from "lucide-react";

const FeaturedArtisansSection = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    loop: true,
    skipSnaps: false,
    slidesToScroll: 1,
  });
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    setScrollSnaps(emblaApi.scrollSnapList());
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  // Auto-scroll
  useEffect(() => {
    if (!emblaApi) return;
    const interval = setInterval(() => {
      emblaApi.scrollNext();
    }, 4000);
    return () => clearInterval(interval);
  }, [emblaApi]);

  // Fetch boosted artisan IDs
  const { data: boostedIds } = useQuery({
    queryKey: ["boosted-artisans-home"],
    queryFn: async () => {
      const { data } = await supabase
        .from("active_profile_boosts" as any)
        .select("user_id");
      return new Set((data as any[])?.map((b: any) => b.user_id) ?? []);
    },
  });

  // Fetch approved public artisan profiles
  const { data: artisans, isLoading } = useQuery({
    queryKey: ["featured-artisans"],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("artisan_profiles_public" as any)
        .select("user_id, primary_trade, bio, years_experience, current_address_state, current_address_lga, portrait_url, verification_status, has_verification_docs")
        .limit(12) as any);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Fetch profile names
  const { data: profileMap } = useQuery({
    queryKey: ["featured-artisan-names", artisans?.map((a: any) => a.user_id)],
    queryFn: async () => {
      if (!artisans?.length) return {};
      const { data } = await supabase
        .from("public_profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", artisans.map((a: any) => a.user_id));
      const map: Record<string, { name: string; avatar: string | null }> = {};
      data?.forEach((p) => { map[p.user_id] = { name: p.full_name, avatar: p.avatar_url }; });
      return map;
    },
    enabled: !!artisans?.length,
  });

  // Fetch ratings
  const { data: ratingMap } = useQuery({
    queryKey: ["featured-artisan-ratings", artisans?.map((a: any) => a.user_id)],
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

  // Sort boosted first
  const sorted = artisans
    ?.sort((a: any, b: any) => {
      const aBoost = boostedIds?.has(a.user_id) ? 1 : 0;
      const bBoost = boostedIds?.has(b.user_id) ? 1 : 0;
      return bBoost - aBoost;
    }) ?? [];

  if (isLoading) {
    return (
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </section>
    );
  }

  if (sorted.length === 0) return null;

  return (
    <section className="py-20 lg:py-28 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <span className="text-sm font-semibold uppercase tracking-wider text-secondary">
              Top Professionals
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold mt-2 text-foreground">
              Featured Artisans
            </h2>
            <p className="text-muted-foreground mt-2 max-w-lg">
              Swipe through verified skilled professionals ready for your next project.
            </p>
          </motion.div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => emblaApi?.scrollPrev()}
              disabled={!canScrollPrev}
              className="w-10 h-10 rounded-full border border-border bg-card flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-30"
              aria-label="Previous"
            >
              <ChevronLeft className="w-5 h-5 text-foreground" />
            </button>
            <button
              onClick={() => emblaApi?.scrollNext()}
              disabled={!canScrollNext}
              className="w-10 h-10 rounded-full border border-border bg-card flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-30"
              aria-label="Next"
            >
              <ChevronRight className="w-5 h-5 text-foreground" />
            </button>
          </div>
        </div>

        {/* Carousel */}
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex gap-5">
            {sorted.map((artisan: any) => {
              const profile = profileMap?.[artisan.user_id];
              const rating = ratingMap?.[artisan.user_id];
              const isBoosted = boostedIds?.has(artisan.user_id);

              return (
                <div
                  key={artisan.user_id}
                  className="flex-[0_0_280px] sm:flex-[0_0_300px] min-w-0"
                >
                  <div
                    className={`bg-card rounded-xl border p-5 h-full transition-all hover:shadow-lg hover:-translate-y-1 ${
                      isBoosted
                        ? "border-primary/30 ring-1 ring-primary/10"
                        : "border-border"
                    }`}
                  >
                    {isBoosted && (
                      <div className="flex items-center gap-1 text-xs font-semibold text-primary mb-3">
                        <Sparkles className="w-3 h-3" />
                        Featured
                      </div>
                    )}

                    <div
                      className="flex flex-col items-center text-center group cursor-pointer"
                      onClick={() => user ? navigate(`/artisan/${artisan.user_id}`) : navigate("/register")}
                      role="link"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === "Enter" && (user ? navigate(`/artisan/${artisan.user_id}`) : navigate("/register"))}
                    >
                      <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center overflow-hidden mb-3 ring-2 ring-border group-hover:ring-primary/50 transition-all">
                        {(artisan.portrait_url || profile?.avatar) ? (
                          <img src={artisan.portrait_url || profile?.avatar || ""} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <UserCircle className="w-14 h-14 text-muted-foreground" />
                        )}
                      </div>

                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-display font-bold text-foreground group-hover:text-primary transition-colors">
                          {profile?.name?.split(" ")[0] || "Artisan"}
                        </h3>
                        {artisan.verification_status === "approved" ? (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30">
                            Verified
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                            Unverified
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                        <Briefcase className="w-3 h-3" />
                        {artisan.primary_trade}
                      </div>

                      {artisan.years_experience > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {artisan.years_experience}+ yrs experience
                        </span>
                      )}

                      {artisan.current_address_state && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <MapPin className="w-3 h-3" />
                          {artisan.current_address_lga ? `${artisan.current_address_lga}, ` : ""}
                          {artisan.current_address_state}
                        </div>
                      )}

                      {rating && (
                        <div className="flex items-center gap-0.5 mt-1 justify-center">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 ${i < Math.round(rating.avg) ? "fill-primary text-primary" : "fill-none text-muted-foreground/30"}`}
                            />
                          ))}
                          <span className="text-xs text-muted-foreground ml-1">({rating.count})</span>
                        </div>
                      )}

                      {artisan.bio && (
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{artisan.bio}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dots */}
        {scrollSnaps.length > 1 && (
          <div className="flex justify-center gap-1.5 mt-6">
            {scrollSnaps.map((_, i) => (
              <button
                key={i}
                onClick={() => emblaApi?.scrollTo(i)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  i === selectedIndex
                    ? "bg-primary w-6"
                    : "bg-border hover:bg-muted-foreground/40"
                }`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        )}

        <div className="text-center mt-8">
          <Button asChild size="lg" variant="outline" className="font-semibold">
            <Link to="/find-artisan">
              View All Artisans
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default FeaturedArtisansSection;
