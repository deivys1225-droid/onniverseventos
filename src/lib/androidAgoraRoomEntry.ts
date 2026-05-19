import { isStreamPlaybackUrl } from "@/lib/audiencePlayback";
import { fetchAgoraAudienceSession } from "@/lib/agoraAudienceToken";
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

export function resolveAgoraTokenFromActiveStream(
  activeStream?: Pick<ActiveStreamRow, "playback_url"> | null,
): string {
  const playbackUrlCandidate = activeStream?.playback_url?.trim() || "";
  if (playbackUrlCandidate && !isStreamPlaybackUrl(playbackUrlCandidate)) {
    return playbackUrlCandidate;
  }
  return "";
}

/**
 * Canal + token de audiencia desde Supabase (active_streams) o Edge agora-token.
 */
export async function resolveAgoraAudienceSession(
  room: RoomCard,
  activeStream?: ActiveStreamRow | null,
): Promise<{ channel: string; token: string }> {
  const channel = resolveAgoraChannelFromRoom(room, activeStream);
  let token = resolveAgoraTokenFromActiveStream(activeStream);
  if (!token) {
    const session = await fetchAgoraAudienceSession(channel);
    return { channel: session.channelName, token: session.audienceToken };
  }
  return { channel, token };
}

/**
 * Live en Android: entrega canal/token al nativo y no abre reproductor web.
 * @returns true si el flujo nativo se ejecutó (no navegar a /sala/espectador).
 */
export async function handoffLiveToAndroidNative(
  room: RoomCard,
  activeStream?: ActiveStreamRow | null,
): Promise<boolean> {
  if (!activeStream?.is_live || !canHandoffLiveToAndroidNative()) {
    return false;
  }

  const { channel, token } = await resolveAgoraAudienceSession(room, activeStream);
  window.Android!.getAgoraParams!(channel, token);
  return true;
}
