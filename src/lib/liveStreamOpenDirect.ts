import { Capacitor } from "@capacitor/core";
import {
  isStreamPlaybackUrl,
  muxPlaybackIdToHlsUrl,
  resolvePlaybackIdFromActiveStreamRow,
} from "@/lib/audiencePlayback";
import { isNativeAndroid } from "@/lib/nativePlayback";
import type { ActiveStreamRow } from "@/lib/salaRoomCards";
import { toast } from "sonner";

export type LiveStreamDirectAction = "OPEN_STREAM" | "OPEN_STREAM_CAM";

export type LiveStreamChoicePayload = {
  m3u8Url: string;
  title: string;
};

/** URL .m3u8 directa desde playback_url / playback_id (p. ej. tarjeta emisor). */
export function resolveMuxM3u8FromPlayback(playbackUrl: string, playbackId: string): string {
  return resolveMuxM3u8FromActiveStream({
    is_live: true,
    title: "",
    stream_url: "",
    playback_url: playbackUrl,
    playback_id: playbackId,
    privacy_mode: "publico",
    ticket_price: null,
    user_id: "",
  });
}

/** URL .m3u8 directa de Mux para {@link ActiveStreamRow}. */
export function resolveMuxM3u8FromActiveStream(activeStream: ActiveStreamRow): string {
  const playbackUrl = activeStream.playback_url?.trim() ?? "";
  const playbackId = resolvePlaybackIdFromActiveStreamRow(activeStream) ?? "";
  if (playbackUrl.includes(".m3u8")) return playbackUrl;
  const fromUrl =
    playbackUrl && isStreamPlaybackUrl(playbackUrl)
      ? playbackUrl
      : activeStream.stream_url?.trim() && isStreamPlaybackUrl(activeStream.stream_url)
        ? activeStream.stream_url.trim()
        : "";
  if (fromUrl.includes(".m3u8")) return fromUrl;
  return muxPlaybackIdToHlsUrl(playbackId) ?? "";
}

/** APK / WebView: mismo criterio que NativePlaybackRouteGuard ({@code window.Android}). */
export function isAndroidLiveStreamChoicePlatform(): boolean {
  if (typeof window === "undefined") return false;
  return Capacitor.getPlatform() === "android" || isNativeAndroid();
}

export function buildLiveStreamChoicePayload(
  activeStream: ActiveStreamRow,
  title: string,
): LiveStreamChoicePayload | null {
  const m3u8Url = resolveMuxM3u8FromActiveStream(activeStream);
  if (!m3u8Url) return null;
  return { m3u8Url, title: title.trim() || "EN VIVO" };
}

export function invokeOpenStreamDirect(m3u8Url: string, action: LiveStreamDirectAction): boolean {
  if (typeof window.AndroidBridge?.openStreamDirect === "function") {
    window.AndroidBridge.openStreamDirect(m3u8Url, action);
    return true;
  }
  toast.error("AndroidBridge no disponible. Usa la app Android.");
  return false;
}

/**
 * Tarjeta EN VIVO (receptor): en Android muestra STREAM / STREAM CAM y no navega a espectador.
 * Devuelve true si el flujo quedó en la app (modal o error), sin ir a rutas web bloqueadas.
 */
export function handoffAudienceLiveCardOnAndroid(
  activeStream: ActiveStreamRow | null | undefined,
  title: string,
  requestChoice: (stream: ActiveStreamRow, displayTitle: string) => boolean,
  audienceTappedLive: boolean,
): boolean {
  const isLiveEntry = Boolean(activeStream?.is_live) || audienceTappedLive;
  if (!isLiveEntry || !isAndroidLiveStreamChoicePlatform()) {
    return false;
  }
  if (!activeStream) {
    toast.error("No hay transmisión en vivo disponible.");
    return true;
  }
  requestChoice(activeStream, title);
  return true;
}
