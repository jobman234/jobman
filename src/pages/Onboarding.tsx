import { useState } from "react";
import Navbar from "@/components/landing/Navbar";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HardHat, User, MapPin, Phone, Camera, ChevronRight, ChevronLeft, Check, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue",
  "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT",
  "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi",
  "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo",
  "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara",
];

const Onboarding = () => {
  const { user, userRole } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Profile fields
  const [phone, setPhone] = useState("");
  const [state, setState] = useState("");
  const [lga, setLga] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [bio, setBio] = useState("");

  const isArtisan = userRole === "artisan";

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const steps = [
    { title: "Welcome", description: "Let's set up your profile" },
    { title: "Location", description: "Where are you based?" },
    ...(isArtisan ? [{ title: "About You", description: "Tell clients about yourself" }] : []),
    { title: "All Done!", description: "You're ready to go" },
  ];

  const handleComplete = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Upload avatar if provided
      let avatarUrl: string | null = null;
      if (avatarFile) {
        const ext = avatarFile.name.split(".").pop();
        const path = `${user.id}/avatar.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("avatars")
          .upload(path, avatarFile, { upsert: true });
        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
          avatarUrl = urlData.publicUrl;
        }
      }

      // Update profile
      const updates: Record<string, any> = {
        onboarding_completed: true,
      };
      if (phone.trim()) updates.phone = phone.trim();
      if (state) updates.state = state;
      if (lga.trim()) updates.lga = lga.trim();
      if (avatarUrl) updates.avatar_url = avatarUrl;

      const { error: profileErr } = await supabase
        .from("profiles")
        .update(updates)
        .eq("user_id", user.id);

      if (profileErr) throw profileErr;

      // Update artisan bio if applicable
      if (isArtisan && bio.trim()) {
        await supabase
          .from("artisan_profiles")
          .update({ bio: bio.trim() })
          .eq("user_id", user.id);
      }

      toast.success("Profile set up successfully!");
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    if (!user) return;
    setLoading(true);
    await supabase
      .from("profiles")
      .update({ onboarding_completed: true } as any)
      .eq("user_id", user.id);
    setLoading(false);
    navigate("/dashboard");
  };

  const canGoNext = () => {
    if (step === 0) return true; // welcome
    if (step === 1) return true; // location is optional
    if (isArtisan && step === 2) return true; // bio is optional
    return true;
  };

  const isLastContentStep = step === steps.length - 2;
  const isFinalStep = step === steps.length - 1;

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />
      <div className="flex items-center justify-center px-4 py-12 pt-24">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-hero flex items-center justify-center">
              <HardHat className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-2xl text-foreground">Jobman</span>
          </div>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                i === step ? "w-8 bg-primary" : i < step ? "w-2 bg-primary/50" : "w-2 bg-border"
              )}
            />
          ))}
        </div>

        <div className="bg-card rounded-2xl border border-border p-8 shadow-sm">
          <h2 className="font-display text-xl font-bold text-foreground text-center mb-1">
            {steps[step].title}
          </h2>
          <p className="text-sm text-muted-foreground text-center mb-6">
            {steps[step].description}
          </p>

          {/* Step 0: Welcome + Avatar */}
          {step === 0 && (
            <div className="space-y-5">
              <div className="flex flex-col items-center">
                <label htmlFor="avatar-upload" className="cursor-pointer group">
                  <div className="w-24 h-24 rounded-full bg-muted border-2 border-dashed border-border group-hover:border-primary/50 flex items-center justify-center overflow-hidden transition-colors">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground text-center mt-2">Upload photo</p>
                </label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>

              <div>
                <Label htmlFor="onboard-phone">Phone Number</Label>
                <div className="relative mt-1.5">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="onboard-phone"
                    placeholder="+234 800 000 0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Hi, <strong>{user?.user_metadata?.full_name || "there"}</strong>! Let's get your profile ready
                {isArtisan ? " so customers can find and hire you." : " so you can start posting jobs."}
              </p>
            </div>
          )}

          {/* Step 1: Location */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label>State</Label>
                <Select value={state} onValueChange={setState}>
                  <SelectTrigger className="mt-1.5">
                    <MapPin className="w-4 h-4 text-muted-foreground mr-2" />
                    <SelectValue placeholder="Select your state" />
                  </SelectTrigger>
                  <SelectContent>
                    {NIGERIAN_STATES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="onboard-lga">Local Government Area (LGA)</Label>
                <Input
                  id="onboard-lga"
                  placeholder="e.g. Ikeja, Surulere"
                  value={lga}
                  onChange={(e) => setLga(e.target.value)}
                  className="mt-1.5"
                />
              </div>
            </div>
          )}

          {/* Step 2 (artisan only): Bio */}
          {isArtisan && step === 2 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="onboard-bio">Short Bio</Label>
                <Textarea
                  id="onboard-bio"
                  placeholder="Tell customers about your experience, skills, and what makes you stand out..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="mt-1.5 min-h-[120px]"
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground text-right mt-1">{bio.length}/500</p>
              </div>
            </div>
          )}

          {/* Final step: All done */}
          {isFinalStep && (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                {isArtisan
                  ? "Your profile is ready. Complete verification next to start receiving jobs!"
                  : "You're all set! Start by posting your first job or browsing artisans."}
              </p>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex items-center gap-3 mt-8">
            {step > 0 && !isFinalStep && (
              <Button variant="ghost" onClick={() => setStep(step - 1)} className="gap-1">
                <ChevronLeft className="w-4 h-4" /> Back
              </Button>
            )}
            <div className="flex-1" />
            {!isFinalStep && (
              <Button
                onClick={() => {
                  if (isLastContentStep) {
                    setStep(step + 1); // go to final step
                  } else {
                    setStep(step + 1);
                  }
                }}
                disabled={!canGoNext()}
                className="bg-gradient-hero text-primary-foreground hover:opacity-90 gap-1"
              >
                Continue <ChevronRight className="w-4 h-4" />
              </Button>
            )}
            {isFinalStep && (
              <Button
                onClick={handleComplete}
                disabled={loading}
                className="w-full bg-gradient-hero text-primary-foreground hover:opacity-90 gap-2"
              >
                {loading ? "Saving..." : (
                  <>
                    <Check className="w-4 h-4" />
                    {isArtisan ? "Go to Dashboard" : "Start Posting Jobs"}
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Skip link */}
          {!isFinalStep && (
            <button
              onClick={handleSkip}
              disabled={loading}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground mt-4 transition-colors"
            >
              Skip for now
            </button>
          )}
      </div>
      </div>
      </div>
    </div>
  );
};

export default Onboarding;
