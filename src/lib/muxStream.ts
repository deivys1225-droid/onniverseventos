import { extractPlaybackIdFromMuxApiPayload, sanitizeMuxPlaybackId } from "@/lib/muxPlaybackId";

/**
 * Cliente del backend Node `mux-api` (credenciales Mux solo en servidor).
 * En dev, Vite hace proxy de /api/mux → http://localhost:8787
 */

export type MuxStreamSession = {
  liveStreamId: string;
  streamKey: string;
  playbackId: string;
  playbackUrl: string;
  rtmpIngestUrl: string;
  rtmpPushUrl: string;
  ingestUrl: string;
};

function muxApiBase(): string {
  return (import.meta.env.VITE_MUX_API_URL as string | undefined)?.trim().replace(/\/$/, "") ?? "";
}

function createStreamUrl(): string {
  const base = muxApiBase();
  return base ? `${base}/api/mux/create-stream` : "/api/mux/create-stream";
}

/** Crea live stream en Mux vía backend Node. */
export async function createMuxStream(title?: string): Promise<MuxStreamSession> {
  const response = await fetch(createStreamUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: title?.trim() || "Transmision_Onniverso" }),
  });

  const data = (await response.json()) as Record<string, unknown>;
  if (!response.ok || data.ok === false) {
    throw new Error(String(data.error ?? `Mux API error (${response.status})`));
  }

  const streamKey = String(data.stream_key ?? data.streamKey ?? "").trim();
  const playbackId = extractPlaybackIdFromMuxApiPayload(data) ?? "";
  const playbackUrl = String(data.playback_url ?? data.playbackUrl ?? "").trim();
  const rtmpIngestUrl = String(data.rtmp_ingest_url ?? data.rtmpIngestUrl ?? "rtmps://global-live.mux.com:443/app").trim();
  const rtmpPushUrl = String(data.rtmp_push_url ?? data.rtmpPushUrl ?? "").trim();
  const liveStreamId = String(data.live_stream_id ?? data.liveStreamId ?? "").trim();

  const safePlaybackId = sanitizeMuxPlaybackId(playbackId);
  const safePlaybackUrl =
    playbackUrl ||
    (safePlaybackId ? `https://stream.mux.com/${safePlaybackId}.m3u8` : "");

  if (!streamKey || !safePlaybackId || !safePlaybackUrl) {
    throw new Error("Respuesta incompleta de Mux (stream_key, playback_id o playback_url).");
  }

  if (import.meta.env.DEV) {
    console.log("[createMuxStream] playback_id extraído:", {
      playback_id: safePlaybackId,
      playback_ids: data.playback_ids,
      stream_key: streamKey,
    });
  }

  return {
    liveStreamId,
    streamKey,
    playbackId: safePlaybackId,
    playbackUrl: safePlaybackUrl,
    rtmpIngestUrl,
    rtmpPushUrl: rtmpPushUrl || `${rtmpIngestUrl.replace(/\/$/, "")}/${streamKey}`,
    ingestUrl: rtmpPushUrl || `${rtmpIngestUrl.replace(/\/$/, "")}/${streamKey}`,
  };
}
