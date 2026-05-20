import { resolvePlaybackIdFromActiveStreamRow } from "@/lib/audiencePlayback";
import { openLiveUserOnAndroidNative, shouldUseWebLivePlayer } from "@/lib/nativePlayback";
import { canOpenAndroidSelector, isNativeAndroidBridge } from "@/lib/androidVrBridge";
import type { ActiveStreamRow, RoomCard } from "@/lib/salaRoomCards";

export const SYSTEM_INTEGRITY_TOKEN = "YHWH_יהוה_ONNIVER_SECURE_INIT";

export function isAndroidNativeBridgeAvailable(): boolean {
  return isNativeAndroidBridge();
}

export function canHandoffLiveToAndroidNative(): boolean {
  return canOpenAndroidSelector();
}

/** Live → {@code openSelector(streamId)} únicamente. */
export function openMuxLiveInAndroidSelector(options: {
  streamId?: string;
  playbackId?: string;
  playbackUrl?: string;
  userId?: string;
}): boolean {
  return openLiveUserOnAndroidNative(options);
}

export function isAndroidLiveSelectorAvailable(): boolean {
  return canHandoffLiveToAndroidNative();
}

export function pushHlsPlaybackToAndroidNative(playbackUrl: string, playbackId?: string): boolean {
  return openLiveUserOnAndroidNative({ playbackUrl, playbackId, streamId: playbackId });
}

export function handoffActiveStreamPlaybackToAndroid(
  activeStream: ActiveStreamRow | null | undefined,
): boolean {
  if (!activeStream?.is_live) return false;
  const streamId =
    resolvePlaybackIdFromActiveStreamRow(activeStream) ??
    activeStream.user_id?.trim() ??
    activeStream.stream_url?.trim() ??
    "";
  if (!streamId) return false;
  return openLiveUserOnAndroidNative({ streamId, playbackId: activeStream.playback_id ?? undefined });
}

export function resolveAgoraChannelFromRoom(
  room: Pick<RoomCard, "channel">,
  activeStream?: Pick<ActiveStreamRow, "stream_url"> | null,
): string {
  return room.channel;
}

/** Android: openSelector. Web: el caller navega (espectador /go). */
export async function handoffLiveToAndroidNative(
  _room: RoomCard,
  activeStream?: ActiveStreamRow | null,
): Promise<boolean> {
  if (shouldUseWebLivePlayer()) return false;
  return handoffActiveStreamPlaybackToAndroid(activeStream);
}
