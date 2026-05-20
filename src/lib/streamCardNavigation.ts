import { muxPlaybackIdToHlsUrl, isStreamPlaybackUrl } from "@/lib/audiencePlayback";
import { openAndroidLiveSelector } from "@/lib/androidVrBridge";
import { muxPlaybackIdFromHlsUrl } from "@/lib/muxPlaybackId";

function isNativeAndroid(): boolean {
  return typeof window !== "undefined" && typeof window.Android !== "undefined";
}

export type StreamCardPlayOptions = {
  streamUrl?: string;
  /** playback_id, user_id o liveId — único dato que Android necesita. */
  streamId?: string;
  playbackId?: string;
  userId?: string;
  title?: string;
  navigate?: (path: string) => void;
};

function resolveStreamUrl(options: StreamCardPlayOptions): string {
  const fromUrl = (options.streamUrl ?? "").trim();
  if (fromUrl && isStreamPlaybackUrl(fromUrl)) return fromUrl;
  return muxPlaybackIdToHlsUrl(options.playbackId ?? options.streamId) ?? "";
}

function resolveNativeStreamId(options: StreamCardPlayOptions, streamUrl: string): string {
  const explicit = (options.streamId ?? options.playbackId ?? options.userId ?? "").trim();
  if (explicit) return explicit;
  return muxPlaybackIdFromHlsUrl(streamUrl) ?? "";
}

function resolveWebStreamId(options: StreamCardPlayOptions, streamUrl: string): string {
  return resolveNativeStreamId(options, streamUrl);
}

/**
 * Android: openSelector(streamId) → SelectorActivity (usuario elige escena).
 * Web: /go/:id → MuxPlayer.
 */
export function handleStreamCardPlay(options: StreamCardPlayOptions): boolean {
  const streamUrl = resolveStreamUrl(options);
  const nativeStreamId = resolveNativeStreamId(options, streamUrl);
  const webStreamId = resolveWebStreamId(options, streamUrl);

  if (isNativeAndroid()) {
    if (import.meta.env.DEV) {
      console.log("[Onniverso] WEB VR BLOCKED — handleStreamCardPlay → openSelector");
    }
    if (!nativeStreamId) return false;
    return openAndroidLiveSelector(nativeStreamId);
  }

  if (!options.navigate || !webStreamId) {
    return false;
  }

  if (import.meta.env.DEV) {
    console.log("[Onniverso] RENDER PLAYER WEB — /go/", webStreamId);
  }

  const params = new URLSearchParams();
  if (options.title?.trim()) params.set("title", options.title.trim());
  if (streamUrl && isStreamPlaybackUrl(streamUrl)) params.set("stream", streamUrl);
  const pb = options.playbackId?.trim();
  if (pb) params.set("playbackId", pb);

  const qs = params.toString();
  options.navigate(qs ? `/go/${encodeURIComponent(webStreamId)}?${qs}` : `/go/${encodeURIComponent(webStreamId)}`);
  return true;
}
