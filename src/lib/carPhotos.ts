import { supabase } from "@/integrations/supabase/client";

/** Fetch signed URLs for a batch of storage paths. Returns map path -> url. */
export async function getSignedCarPhotos(paths: string[]): Promise<Record<string, string>> {
  const unique = Array.from(new Set(paths.filter(Boolean)));
  if (unique.length === 0) return {};
  const { data, error } = await supabase.storage
    .from("car-photos")
    .createSignedUrls(unique, 60 * 60 * 24);
  if (error || !data) return {};
  const map: Record<string, string> = {};
  for (const item of data) {
    if (item.path && item.signedUrl) map[item.path] = item.signedUrl;
  }
  return map;
}
