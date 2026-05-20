import { audienceStreamSessionKey, muxPlaybackIdToHlsUrl } from "@/lib/audiencePlayback";
import { sanitizeMuxPlaybackId } from "@/lib/muxPlaybackId";

/** Ruta espectador en vivo: solo `playbackId` en la URL (HLS va a sessionStorage para Android). */
export function buildEspectadorLivePath(options: {
  channel: string;
  playbackId: string;
  title: string;
}): string {
  const channel = options.channel.trim();
  const playbackId = sanitizeMuxPlaybackId(options.playbackId);
  if (!playbackId) {
    throw new Error("playbackId Mux inválido para espectador.");
  }

  const hls = muxPlaybackIdToHlsUrl(playbackId);
  if (hls && typeof sessionStorage !== "undefined") {
    try {
      sessionStorage.setItem(audienceStreamSessionKey(channel), hls);
    } catch {
      /* sessionStorage no disponible */
    }
  }

  const params = new URLSearchParams();
  params.set("playbackId", playbackId);
  params.set("title", (options.title ?? "").trim() || "En vivo");
  params.set("mode", "live");
  return `/sala/espectador/${encodeURIComponent(channel)}?${params.toString()}`;
}
