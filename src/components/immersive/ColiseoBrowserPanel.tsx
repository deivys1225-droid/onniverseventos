import { useMemo, useRef, useState } from "react";
import { COLOSSEO_HOME_URL } from "@/data/coliseoScene";
import { SALA_MP4_URL_BY_ID } from "@/data/salaVideoUrls";
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
  const coliseoPlaylist = useMemo(
    () => Array.from(new Set(Object.values(SALA_MP4_URL_BY_ID).filter((url) => /^https?:\/\//.test(url)))),
    [],
  );
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const coliseoFallbackMp4 = coliseoPlaylist[currentVideoIndex] ?? SALA_MP4_URL_BY_ID["vr-360"];

  const handleNextVideo = () => {
    if (coliseoPlaylist.length <= 1) return;
    setCurrentVideoIndex((prev) => (prev + 1) % coliseoPlaylist.length);
  };

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
      data-coliseo-screen="true"
      onPointerDown={(event) => {
        event.stopPropagation();
        onScreenPointerDown?.();
      }}
      className="relative flex h-full w-full items-center justify-center bg-black/15"
      aria-hidden={useNativeWebView}
    >
      {!useNativeWebView ? (
        <>
          <video
            key={coliseoFallbackMp4}
            src={coliseoFallbackMp4}
            className="h-full w-full bg-black"
            controls
            preload="metadata"
            playsInline
          />
          {coliseoPlaylist.length > 1 && (
            <button
              type="button"
              onClick={handleNextVideo}
              className="absolute bottom-2 right-2 rounded-md border border-white/25 bg-black/60 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white hover:bg-black/75"
            >
              Siguiente video
            </button>
          )}
        </>
      ) : null}
    </div>
  );
}
