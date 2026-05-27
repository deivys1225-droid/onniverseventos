import { isMobileUserAgent } from "@/lib/deviceDetection";

/**
 * {@code window.Android.onVrClick()} — retorno al menú en APK / WebView Android.
 */
export function invokeAndroidOnVrClick(): boolean {
  if (typeof window.Android === "undefined") return false;
  if (typeof window.Android.onVrClick !== "function") return false;
  window.Android.onVrClick();
  return true;
}

/**
 * Salida del lobby inmersivo en celular: solo {@code onVrClick}; fallback {@code openSelector}.
 */
export function invokeAndroidLobbyReturn(): boolean {
  if (invokeAndroidOnVrClick()) return true;
  if (typeof window.Android === "undefined") return false;
  if (typeof window.Android.openSelector === "function") {
    window.Android.openSelector();
    return true;
  }
  return false;
}

/** En celular con puente Android: prioriza {@code onVrClick}. */
export function invokeAndroidLobbyReturnFromMobile(): boolean {
  if (!isMobileUserAgent() && typeof window.Android === "undefined") return false;
  return invokeAndroidLobbyReturn();
}
