import { useMemo, useRef } from "react";
import { COLOSSEO_HOME_URL } from "@/data/coliseoScene";
import {
  COLOSSEO_NATIVE_BROWSER_SLOT_ID,
  useColiseoNativeWebViewSlot,
} from "@/lib/coliseoNativeWebView";

/**
 * Slot de la pantalla flotante: WebView nativo en Android; vacío visible en PC para revisar posición.
 */
export default function ColiseoAndroidWebViewSlot({
  onScreenPointerDown,
}: {
  onScreenPointerDown?: () => void;
}) {
  const nativeSlotRef = useRef<HTMLDivElement | null>(null);
  const useNativeWebView = false;
  const classMp4Url = useMemo(() => {
    if (typeof window === "undefined") return "";
    const raw = new URLSearchParams(window.location.search).get("mp4")?.trim() ?? "";
    return /^https?:\/\//i.test(raw) ? raw : "";
  }, []);
  const browserTargetUrl = classMp4Url || COLOSSEO_HOME_URL;

  useColiseoNativeWebViewSlot(nativeSlotRef, {
    enabled: useNativeWebView,
    url: browserTargetUrl,
    reloadToken: 0,
  });

  return (
    <div
      ref={nativeSlotRef}
      id={COLOSSEO_NATIVE_BROWSER_SLOT_ID}
      data-native-webview-slot={COLOSSEO_NATIVE_BROWSER_SLOT_ID}
      data-coliseo-screen="true"
      onPointerDown={(event) => {
        event.stopPropagation();
        onScreenPointerDown?.();
      }}
      className="relative flex h-full w-full items-center justify-center bg-black/15"
      aria-hidden={useNativeWebView}
    >
      {!useNativeWebView ? (
        classMp4Url ? (
          <video
            key={classMp4Url}
            src={classMp4Url}
            className="h-full w-full bg-black"
            controls
            preload="metadata"
            playsInline
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-black/70 px-4 text-center">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-white/75">
              Esperando video del docente...
            </p>
          </div>
        )
      ) : null}
    </div>
  );
}
