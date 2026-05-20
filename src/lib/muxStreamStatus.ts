import { muxPlaybackIdToHlsUrl } from "@/lib/audiencePlayback";
import { sanitizeMuxPlaybackId } from "@/lib/muxPlaybackId";

export type MuxStreamSignalState = "checking" | "active" | "idle" | "error";

export function muxApiBase(): string {
  return (import.meta.env.VITE_MUX_API_URL as string | undefined)?.trim().replace(/\/$/, "") ?? "";
}

/** Comprueba si Mux ya está sirviendo HLS (hay RTMP entrando). */
export async function probeMuxStreamSignal(playbackId: string): Promise<MuxStreamSignalState> {
  const id = sanitizeMuxPlaybackId(playbackId);
  if (!id) return "error";

  const url = muxPlaybackIdToHlsUrl(id);
  if (!url) return "error";

  try {
    const response = await fetch(url, { method: "HEAD", cache: "no-store" });
    if (response.ok) return "active";
    if (response.status === 404 || response.status === 412) return "idle";
    return "error";
  } catch {
    return "error";
  }
}
