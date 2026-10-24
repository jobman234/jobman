import { supabase } from "@/integrations/supabase/client";

// Long enough to behave as effectively permanent for a stored DB reference,
// without the operational cost of resigning URLs for admin review pages.
const SIGNED_URL_EXPIRY_SECONDS = 60 * 60 * 24 * 365 * 10; // 10 years

// getPublicUrl() only produces a working link for a bucket created with
// public: true. verification-docs and dispute-evidence are private buckets
// (they hold NIN/ID/selfie/evidence files), so uploads to them must use this
// instead — getPublicUrl() there silently returns a URL that 404s for everyone,
// admins included, once someone tries to actually view the file.
export async function uploadToPrivateBucket(
  bucket: string,
  path: string,
  file: File
): Promise<string | null> {
  const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
  if (uploadError) {
    console.error(`Upload error (${bucket}/${path}):`, uploadError);
    return null;
  }
  const { data, error: signError } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, SIGNED_URL_EXPIRY_SECONDS);
  if (signError || !data) {
    console.error(`Signed URL error (${bucket}/${path}):`, signError);
    return null;
  }
  return data.signedUrl;
}
