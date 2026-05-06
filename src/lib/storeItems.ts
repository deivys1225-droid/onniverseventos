import { supabase } from "@/integrations/supabase/client";

const STORE_BUCKET = "store-assets";

export async function uploadStoreAsset(userId: string, file: File, kind: "cover" | "book"): Promise<string> {
  const ext = (file.name.split(".").pop() || "bin").toLowerCase();
  const safeExt = /^[a-z0-9]+$/.test(ext) ? ext : "bin";
  const path = `${userId}/${kind}-${Date.now()}.${safeExt}`;
  const { error } = await supabase.storage.from(STORE_BUCKET).upload(path, file, {
    upsert: false,
    contentType: file.type || "application/octet-stream",
    cacheControl: "3600",
  });
  if (error) throw error;
  const { data } = supabase.storage.from(STORE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function createStoreItem(input: {
  userId: string;
  itemType: "biblioteca" | "cursos";
  title: string;
  coverImageUrl: string;
  salePrice: number;
  fileUrl?: string | null;
  videoUrl?: string | null;
}) {
  const { error } = await supabase.from("store_items").insert({
    user_id: input.userId,
    item_type: input.itemType,
    title: input.title,
    cover_image_url: input.coverImageUrl,
    sale_price: input.salePrice,
    file_url: input.fileUrl ?? null,
    video_url: input.videoUrl ?? null,
  });
  if (error) throw error;
}
