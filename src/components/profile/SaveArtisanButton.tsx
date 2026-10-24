import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Heart, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SaveArtisanButtonProps {
  artisanUserId: string;
  className?: string;
  /** Compact circular icon button, for placing in a corner of a card. */
  iconOnly?: boolean;
}

const SaveArtisanButton = ({ artisanUserId, className, iconOnly }: SaveArtisanButtonProps) => {
  const { user, userRole } = useAuth();
  const queryClient = useQueryClient();

  const { data: isSaved, isLoading } = useQuery({
    queryKey: ["is-artisan-saved", user?.id, artisanUserId],
    queryFn: async () => {
      const { data } = await supabase
        .from("saved_artisans" as any)
        .select("id")
        .eq("user_id", user!.id)
        .eq("artisan_user_id", artisanUserId)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user && userRole === "customer",
  });

  const toggle = useMutation({
    mutationFn: async () => {
      if (isSaved) {
        const { error } = await supabase
          .from("saved_artisans" as any)
          .delete()
          .eq("user_id", user!.id)
          .eq("artisan_user_id", artisanUserId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("saved_artisans" as any)
          .insert({ user_id: user!.id, artisan_user_id: artisanUserId } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["is-artisan-saved", user?.id, artisanUserId] });
      queryClient.invalidateQueries({ queryKey: ["saved-artisans"] });
      toast.success(isSaved ? "Removed from saved artisans" : "Saved — find them later from your dashboard");
    },
    onError: () => toast.error("Could not update saved artisans"),
  });

  // Saving is a customer action; artisans browsing other artisans, or a
  // signed-out visitor, don't get the button at all.
  if (!user || userRole !== "customer") return null;

  if (iconOnly) {
    return (
      <Button
        type="button"
        variant="outline"
        size="icon"
        disabled={isLoading || toggle.isPending}
        onClick={() => toggle.mutate()}
        aria-label={isSaved ? "Remove from saved artisans" : "Save artisan"}
        className={cn(
          "h-8 w-8 rounded-full bg-card/90 backdrop-blur-sm shadow-sm",
          isSaved && "border-primary/40 text-primary hover:text-primary",
          className
        )}
      >
        {toggle.isPending ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Heart className={cn("w-3.5 h-3.5", isSaved && "fill-primary")} />
        )}
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={isLoading || toggle.isPending}
      onClick={() => toggle.mutate()}
      className={cn("gap-1.5", isSaved && "border-primary/40 text-primary hover:text-primary", className)}
    >
      {toggle.isPending ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Heart className={cn("w-3.5 h-3.5", isSaved && "fill-primary")} />
      )}
      {isSaved ? "Saved" : "Save"}
    </Button>
  );
};

export default SaveArtisanButton;
