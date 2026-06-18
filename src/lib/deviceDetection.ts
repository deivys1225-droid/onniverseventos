import { Capacitor } from "@capacitor/core";

export type DeviceKind = "mobile" | "desktop";

export function detectDeviceKind(): DeviceKind {
  if (typeof window === "undefined") return "desktop";
  const ua = (navigator.userAgent || "").toLowerCase();
  const isMobileUa = /android|iphone|ipad|ipod|windows phone|mobile/i.test(ua);
  const coarsePointer = window.matchMedia?.("(pointer: coarse)")?.matches ?? false;
  const narrowScreen = window.matchMedia?.("(max-width: 900px)")?.matches ?? false;
  return isMobileUa || (coarsePointer && narrowScreen) ? "mobile" : "desktop";
}

/** Celular/tablet por user-agent (no ventana estrecha en PC). */
export function isMobileUserAgent(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = (navigator.userAgent || "").toLowerCase();
  return /android|iphone|ipad|ipod|windows phone|mobile/i.test(ua);
}

/** APK Android (Capacitor), no solo navegador móvil. */
export function isAndroidNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}

/**
 * ViveVR / WebView OnniVers con puente de voz nativo (APK en celular).
 * Incluye Capacitor y WebView que carga onnivers.online con AndroidBridge.
 */
export function isOnniAndroidVoice(): boolean {
  if (typeof window === "undefined") return false;
  if (isAndroidNativeApp()) return true;
  const bridge = window.AndroidBridge as { startListening?: () => void } | undefined;
  const android = window.Android as { startListening?: () => void } | undefined;
  const hasVoiceBridge =
    typeof bridge?.startListening === "function" || typeof android?.startListening === "function";
  return hasVoiceBridge && isMobileUserAgent();
}

/** Botón «Descargar app» en navbar: solo PC con navegador (no APK ni móvil). */
export function isDesktopWebBrowser(): boolean {
  if (typeof window === "undefined") return false;
  if (isAndroidNativeApp()) return false;
  if (typeof window.Android !== "undefined" || typeof window.AndroidBridge !== "undefined") {
    return false;
  }
  return detectDeviceKind() === "desktop";
}
