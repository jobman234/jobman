import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

const ProfileVisibilityToggle = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: artisanProfile, isLoading } = useQuery({
    queryKey: ["artisan-visibility", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("artisan_profiles")
        .select("is_public")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const mutation = useMutation({
    mutationFn: async (isPublic: boolean) => {
      const { error } = await supabase
        .from("artisan_profiles")
        .update({ is_public: isPublic })
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: (_, isPublic) => {
      queryClient.invalidateQueries({ queryKey: ["artisan-visibility"] });
      queryClient.invalidateQueries({ queryKey: ["artisan-profile"] });
      toast.success(
        isPublic
          ? "Profile is now public — you appear in search results"
          : "Profile is now private — you won't appear in search results"
      );
    },
    onError: () => toast.error("Failed to update visibility"),
  });

  const isPublic = artisanProfile?.is_public ?? true;

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isPublic ? "bg-primary/10" : "bg-muted"}`}>
            {isPublic
              ? <Eye className="w-5 h-5 text-primary" />
              : <EyeOff className="w-5 h-5 text-muted-foreground" />
            }
          </div>
          <div>
            <h2 className="font-display font-semibold text-base text-foreground">
              Profile Visibility
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isPublic
                ? "Your profile is public and visible in search results"
                : "Your profile is private and hidden from search results"
              }
            </p>
          </div>
        </div>
        <Switch
          checked={isPublic}
          disabled={isLoading || mutation.isPending}
          onCheckedChange={(checked) => mutation.mutate(checked)}
        />
      </div>
    </div>
  );
};

export default ProfileVisibilityToggle;
