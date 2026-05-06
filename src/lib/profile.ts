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
  avatarUrl?: string | null;
}) {
  const payload: {
    id: string;
    full_name: string;
    updated_at: string;
    avatar_url?: string | null;
  } = {
    id: params.userId,
    full_name: params.fullName,
    updated_at: new Date().toISOString(),
  };
  if (params.avatarUrl !== undefined) {
    payload.avatar_url = params.avatarUrl;
  }

  const { error } = await supabase.from("profiles").upsert(
    payload,
    { onConflict: "id" },
  );
  if (error) throw error;
}
