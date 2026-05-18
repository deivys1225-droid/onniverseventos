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
