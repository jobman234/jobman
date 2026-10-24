import { useState, useRef, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/landing/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import ArtisanPortfolio from "@/components/profile/ArtisanPortfolio";
import NotificationPreferences from "@/components/dashboard/NotificationPreferences";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Loader2, Camera, User, Mail, Phone, MapPin, Save, Briefcase, ArrowLeft,
} from "lucide-react";
import { isValidPostcode, formatPostcode, POSTCODE_PLACEHOLDER } from "@/lib/postcode";

const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue",
  "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT",
  "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi",
  "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo",
  "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara",
];

const ProfileSettings = () => {
  const { user, loading: authLoading, userRole } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [state, setState] = useState("");
  const [lga, setLga] = useState("");
  const [postcode, setPostcode] = useState("");
  const [bio, setBio] = useState("");
  const [uploading, setUploading] = useState(false);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: artisanProfile } = useQuery({
    queryKey: ["artisan-profile-settings", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("artisan_profiles")
        .select("bio, primary_trade, years_experience")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user && userRole === "artisan",
  });

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setPhone(profile.phone || "");
      setState(profile.state || "");
      setLga(profile.lga || "");
      setPostcode(profile.postcode || "");
    }
  }, [profile]);

  useEffect(() => {
    if (artisanProfile) {
      setBio(artisanProfile.bio || "");
    }
  }, [artisanProfile]);

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      if (!isValidPostcode(postcode)) {
        throw new Error("Enter a valid postcode, e.g. ED9 1AA");
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          state: state || null,
          lga: lga.trim() || null,
          postcode: formatPostcode(postcode),
        })
        .eq("user_id", user!.id);
      if (error) throw error;

      if (userRole === "artisan" && artisanProfile) {
        const { error: artErr } = await supabase
          .from("artisan_profiles")
          .update({ bio: bio.trim() || null })
          .eq("user_id", user!.id);
        if (artErr) throw artErr;
      }
    },
    onSuccess: () => {
      toast.success("Profile updated!");
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["artisan-profile-settings"] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to update profile"),
  });

  const handleAvatarUpload = async (file: File) => {
    if (!user) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2MB");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/avatar.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);

      const { error: updateErr } = await supabase
        .from("profiles")
        .update({ avatar_url: `${urlData.publicUrl}?t=${Date.now()}` })
        .eq("user_id", user.id);
      if (updateErr) throw updateErr;

      toast.success("Avatar updated!");
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to upload avatar");
    } finally {
      setUploading(false);
    }
  };

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-12">
        <div className="max-w-xl mx-auto">
          <button onClick={() => window.history.back()} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-8">Profile Settings</h1>

          {/* Avatar */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full bg-muted border-2 border-border overflow-hidden flex items-center justify-center">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-10 h-10 text-muted-foreground" />
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className={cn(
                  "absolute inset-0 rounded-full flex items-center justify-center bg-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity",
                  uploading && "opacity-100"
                )}
              >
                {uploading ? (
                  <Loader2 className="w-5 h-5 text-background animate-spin" />
                ) : (
                  <Camera className="w-5 h-5 text-background" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleAvatarUpload(e.target.files[0])}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Click to change avatar</p>
          </div>

          {/* Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateProfileMutation.mutate();
            }}
            className="bg-card rounded-2xl border border-border p-6 sm:p-8 shadow-sm space-y-5"
          >
            <div>
              <Label>Full Name</Label>
              <div className="relative mt-1.5">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={fullName}
                  className="pl-10 bg-muted"
                  disabled
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Name cannot be changed</p>
            </div>

            <div>
              <Label>Email</Label>
              <div className="relative mt-1.5">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={profile?.email || user.email || ""}
                  className="pl-10 bg-muted"
                  disabled
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Email cannot be changed here</p>
            </div>

            <div>
              <Label>Phone</Label>
              <div className="relative mt-1.5">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={phone}
                  className="pl-10 bg-muted"
                  disabled
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Phone number cannot be changed</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>State</Label>
                <Select value={state} onValueChange={setState}>
                  <SelectTrigger className="mt-1.5">
                    <MapPin className="w-4 h-4 text-muted-foreground mr-2" />
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {NIGERIAN_STATES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="lga">LGA</Label>
                <Input
                  id="lga"
                  value={lga}
                  onChange={(e) => setLga(e.target.value)}
                  placeholder="Local Government Area"
                  className="mt-1.5"
                  maxLength={100}
                />
              </div>
              <div>
                <Label htmlFor="postcode">Postcode *</Label>
                <Input
                  id="postcode"
                  value={postcode}
                  onChange={(e) => setPostcode(e.target.value.toUpperCase().slice(0, 8))}
                  placeholder={POSTCODE_PLACEHOLDER}
                  maxLength={8}
                  className="mt-1.5"
                  required
                />
              </div>
            </div>

            {userRole === "artisan" && (
              <>
                {artisanProfile?.primary_trade && (
                  <div>
                    <Label>Primary Trade</Label>
                    <div className="relative mt-1.5">
                      <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input value={artisanProfile.primary_trade} className="pl-10 bg-muted" disabled />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Trade is set during verification</p>
                  </div>
                )}

                <div>
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell customers about yourself and your work..."
                    className="mt-1.5 min-h-[100px]"
                    maxLength={500}
                  />
                </div>
              </>
            )}

            <Button
              type="submit"
              disabled={updateProfileMutation.isPending}
              className="w-full bg-gradient-hero text-primary-foreground hover:opacity-90 font-semibold"
            >
              {updateProfileMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
              ) : (
                <><Save className="w-4 h-4 mr-2" />Save Changes</>
              )}
            </Button>
          </form>

          {/* Portfolio section for artisans */}
          {userRole === "artisan" && user && (
            <ArtisanPortfolio userId={user.id} />
          )}

          {/* Notification preferences */}
          <div className="mt-6">
            <NotificationPreferences />
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProfileSettings;
