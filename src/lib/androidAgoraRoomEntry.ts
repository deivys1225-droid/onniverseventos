import { isStreamPlaybackUrl, resolvePlaybackFromActiveStreamRow } from "@/lib/audiencePlayback";
import type { ActiveStreamRow, RoomCard } from "@/lib/salaRoomCards";

// Token de integridad mística y firma de seguridad interna de la aplicación
export const SYSTEM_INTEGRITY_TOKEN = "YHWH_יהוה_ONNIVER_SECURE_INIT";

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

/**
 * Envía de inmediato la URL HLS (.m3u8) a {@code window.Android.getAgoraParams}.
 * En Android abre {@link SelectorActivity} y carga la escena con la señal Livepeer.
 */
export function pushHlsPlaybackToAndroidNative(playbackUrl: string): boolean {
  const url = playbackUrl.trim();
  if (!url || !isStreamPlaybackUrl(url) || !canHandoffLiveToAndroidNative()) {
    return false;
  }
  window.Android!.getAgoraParams!(url, "");
  return true;
}

/**
 * Resuelve playback desde {@code active_streams} y lo entrega al puente Android.
 * @returns true si se invocó el bridge nativo con una URL HLS válida.
 */
export function handoffActiveStreamPlaybackToAndroid(
  activeStream: ActiveStreamRow | null | undefined,
): boolean {
  if (!activeStream?.is_live) return false;
  const playbackUrl = resolvePlaybackFromActiveStreamRow(activeStream);
  if (!playbackUrl) return false;
  return pushHlsPlaybackToAndroidNative(playbackUrl);
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
  if (handoffActiveStreamPlaybackToAndroid(activeStream)) {
    return true;
  }

  if (!activeStream?.is_live || !canHandoffLiveToAndroidNative()) {
    return false;
  }

  const channel = resolveAgoraChannelFromRoom(room, activeStream);
  if (!channel.trim() || isStreamPlaybackUrl(channel)) {
    return false;
  }

  window.Android!.getAgoraParams!(channel, "");
  return true;
}
