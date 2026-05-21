import { muxPlaybackIdToHlsUrl, isStreamPlaybackUrl } from "@/lib/audiencePlayback";
import { isAndroidLiveStreamChoicePlatform } from "@/lib/liveStreamOpenDirect";
import { muxPlaybackIdFromHlsUrl } from "@/lib/muxPlaybackId";

export type StreamCardPlayOptions = {
  /** URL HLS/MP4 directa (prioridad). */
  streamUrl?: string;
  /** ID para ruta web /go/:streamId y fallback Mux. */
  streamId?: string;
  playbackId?: string;
  title?: string;
  navigate?: (path: string) => void;
};

function resolveStreamUrl(options: StreamCardPlayOptions): string {
  const fromUrl = (options.streamUrl ?? "").trim();
  if (fromUrl && isStreamPlaybackUrl(fromUrl)) return fromUrl;
  const fromId = muxPlaybackIdToHlsUrl(options.playbackId ?? options.streamId);
  return fromId ?? "";
}

function resolveStreamId(options: StreamCardPlayOptions, streamUrl: string): string {
  const explicit = (options.streamId ?? options.playbackId ?? "").trim();
  if (explicit) return explicit;
  return muxPlaybackIdFromHlsUrl(streamUrl) ?? "";
}

/**
 * Web: /go/:id → MuxPlayer.
 * Android en vivo: usar {@link useLiveStreamChoiceModal} + openStreamDirect (no playStream).
 */
export function handleStreamCardPlay(options: StreamCardPlayOptions): boolean {
  const streamUrl = resolveStreamUrl(options);
  const streamId = resolveStreamId(options, streamUrl);

  if (isAndroidLiveStreamChoicePlatform()) {
    return false;
  }

  if (!options.navigate || !streamId) {
    return false;
  }

  if (import.meta.env.DEV) {
    console.log("[Onniverso] RENDER PLAYER WEB — /go/", streamId);
  }

  const params = new URLSearchParams();
  if (options.title?.trim()) params.set("title", options.title.trim());
  if (streamUrl && isStreamPlaybackUrl(streamUrl)) params.set("stream", streamUrl);
  const pb = options.playbackId?.trim();
  if (pb) params.set("playbackId", pb);

  const qs = params.toString();
  options.navigate(qs ? `/go/${encodeURIComponent(streamId)}?${qs}` : `/go/${encodeURIComponent(streamId)}`);
  return true;
}
