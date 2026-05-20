import { muxPlaybackIdToHlsUrl, isStreamPlaybackUrl } from "@/lib/audiencePlayback";
import { muxPlaybackIdFromHlsUrl } from "@/lib/muxPlaybackId";

function isNativeAndroid(): boolean {
  return typeof window !== "undefined" && typeof window.Android !== "undefined";
}

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
 * Android: playStream → SelectorActivity → PlayerActivity (ExoPlayer).
 * Web: /go/:id → MuxPlayer (sin mezclar con ExoPlayer).
 */
export function handleStreamCardPlay(options: StreamCardPlayOptions): boolean {
  const streamUrl = resolveStreamUrl(options);
  const streamId = resolveStreamId(options, streamUrl);

  if (isNativeAndroid()) {
    if (import.meta.env.DEV) {
      console.log("[Onniverso] WEB PLAYER BLOCKED ON ANDROID — handleStreamCardPlay → playStream");
    }
    if (!streamUrl) {
      return false;
    }
    window.Android!.playStream!(streamUrl);
    return true;
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
