import { isStreamPlaybackUrl, resolvePlaybackFromActiveStreamRow } from "@/lib/audiencePlayback";
import type { ActiveStreamRow, RoomCard } from "@/lib/salaRoomCards";

/** Puente nativo Android disponible (WebView de la APK). */
export function isAndroidNativeBridgeAvailable(): boolean {
  if (typeof window === "undefined") return false;
  return typeof window.Android !== "undefined";
}

export function canHandoffLiveToAndroidNative(): boolean {
  return (
    isAndroidNativeBridgeAvailable() &&
    typeof window.Android?.getAgoraParams === "function"
  );
}

export function resolveAgoraChannelFromRoom(
  room: Pick<RoomCard, "channel">,
  activeStream?: Pick<ActiveStreamRow, "stream_url"> | null,
): string {
  const streamUrlCandidate = activeStream?.stream_url?.trim() || "";
  return isStreamPlaybackUrl(streamUrlCandidate) ? room.channel : streamUrlCandidate || room.channel;
}

/**
 * Live en Android: entrega playback HLS (.m3u8) al reproductor nativo cuando existe.
 * @returns true si el flujo nativo se ejecutó (no navegar a /sala/espectador).
 */
export async function handoffLiveToAndroidNative(
  room: RoomCard,
  activeStream?: ActiveStreamRow | null,
): Promise<boolean> {
  if (!activeStream?.is_live || !canHandoffLiveToAndroidNative()) {
    return false;
  }

  const playbackUrl = resolvePlaybackFromActiveStreamRow(activeStream);
  if (playbackUrl && isStreamPlaybackUrl(playbackUrl)) {
    window.Android!.getAgoraParams!(playbackUrl, "");
    return true;
  }

  const channel = resolveAgoraChannelFromRoom(room, activeStream);
  window.Android!.getAgoraParams!(channel, "");
  return true;
}
