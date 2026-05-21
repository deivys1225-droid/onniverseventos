import { muxPlaybackIdToHlsUrl } from "@/lib/audiencePlayback";

export { handleStreamCardPlay } from "@/lib/streamCardNavigation";
export type { StreamCardPlayOptions } from "@/lib/streamCardNavigation";

/** APK: existe {@code window.Android}. */
export function isNativeAndroid(): boolean {
  if (typeof window === "undefined") return false;
  return typeof window.Android !== "undefined";
}

/** Navegador web únicamente (sin reproductor en APK). */
export function shouldUseWebLivePlayer(): boolean {
  const web = !isNativeAndroid();
  if (!web && import.meta.env.DEV) {
    console.log("[Onniverso] WEB PLAYER BLOCKED ON ANDROID");
  }
  return web;
}

export function canPlayStreamOnAndroidNative(): boolean {
  return isNativeAndroid() && typeof window.Android?.playStream === "function";
}

/** Flujo nativo paralelo: playStream(url) directo, sin React player. */
export function playStreamOnAndroidNative(options: {
  playbackUrl?: string;
  playbackId?: string;
}): boolean {
  if (!canPlayStreamOnAndroidNative()) return false;

  const fromUrl = (options.playbackUrl ?? "").trim();
  const fromId = muxPlaybackIdToHlsUrl(options.playbackId);
  const url = fromUrl || fromId || "";
  if (!url) return false;

  if (import.meta.env.DEV) {
    console.log("[Onniverso] NATIVE playStream", url.slice(0, 80));
  }

  window.Android!.playStream!(url);
  return true;
}
