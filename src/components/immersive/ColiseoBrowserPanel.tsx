import { useRef } from "react";
import { COLOSSEO_HOME_URL } from "@/data/coliseoScene";
import {
  COLOSSEO_NATIVE_BROWSER_SLOT_ID,
  isColiseoNativeWebViewAvailable,
  useColiseoNativeWebViewSlot,
} from "@/lib/coliseoNativeWebView";

/**
 * Slot de la pantalla flotante: WebView nativo en Android; vacío visible en PC para revisar posición.
 */
export default function ColiseoAndroidWebViewSlot() {
  const nativeSlotRef = useRef<HTMLDivElement | null>(null);
  const useNativeWebView = isColiseoNativeWebViewAvailable();

  useColiseoNativeWebViewSlot(nativeSlotRef, {
    enabled: useNativeWebView,
    url: COLOSSEO_HOME_URL,
    reloadToken: 0,
  });

  return (
    <div
      ref={nativeSlotRef}
      id={COLOSSEO_NATIVE_BROWSER_SLOT_ID}
      data-native-webview-slot={COLOSSEO_NATIVE_BROWSER_SLOT_ID}
      className="flex h-full w-full items-center justify-center bg-black/15"
      aria-hidden={useNativeWebView}
    >
      {!useNativeWebView && (
        <span className="pointer-events-none px-2 text-center text-[10px] uppercase tracking-wider text-amber-200/50">
          Aquí va el WebView (Android)
        </span>
      )}
    </div>
  );
}
