import { muxApiBase } from "@/lib/muxStreamStatus";
import type { MuxStreamSignalState } from "@/lib/muxStreamStatus";

/** Estado del live stream vía API Mux (complementa el HEAD al .m3u8). */
export async function fetchMuxLiveStreamStatus(liveStreamId: string): Promise<MuxStreamSignalState> {
  const id = liveStreamId.trim();
  if (!id) return "error";

  const base = muxApiBase();
  const url = base
    ? `${base}/api/mux/stream-status?liveStreamId=${encodeURIComponent(id)}`
    : `/api/mux/stream-status?liveStreamId=${encodeURIComponent(id)}`;

  try {
    const response = await fetch(url, { cache: "no-store" });
    const data = (await response.json()) as { ok?: boolean; status?: string; active?: boolean };
    if (!response.ok || data.ok === false) return "error";
    if (data.active || data.status === "active") return "active";
    if (data.status === "idle") return "idle";
    return "checking";
  } catch {
    return "error";
  }
}
