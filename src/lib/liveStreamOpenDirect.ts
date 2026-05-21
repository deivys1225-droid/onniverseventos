import { Capacitor } from "@capacitor/core";
import {
  isStreamPlaybackUrl,
  muxPlaybackIdToHlsUrl,
  resolvePlaybackIdFromActiveStreamRow,
} from "@/lib/audiencePlayback";
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

export function isAndroidLiveStreamChoicePlatform(): boolean {
  return Capacitor.getPlatform() === "android";
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
 * Receptor en Android: muestra elección STREAM / STREAM CAM (el caller abre el diálogo).
 * Devuelve true si el flujo en vivo quedó manejado aquí (no usar playStream).
 */
export function shouldHandoffLiveStreamToChoiceDialog(activeStream: ActiveStreamRow | null | undefined): boolean {
  return Boolean(activeStream?.is_live && isAndroidLiveStreamChoicePlatform());
}
