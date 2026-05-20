import { fetchMuxStreamStatusFromBackend } from "@/lib/muxStreamPolling";
import type { MuxStreamSignalState } from "@/lib/muxStreamStatus";

/** Estado del live stream vía API Mux en el backend. */
export async function fetchMuxLiveStreamStatus(
  liveStreamId: string,
  playbackId?: string,
): Promise<MuxStreamSignalState> {
  const { state } = await fetchMuxStreamStatusFromBackend({
    liveStreamId,
    playbackId,
  });
  return state;
}
