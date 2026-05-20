import { openAndroidLiveSelector, canOpenAndroidSelector, isNativeAndroidBridge } from "@/lib/androidVrBridge";
import { muxPlaybackIdToHlsUrl } from "@/lib/audiencePlayback";

export { handleStreamCardPlay } from "@/lib/streamCardNavigation";
export type { StreamCardPlayOptions } from "@/lib/streamCardNavigation";
export { openAndroidLiveSelector, canOpenAndroidSelector, isNativeAndroidBridge } from "@/lib/androidVrBridge";

/** APK: existe {@code window.Android}. */
export function isNativeAndroid(): boolean {
  return isNativeAndroidBridge();
}

/** Navegador web únicamente (sin reproductor en APK). */
export function shouldUseWebLivePlayer(): boolean {
  const web = !isNativeAndroid();
  if (!web && import.meta.env.DEV) {
    console.log("[Onniverso] WEB PLAYER BLOCKED ON ANDROID");
  }
  return web;
}

/** @deprecated Usar {@link canOpenAndroidSelector} */
export function canPlayStreamOnAndroidNative(): boolean {
  return canOpenAndroidSelector();
}

/**
 * Live en Android: solo {@code openSelector(streamId)} — sin elegir escena desde JS.
 */
export function openLiveUserOnAndroidNative(options: {
  streamId?: string;
  playbackId?: string;
  playbackUrl?: string;
  userId?: string;
}): boolean {
  const fromId = (options.streamId ?? options.playbackId ?? options.userId ?? "").trim();
  if (fromId) {
    return openAndroidLiveSelector(fromId);
  }
  const url = (options.playbackUrl ?? "").trim() || muxPlaybackIdToHlsUrl(options.playbackId) || "";
  if (url) {
    return openAndroidLiveSelector(url);
  }
  return false;
}

/** Alias legacy — redirige a {@link openLiveUserOnAndroidNative}. */
export function playStreamOnAndroidNative(options: {
  playbackUrl?: string;
  playbackId?: string;
  streamId?: string;
  userId?: string;
}): boolean {
  return openLiveUserOnAndroidNative(options);
}
