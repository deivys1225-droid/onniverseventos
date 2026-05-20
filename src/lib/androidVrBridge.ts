/**
 * Única entrada WebView → VR en Android: {@code window.Android.openSelector(streamId)}.
 * El WebView no elige escena; solo indica quién está en vivo (playback_id / user_id / URL HLS).
 */

export function isNativeAndroidBridge(): boolean {
  return typeof window !== "undefined" && typeof window.Android !== "undefined";
}

export function canOpenAndroidSelector(): boolean {
  return isNativeAndroidBridge() && typeof window.Android?.openSelector === "function";
}

/**
 * Abre SelectorActivity (Escena Inmersiva / Pantalla Dividida / Escena Realidad Mixta).
 * @param streamId playback_id Mux, user_id, liveId o URL HLS/MP4
 */
export function openAndroidLiveSelector(streamId: string): boolean {
  const id = streamId.trim();
  if (!id) return false;
  if (!canOpenAndroidSelector()) return false;

  if (import.meta.env.DEV) {
    console.log("[Onniverso] openSelector → SelectorActivity", id.slice(0, 80));
  }

  window.Android!.openSelector!(id);
  return true;
}
