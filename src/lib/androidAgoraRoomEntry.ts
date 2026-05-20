import { isStreamPlaybackUrl, muxPlaybackIdToHlsUrl, resolvePlaybackFromActiveStreamRow } from "@/lib/audiencePlayback";
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
    (typeof window.Android?.openLiveSelector === "function" ||
      typeof window.Android?.getAgoraParams === "function")
  );
}

/**
 * Tarjeta Live → Intent {@code SelectorActivity} con playback_url / playback_id (sin reproductor web).
 * @returns true si se invocó el puente Android.
 */
export function openMuxLiveInAndroidSelector(options: {
  playbackUrl?: string;
  playbackId?: string;
  preferredScene?: "split" | "immersive" | "mix";
}): boolean {
  const fromUrl = (options.playbackUrl ?? "").trim();
  const fromId = muxPlaybackIdToHlsUrl(options.playbackId);
  const hls = fromUrl || fromId || "";
  const playbackId = (options.playbackId ?? "").trim();
  if (!hls || !canHandoffLiveToAndroidNative()) {
    return false;
  }
  const bridge = window.Android!;
  if (typeof bridge.openLiveSelector === "function") {
    bridge.openLiveSelector(hls, playbackId);
    return true;
  }
  bridge.getAgoraParams!(hls, playbackId);
  return true;
}

export function isAndroidLiveSelectorAvailable(): boolean {
  return canHandoffLiveToAndroidNative();
}

/**
 * Entrega HLS a la maleta nativa y abre {@code SelectorActivity} (sin cargar .m3u8 en el WebView).
 */
export function pushHlsPlaybackToAndroidNative(playbackUrl: string, playbackId?: string): boolean {
  const url = playbackUrl.trim();
  if (!url || !isStreamPlaybackUrl(url) || !canHandoffLiveToAndroidNative()) {
    return false;
  }
  return openMuxLiveInAndroidSelector({ playbackUrl: url, playbackId });
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
