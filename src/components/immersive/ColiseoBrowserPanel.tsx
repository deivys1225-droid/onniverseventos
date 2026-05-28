import { useRef } from "react";
import { COLOSSEO_HOME_URL } from "@/data/coliseoScene";
import {
  COLOSSEO_NATIVE_BROWSER_SLOT_ID,
  isColiseoNativeWebViewAvailable,
  useColiseoNativeWebViewSlot,
} from "@/lib/coliseoNativeWebView";

/**
 * Solo Android/APK: slot transparente para el WebView nativo (YouTube).
 * En PC/web no se renderiza nada.
 */
export default function ColiseoAndroidWebViewSlot() {
  const nativeSlotRef = useRef<HTMLDivElement | null>(null);
  const useNativeWebView = isColiseoNativeWebViewAvailable();

  useColiseoNativeWebViewSlot(nativeSlotRef, {
    enabled: useNativeWebView,
    url: COLOSSEO_HOME_URL,
    reloadToken: 0,
  });

  if (!useNativeWebView) return null;

  return (
    <div
      ref={nativeSlotRef}
      id={COLOSSEO_NATIVE_BROWSER_SLOT_ID}
      data-native-webview-slot={COLOSSEO_NATIVE_BROWSER_SLOT_ID}
      className="h-full w-full"
      aria-hidden
    />
  );
}
