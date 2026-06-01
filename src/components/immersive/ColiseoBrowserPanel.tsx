import { useMemo, useRef, useState } from "react";
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

  const classVideoUrls = useMemo(() => {
    if (typeof window === "undefined") return [];
    const searchParams = new URLSearchParams(window.location.search);
    const legacyMp4 = searchParams.get("mp4")?.trim() ?? "";
    const allVideoParams = searchParams
      .getAll("video")
      .map((item) => item.trim())
      .filter((item) => /^https?:\/\//i.test(item));
    const merged = legacyMp4 ? [legacyMp4, ...allVideoParams] : allVideoParams;
    return Array.from(new Set(merged.filter((item) => /^https?:\/\//i.test(item))));
  }, []);
  const [videoIndex, setVideoIndex] = useState(0);
  const activeVideoUrl =
    classVideoUrls.length > 0 ? classVideoUrls[Math.max(0, Math.min(videoIndex, classVideoUrls.length - 1))] : "";
  const browserTargetUrl = activeVideoUrl || COLOSSEO_HOME_URL;

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
        activeVideoUrl ? (
          <div className="relative h-full w-full bg-black">
            <video
              key={activeVideoUrl}
              src={activeVideoUrl}
              className="h-full w-full bg-black"
              controls
              preload="metadata"
              playsInline
            />
            {classVideoUrls.length > 1 ? (
              <div className="absolute bottom-2 left-2 right-2 z-10 flex items-center justify-between gap-2 rounded bg-black/65 p-2 text-[11px] text-cyan-100">
                <button
                  type="button"
                  className="rounded border border-cyan-400/40 px-2 py-1 hover:bg-cyan-500/15"
                  onClick={() => setVideoIndex((prev) => (prev <= 0 ? classVideoUrls.length - 1 : prev - 1))}
                >
                  Anterior
                </button>
                <span>
                  Video {Math.min(videoIndex + 1, classVideoUrls.length)} / {classVideoUrls.length}
                </span>
                <button
                  type="button"
                  className="rounded border border-cyan-400/40 px-2 py-1 hover:bg-cyan-500/15"
                  onClick={() => setVideoIndex((prev) => (prev + 1) % classVideoUrls.length)}
                >
                  Siguiente
                </button>
              </div>
            ) : null}
          </div>
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
