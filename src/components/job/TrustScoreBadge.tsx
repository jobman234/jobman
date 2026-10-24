import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrustScoreBadgeProps {
  userId: string;
  size?: "sm" | "md";
}

// Convert 0-100 trust score to 1-5 star rating
const scoreToStars = (score: number) => Math.max(1, Math.min(5, Math.round((score / 100) * 4 + 1)));

const TrustScoreBadge = ({ userId, size = "sm" }: TrustScoreBadgeProps) => {
  const { data: score } = useQuery({
    queryKey: ["trust-score", userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("calculate_trust_score" as any, { _user_id: userId });
      if (error) return null;
      return Number(data);
    },
    enabled: !!userId,
  });

  if (score === null || score === undefined) return null;

  const stars = scoreToStars(score);
  const getColor = () => {
    if (score >= 70) return "text-primary";
    if (score >= 40) return "text-warning";
    return "text-muted-foreground";
  };

  return (
    <div className={cn("inline-flex items-center gap-0.5", getColor())}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            size === "sm" ? "w-3 h-3" : "w-4 h-4",
            i < stars ? "fill-current" : "fill-none opacity-30"
          )}
        />
      ))}
    </div>
  );
};

export default TrustScoreBadge;
