import { muxPlaybackIdToHlsUrl } from "@/lib/audiencePlayback";
import { sanitizeMuxPlaybackId } from "@/lib/muxPlaybackId";
import { muxApiBase, type MuxStreamSignalState } from "@/lib/muxStreamStatus";

export const MUX_SIGNAL_POLL_MS = 4000;

type StreamStatusApiResponse = {
  ok?: boolean;
  status?: string;
  active?: boolean;
  error?: string;
};

/** Consulta estado Mux vía backend (fuente principal). */
export async function fetchMuxStreamStatusFromBackend(options: {
  liveStreamId?: string;
  playbackId?: string;
}): Promise<{ state: MuxStreamSignalState; rawStatus?: string }> {
  const liveStreamId = options.liveStreamId?.trim() ?? "";
  const playbackId = sanitizeMuxPlaybackId(options.playbackId) ?? "";

  if (!liveStreamId && !playbackId) {
    return { state: "error" };
  }

  const params = new URLSearchParams();
  if (liveStreamId) params.set("liveStreamId", liveStreamId);
  if (playbackId) params.set("playbackId", playbackId);

  const base = muxApiBase();
  const url = base
    ? `${base}/api/mux/stream-status?${params.toString()}`
    : `/api/mux/stream-status?${params.toString()}`;

  try {
    const response = await fetch(url, { method: "GET", cache: "no-store" });
    const data = (await response.json()) as StreamStatusApiResponse;

    if (!response.ok || data.ok === false) {
      return { state: "error", rawStatus: data.error };
    }

    const rawStatus = String(data.status ?? "").trim().toLowerCase();
    const isActive = data.active === true || rawStatus === "active";

    if (isActive) {
      return { state: "active", rawStatus };
    }
    if (rawStatus === "idle" || rawStatus === "disabled") {
      return { state: "idle", rawStatus };
    }

    return { state: "idle", rawStatus: rawStatus || "unknown" };
  } catch {
    return { state: "error" };
  }
}

/** HEAD al manifiesto HLS (secundario; puede fallar por CORS en algunos navegadores). */
async function probeHlsManifest(playbackId: string): Promise<MuxStreamSignalState> {
  const url = muxPlaybackIdToHlsUrl(playbackId);
  if (!url) return "error";

  try {
    const response = await fetch(url, { method: "HEAD", cache: "no-store", mode: "cors" });
    if (response.ok) return "active";
    if (response.status === 404 || response.status === 412 || response.status === 403) return "idle";
    return "idle";
  } catch {
    return "error";
  }
}

/**
 * Estado unificado: prioriza API backend; si falla, usa HLS como respaldo.
 */
export async function resolveMuxStreamSignalState(options: {
  liveStreamId?: string;
  playbackId?: string;
}): Promise<MuxStreamSignalState> {
  const backend = await fetchMuxStreamStatusFromBackend(options);

  if (backend.state === "active") return "active";
  if (backend.state === "idle") return "idle";

  const playbackId = sanitizeMuxPlaybackId(options.playbackId);
  if (backend.state === "error" && playbackId) {
    const hls = await probeHlsManifest(playbackId);
    if (hls === "active") return "active";
    if (hls === "idle") return "idle";
  }

  return backend.state === "error" ? "idle" : backend.state;
}
