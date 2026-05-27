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

/** Celular o APK: {@code onVrClick} si existe el puente (sin depender solo del user-agent). */
export function invokeAndroidLobbyReturnFromMobile(): boolean {
  if (typeof window.Android !== "undefined") {
    return invokeAndroidLobbyReturn();
  }
  if (!isMobileUserAgent()) return false;
  return invokeAndroidLobbyReturn();
}
