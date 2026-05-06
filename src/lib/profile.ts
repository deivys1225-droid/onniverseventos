import { supabase } from "@/integrations/supabase/client";

const AVATAR_BUCKET = "avatars";

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const path = `${userId}/avatar.jpg`;
  const { error: uploadError } = await supabase.storage.from(AVATAR_BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type || "image/jpeg",
    cacheControl: "3600",
  });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function upsertProfile(params: {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
}) {
  const { error } = await supabase.from("profiles").upsert(
    {
      id: params.userId,
      full_name: params.fullName,
      avatar_url: params.avatarUrl,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (error) throw error;
}
