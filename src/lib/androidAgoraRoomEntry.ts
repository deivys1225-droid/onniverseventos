import { isStreamPlaybackUrl, muxPlaybackIdToHlsUrl, resolvePlaybackFromActiveStreamRow } from "@/lib/audiencePlayback";
import { canPlayStreamOnAndroidNative, playStreamOnAndroidNative, shouldUseWebLivePlayer } from "@/lib/nativePlayback";
import type { ActiveStreamRow, RoomCard } from "@/lib/salaRoomCards";

export const SYSTEM_INTEGRITY_TOKEN = "YHWH_יהוה_ONNIVER_SECURE_INIT";

export function isAndroidNativeBridgeAvailable(): boolean {
  if (typeof window === "undefined") return false;
  return typeof window.Android !== "undefined";
}

export function canHandoffLiveToAndroidNative(): boolean {
  return canPlayStreamOnAndroidNative() || (isAndroidNativeBridgeAvailable() && typeof window.Android?.openLiveSelector === "function");
}

/** Live Mux → {@code window.Android.playStream(hls)} (ExoPlayer en SelectorActivity). */
export function openMuxLiveInAndroidSelector(options: {
  playbackUrl?: string;
  playbackId?: string;
  preferredScene?: "split" | "immersive" | "mix";
}): boolean {
  return playStreamOnAndroidNative({
    playbackUrl: options.playbackUrl,
    playbackId: options.playbackId,
  });
}

export function isAndroidLiveSelectorAvailable(): boolean {
  return canHandoffLiveToAndroidNative();
}

export function pushHlsPlaybackToAndroidNative(playbackUrl: string, playbackId?: string): boolean {
  const url = playbackUrl.trim();
  if (!url || !isStreamPlaybackUrl(url)) return false;
  return playStreamOnAndroidNative({ playbackUrl: url, playbackId });
}

export function handoffActiveStreamPlaybackToAndroid(
  activeStream: ActiveStreamRow | null | undefined,
): boolean {
  if (!activeStream?.is_live) return false;
  const playbackUrl = resolvePlaybackFromActiveStreamRow(activeStream);
  if (!playbackUrl) return false;
  return pushHlsPlaybackToAndroidNative(playbackUrl, activeStream.playback_id ?? undefined);
}

export function resolveAgoraChannelFromRoom(
  room: Pick<RoomCard, "channel">,
  activeStream?: Pick<ActiveStreamRow, "stream_url"> | null,
): string {
  const streamUrlCandidate = activeStream?.stream_url?.trim() || "";
  return isStreamPlaybackUrl(streamUrlCandidate) ? room.channel : streamUrlCandidate || room.channel;
}

/** Android: playStream nativo. Web: false (el caller navega al espectador). */
export async function handoffLiveToAndroidNative(
  room: RoomCard,
  activeStream?: ActiveStreamRow | null,
): Promise<boolean> {
  if (shouldUseWebLivePlayer()) return false;

  if (handoffActiveStreamPlaybackToAndroid(activeStream)) {
    return true;
  }

  if (!activeStream?.is_live || !isAndroidNativeBridgeAvailable()) {
    return false;
  }

  const channel = resolveAgoraChannelFromRoom(room, activeStream);
  if (!channel.trim() || isStreamPlaybackUrl(channel)) {
    return false;
  }

  if (typeof window.Android?.getAgoraParams === "function") {
    window.Android.getAgoraParams(channel, "");
    return true;
  }
  return false;
}
