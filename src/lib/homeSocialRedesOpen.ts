import { isNativeAndroid } from "@/lib/nativePlayback";

/** Selector Cine / Cine Cam solo en APK (WebView nativo). En PC se abre el enlace directo. */
export function shouldShowHomeSocialCinePicker(): boolean {
  if (!isNativeAndroid()) return false;
  return (
    typeof window.Android?.openVrRedes === "function" &&
    typeof window.Android?.openRedesCamDirect === "function"
  );
}

/** Abre red social en modo Redes (VR). */
export function openHomeSocialRedes(url: string): void {
  const target = url.trim();
  if (!target) return;

  if (typeof window.Android !== "undefined") {
    if (typeof window.Android.openVrRedes === "function") {
      window.Android.openVrRedes(target);
      return;
    }
  }

  window.open(target, "_blank", "noopener,noreferrer");
}

/** Abre red social en modo Redes Cam. */
export function openHomeSocialRedesCam(url: string): void {
  const target = url.trim();
  if (!target) return;

  if (typeof window.Android !== "undefined") {
    if (typeof window.Android.openRedesCamDirect === "function") {
      window.Android.openRedesCamDirect(target);
      return;
    }
  }

  window.open(target, "_blank", "noopener,noreferrer");
}
