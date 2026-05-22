import {
  isStreamPlaybackUrl,
  resolvePlaybackIdFromActiveStreamRow,
} from "@/lib/audiencePlayback";
import { isAndroidLiveStreamChoicePlatform, resolveMuxM3u8FromActiveStream } from "@/lib/liveStreamOpenDirect";
import { muxPlaybackIdFromHlsUrl } from "@/lib/muxPlaybackId";
import type { ActiveStreamRow, RoomCard } from "@/lib/salaRoomCards";
import { toast } from "sonner";

export type SalaDirectAction = "OPEN_SALA_DIVIDIDA" | "OPEN_SALA_MIXTA" | "OPEN_SALA_360";

export type SalaChoicePayload = {
  salaUrl: string;
  title: string;
};

/** URL de la sala: HLS en vivo o MP4 (Cloudinary). */
export function resolveSalaContentUrl(
  room: RoomCard,
  activeStream?: ActiveStreamRow | null,
): string {
  if (activeStream?.is_live) {
    const fromLive = resolveMuxM3u8FromActiveStream(activeStream);
    if (fromLive) return fromLive;
  }

  const mp4 = room.mp4Url?.trim() ?? "";
  if (mp4 && isStreamPlaybackUrl(mp4)) return mp4;

  const playbackUrl = activeStream?.playback_url?.trim() ?? "";
  const streamUrl = activeStream?.stream_url?.trim() ?? "";
  if (playbackUrl && isStreamPlaybackUrl(playbackUrl)) return playbackUrl;
  if (streamUrl && isStreamPlaybackUrl(streamUrl)) return streamUrl;

  const playbackId = resolvePlaybackIdFromActiveStreamRow(activeStream);
  if (playbackId) {
    return `https://stream.mux.com/${playbackId}.m3u8`;
  }
  return muxPlaybackIdFromHlsUrl(playbackUrl) ?? muxPlaybackIdFromHlsUrl(streamUrl) ?? "";
}

export function invokeOpenSalaDirect(salaUrl: string, action: SalaDirectAction): boolean {
  if (typeof window.AndroidBridge?.openSalaDirect === "function") {
    window.AndroidBridge.openSalaDirect(salaUrl, action);
    return true;
  }
  toast.error("AndroidBridge.openSalaDirect no disponible.");
  return false;
}

export function buildSalaChoicePayload(
  room: RoomCard,
  activeStream: ActiveStreamRow | null | undefined,
  title: string,
): SalaChoicePayload | null {
  const salaUrl = resolveSalaContentUrl(room, activeStream);
  if (!salaUrl) return null;
  return { salaUrl, title: title.trim() || room.name };
}

/** Tarjeta de sala en APK: menú 3 pantallas, sin espectador ni botones Cine/AR. */
export function handoffSalaCardOnAndroid(
  room: RoomCard,
  activeStream: ActiveStreamRow | null | undefined,
  title: string,
  requestChoice: (room: RoomCard, activeStream: ActiveStreamRow | null | undefined, displayTitle: string) => boolean,
): boolean {
  if (!isAndroidLiveStreamChoicePlatform()) return false;
  const payload = buildSalaChoicePayload(room, activeStream, title);
  if (!payload) {
    toast.error("No hay URL de contenido para esta sala.");
    return true;
  }
  requestChoice(room, activeStream ?? null, payload.title);
  return true;
}
