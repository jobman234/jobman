import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Camera, Loader2, Trash2, UserCircle, ImagePlus, Video, Play } from "lucide-react";

interface ArtisanPortfolioProps {
  userId: string;
}

const MAX_PHOTOS = 8;
const MAX_VIDEOS = 4;
const MAX_IMG_SIZE = 5 * 1024 * 1024;   // 5MB
const MAX_VID_SIZE = 30 * 1024 * 1024;  // 30MB

const ArtisanPortfolio = ({ userId }: ArtisanPortfolioProps) => {
  const queryClient = useQueryClient();
  const portraitInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const [uploadingPortrait, setUploadingPortrait] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [uploadingVideos, setUploadingVideos] = useState(false);

  const { data: ap, isLoading } = useQuery({
    queryKey: ["artisan-portfolio", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artisan_profiles")
        .select("portrait_url, work_photo_url, job_photos, job_videos")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["artisan-portfolio"] });
    queryClient.invalidateQueries({ queryKey: ["artisan-profile-settings"] });
    queryClient.invalidateQueries({ queryKey: ["featured-artisans"] });
    queryClient.invalidateQueries({ queryKey: ["find-artisans"] });
    queryClient.invalidateQueries({ queryKey: ["public-artisan"] });
  };

  /* ── Portrait ── */
  const handlePortraitUpload = async (file: File) => {
    if (file.size > MAX_IMG_SIZE) { toast.error("Image must be under 5MB"); return; }
    setUploadingPortrait(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${userId}/portrait-${Date.now()}.${ext}`;
      const { error: up } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (up) throw up;
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      await supabase.from("artisan_profiles").update({ portrait_url: `${urlData.publicUrl}?t=${Date.now()}` }).eq("user_id", userId);
      toast.success("Profile picture updated!");
      invalidate();
    } catch (e: any) { toast.error(e.message || "Upload failed"); }
    finally { setUploadingPortrait(false); }
  };

  /* ── Photos ── */
  const handlePhotoUpload = async (files: FileList) => {
    const current = ap?.job_photos ?? [];
    const remaining = MAX_PHOTOS - current.length;
    if (remaining <= 0) { toast.error(`Max ${MAX_PHOTOS} photos`); return; }
    const toUpload = Array.from(files).slice(0, remaining);
    if (toUpload.some((f) => f.size > MAX_IMG_SIZE)) { toast.error("Each image must be under 5MB"); return; }
    setUploadingPhotos(true);
    try {
      const urls: string[] = [];
      for (const file of toUpload) {
        const ext = file.name.split(".").pop();
        const path = `${userId}/photo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
        const { error: up } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
        if (up) throw up;
        const { data: u } = supabase.storage.from("avatars").getPublicUrl(path);
        urls.push(u.publicUrl);
      }
      await supabase.from("artisan_profiles").update({ job_photos: [...current, ...urls] }).eq("user_id", userId);
      toast.success(`${urls.length} photo(s) added!`);
      invalidate();
    } catch (e: any) { toast.error(e.message || "Upload failed"); }
    finally { setUploadingPhotos(false); }
  };

  /* ── Videos ── */
  const handleVideoUpload = async (files: FileList) => {
    const current = (ap as any)?.job_videos ?? [];
    const remaining = MAX_VIDEOS - current.length;
    if (remaining <= 0) { toast.error(`Max ${MAX_VIDEOS} videos`); return; }
    const toUpload = Array.from(files).slice(0, remaining);
    if (toUpload.some((f) => f.size > MAX_VID_SIZE)) { toast.error("Each video must be under 30MB"); return; }
    setUploadingVideos(true);
    try {
      const urls: string[] = [];
      for (const file of toUpload) {
        const ext = file.name.split(".").pop();
        const path = `${userId}/video-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
        const { error: up } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
        if (up) throw up;
        const { data: u } = supabase.storage.from("avatars").getPublicUrl(path);
        urls.push(u.publicUrl);
      }
      await supabase.from("artisan_profiles").update({ job_videos: [...current, ...urls] } as any).eq("user_id", userId);
      toast.success(`${urls.length} video(s) added!`);
      invalidate();
    } catch (e: any) { toast.error(e.message || "Upload failed"); }
    finally { setUploadingVideos(false); }
  };

  const removePhoto = async (index: number) => {
    const updated = (ap?.job_photos ?? []).filter((_, i) => i !== index);
    await supabase.from("artisan_profiles").update({ job_photos: updated }).eq("user_id", userId);
    toast.success("Photo removed"); invalidate();
  };

  const removeVideo = async (index: number) => {
    const current = (ap as any)?.job_videos ?? [];
    const updated = current.filter((_: string, i: number) => i !== index);
    await supabase.from("artisan_profiles").update({ job_videos: updated } as any).eq("user_id", userId);
    toast.success("Video removed"); invalidate();
  };

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const photos = ap?.job_photos ?? [];
  const videos = ((ap as any)?.job_videos ?? []) as string[];

  return (
    <div className="space-y-6">
      {/* ── Profile Picture ── */}
      <div className="bg-card rounded-2xl border border-border p-6 sm:p-8 shadow-sm">
        <h2 className="font-display font-semibold text-lg text-foreground mb-1">Profile Picture</h2>
        <p className="text-sm text-muted-foreground mb-4">Shown on your public profile, homepage and search results.</p>
        <div className="flex items-center gap-5">
          <div className="relative group">
            <div className="w-28 h-28 rounded-full bg-muted border-2 border-border overflow-hidden flex items-center justify-center">
              {ap?.portrait_url
                ? <img src={ap.portrait_url} alt="Portrait" className="w-full h-full object-cover" />
                : <UserCircle className="w-14 h-14 text-muted-foreground" />}
            </div>
            <button
              type="button"
              onClick={() => portraitInputRef.current?.click()}
              disabled={uploadingPortrait}
              className={cn(
                "absolute inset-0 rounded-full flex items-center justify-center bg-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity",
                uploadingPortrait && "opacity-100"
              )}
            >
              {uploadingPortrait ? <Loader2 className="w-5 h-5 text-background animate-spin" /> : <Camera className="w-5 h-5 text-background" />}
            </button>
            <input ref={portraitInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
              onChange={(e) => e.target.files?.[0] && handlePortraitUpload(e.target.files[0])} />
          </div>
          <div>
            <Button type="button" variant="outline" size="sm" onClick={() => portraitInputRef.current?.click()} disabled={uploadingPortrait}>
              <Camera className="w-4 h-4 mr-2" />{ap?.portrait_url ? "Change Photo" : "Upload Photo"}
            </Button>
            <p className="text-xs text-muted-foreground mt-1.5">JPG, PNG or WebP · Max 5MB</p>
          </div>
        </div>
      </div>

      {/* ── Work Photos ── */}
      <div className="bg-card rounded-2xl border border-border p-6 sm:p-8 shadow-sm">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-display font-semibold text-lg text-foreground">Work Photos</h2>
          <span className="text-xs text-muted-foreground">{photos.length}/{MAX_PHOTOS}</span>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Showcase your best completed projects.</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {photos.map((url, i) => (
            <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border border-border">
              <img src={url} alt={`Work ${i + 1}`} className="w-full h-full object-cover" />
              <button type="button" onClick={() => removePhoto(i)}
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-destructive/90 text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
          {photos.length < MAX_PHOTOS && (
            <button type="button" onClick={() => photoInputRef.current?.click()} disabled={uploadingPhotos}
              className="aspect-square rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-2 transition-colors text-muted-foreground hover:text-primary">
              {uploadingPhotos ? <Loader2 className="w-5 h-5 animate-spin" /> : <><ImagePlus className="w-5 h-5" /><span className="text-xs">Add Photo</span></>}
            </button>
          )}
        </div>
        <input ref={photoInputRef} type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden"
          onChange={(e) => e.target.files?.length && handlePhotoUpload(e.target.files)} />
      </div>

      {/* ── Work Videos ── */}
      <div className="bg-card rounded-2xl border border-border p-6 sm:p-8 shadow-sm">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-display font-semibold text-lg text-foreground">Work Videos</h2>
          <span className="text-xs text-muted-foreground">{videos.length}/{MAX_VIDEOS}</span>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Short clips of your work (max 30MB each, MP4/MOV/WebM).</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {videos.map((url, i) => (
            <div key={i} className="relative group rounded-lg overflow-hidden border border-border bg-muted">
              <video src={url} controls className="w-full aspect-video object-cover" />
              <button type="button" onClick={() => removeVideo(i)}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-destructive/90 text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {videos.length < MAX_VIDEOS && (
            <button type="button" onClick={() => videoInputRef.current?.click()} disabled={uploadingVideos}
              className="aspect-video rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-2 transition-colors text-muted-foreground hover:text-primary">
              {uploadingVideos ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Video className="w-6 h-6" /><span className="text-xs font-medium">Add Video</span></>}
            </button>
          )}
        </div>
        <input ref={videoInputRef} type="file" accept="video/mp4,video/mov,video/quicktime,video/webm" multiple className="hidden"
          onChange={(e) => e.target.files?.length && handleVideoUpload(e.target.files)} />
      </div>
    </div>
  );
};

export default ArtisanPortfolio;
