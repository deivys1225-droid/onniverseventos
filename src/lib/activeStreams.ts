import { supabase } from "@/integrations/supabase/client";
import { clearAndStopLivePreviewStream } from "@/lib/livePreviewBus";

const LIVE_ACTIVE_KEY = "onniverso.live.active";

export async function startActiveStream(input: {
  userId: string;
  streamUrl: string;
  title: string;
  category: string;
  privacyMode?: "publico" | "privado_ticket";
  ticketPrice?: number | null;
  /** HLS para espectadores (Livepeer). Opcional en modo solo RTMP/OBS. */
  playbackUrl?: string | null;
  playbackId?: string | null;
}) {
  const { error } = await supabase.from("active_streams").upsert(
    {
      user_id: input.userId,
      stream_url: input.streamUrl,
      title: input.title,
      category: input.category,
      is_live: true,
      privacy_mode: input.privacyMode ?? "publico",
      ticket_price: input.privacyMode === "privado_ticket" ? input.ticketPrice ?? null : null,
      playback_url: input.playbackUrl ?? null,
      playback_id: input.playbackId ?? null,
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ live_status: "En Vivo", updated_at: new Date().toISOString() })
    .eq("id", input.userId);
  if (profileError) throw profileError;
  localStorage.setItem(LIVE_ACTIVE_KEY, "1");
}

export async function stopMyActiveStream() {
  const { error } = await supabase.rpc("stop_my_active_streams");
  if (error) throw error;
  localStorage.setItem(LIVE_ACTIVE_KEY, "0");
  clearAndStopLivePreviewStream();
}
