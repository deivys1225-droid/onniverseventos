import { useEffect, type RefObject } from "react";
import { isNativeAndroid } from "@/lib/nativePlayback";

export const COLOSSEO_NATIVE_BROWSER_SLOT_ID = "coliseo-browser-screen";

declare global {
  interface Window {
    __onniversoGetColiseoBrowserRect?: () => { x: number; y: number; w: number; h: number } | null;
  }
}

export function isColiseoNativeWebViewAvailable(): boolean {
  return (
    isNativeAndroid() &&
    typeof window.Android?.showColiseoBrowserWebView === "function" &&
    typeof window.Android?.hideColiseoBrowserWebView === "function" &&
    typeof window.Android?.loadColiseoBrowserUrl === "function"
  );
}

export function loadColiseoNativeBrowserUrl(url: string) {
  window.Android?.loadColiseoBrowserUrl?.(url);
}

/** WebView nativo Android alineado al slot 2D del Coliseo (YouTube). */
export function useColiseoNativeWebViewSlot(
  slotRef: RefObject<HTMLElement | null>,
  options: { enabled: boolean; url: string; reloadToken: number },
) {
  const { enabled, url, reloadToken } = options;
  const isNative = isColiseoNativeWebViewAvailable();

  useEffect(() => {
    if (!isNative) return;

    const getRect = () => {
      const el =
        document.getElementById(COLOSSEO_NATIVE_BROWSER_SLOT_ID) ?? slotRef.current;
      if (!el) return null;
      const r = el.getBoundingClientRect();
      if (r.width < 8 || r.height < 8) return null;
      return {
        x: Math.round(r.left),
        y: Math.round(r.top),
        w: Math.round(r.width),
        h: Math.round(r.height),
      };
    };

    window.__onniversoGetColiseoBrowserRect = getRect;
    return () => {
      delete window.__onniversoGetColiseoBrowserRect;
    };
  }, [isNative, slotRef]);

  useEffect(() => {
    if (!isNative) return;

    if (!enabled) {
      window.Android?.hideColiseoBrowserWebView?.();
      return;
    }

    const sync = () => {
      if (!window.Android) return;
      window.Android.showColiseoBrowserWebView?.();
      loadColiseoNativeBrowserUrl(url);
      window.Android.updateColiseoBrowserBounds?.();
    };

    sync();
    const retryIds = [80, 200, 450, 900, 1800, 3000].map((ms) => window.setTimeout(sync, ms));
    const intervalId = window.setInterval(() => {
      window.Android?.updateColiseoBrowserBounds?.();
    }, 200);
    window.addEventListener("resize", sync);
    window.addEventListener("orientationchange", sync);

    return () => {
      retryIds.forEach((id) => window.clearTimeout(id));
      window.clearInterval(intervalId);
      window.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", sync);
      window.Android?.hideColiseoBrowserWebView?.();
    };
  }, [isNative, enabled, url, reloadToken]);
}
