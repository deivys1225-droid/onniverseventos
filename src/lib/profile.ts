import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const AVATAR_BUCKET = "avatars";

/**
 * Si el usuario ya existe en auth pero no tiene fila en `profiles` (p. ej. registro con confirmación
 * por correo: no hubo sesión en el momento del signUp), crea la fila en el primer login.
 */
export async function ensureProfileRowForUser(user: User): Promise<void> {
  const { data: existing, error: selErr } = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle();
  if (selErr) throw selErr;
  if (existing) return;

  const meta = user.user_metadata ?? {};
  const fromMeta =
    (typeof meta.full_name === "string" && meta.full_name.trim()) ||
    (typeof meta.display_name === "string" && meta.display_name.trim()) ||
    "";
  const fromEmail = user.email?.split("@")[0]?.trim() ?? "";
  const fullName = fromMeta || fromEmail || "Usuario";
  const metadataRole = typeof meta.app_role === "string" ? meta.app_role.trim().toLowerCase() : "";
  const appRole =
    metadataRole === "docente" || metadataRole === "estudiante" || metadataRole === "particular"
      ? metadataRole
      : undefined;

  await upsertProfile({ userId: user.id, fullName, appRole });
}

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
  appRole?: "particular" | "estudiante" | "docente";
}) {
  const payload: {
    id: string;
    full_name: string;
    updated_at: string;
    avatar_url?: string | null;
    app_role?: "particular" | "estudiante" | "docente";
  } = {
    id: params.userId,
    full_name: params.fullName,
    updated_at: new Date().toISOString(),
  };
  if (params.avatarUrl !== undefined) {
    payload.avatar_url = params.avatarUrl;
  }
  if (params.appRole !== undefined) {
    payload.app_role = params.appRole;
  }

  const { error } = await supabase.from("profiles" as any).upsert(payload as any, { onConflict: "id" });
  if (error) throw error;
}

export async function updateProfileLiveState(params: {
  userId: string;
  isLive: boolean;
  streamKey?: string | null;
  playbackId?: string | null;
}) {
  const liveStatus = params.isLive ? "En Vivo" : "Offline";
  const basePayload = {
    live_status: liveStatus,
    updated_at: new Date().toISOString(),
  };

  const playbackPayload = params.isLive
    ? { playback_id: params.playbackId ?? null }
    : { playback_id: null };

  const extendedPayload = {
    ...basePayload,
    is_live: params.isLive,
    stream_key: params.streamKey ?? null,
    ...playbackPayload,
  };

  const { error } = await supabase
    .from("profiles")
    .update(extendedPayload as never)
    .eq("id", params.userId);

  if (!error) return;

  const details = `${error.message} ${error.details ?? ""}`.toLowerCase();
  const unknownColumn =
    (details.includes("column") && details.includes("does not exist")) ||
    (details.includes("could not find") && details.includes("schema cache")) ||
    details.includes("'is_live'") ||
    details.includes("'playback_id'");
  if (!unknownColumn) throw error;

  const { error: noPlaybackCol } = await supabase
    .from("profiles")
    .update({
      ...basePayload,
      is_live: params.isLive,
      stream_key: params.streamKey ?? null,
    } as never)
    .eq("id", params.userId);
  if (!noPlaybackCol) return;

  const { error: fallbackError } = await supabase.from("profiles").update(basePayload).eq("id", params.userId);
  if (fallbackError) throw fallbackError;
}
