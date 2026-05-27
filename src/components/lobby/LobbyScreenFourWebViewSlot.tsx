import { memo, useEffect, useRef } from "react";

declare global {
  interface Window {
    __onniversoGetNativeWebViewSlotRect?: (slotId?: string) => { x: number; y: number; w: number; h: number } | null;
    __onniversoGetLobbyScreen4Rect?: () => { x: number; y: number; w: number; h: number } | null;
  }
}

const LOBBY_SCREEN4_SLOT_ID = "lobby-screen-4";
const LOBBY_SCREEN4_SLOT_LEGACY_ID = "onni-native-webview-lobby-screen-4";

export const LobbyScreenFourWebViewSlot = memo(function LobbyScreenFourWebViewSlot({
  width,
  height,
}: {
  width: number;
  height: number;
}) {
  const slotRef = useRef<HTMLDivElement | null>(null);
  const isNativeAndroidSlot =
    typeof window !== "undefined" &&
    (typeof window.Android !== "undefined" || typeof window.AndroidBridge !== "undefined");

  useEffect(() => {
    if (!isNativeAndroidSlot) return;

    const getRectById = (requestedId?: string) => {
      const normalizedId =
        !requestedId || requestedId === LOBBY_SCREEN4_SLOT_LEGACY_ID ? LOBBY_SCREEN4_SLOT_ID : requestedId;
      const el = document.getElementById(normalizedId);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        x: Math.round(r.left),
        y: Math.round(r.top),
        w: Math.round(r.width),
        h: Math.round(r.height),
      };
    };

    window.__onniversoGetNativeWebViewSlotRect = (slotId?: string) => getRectById(slotId);
    window.__onniversoGetLobbyScreen4Rect = () => getRectById(LOBBY_SCREEN4_SLOT_ID);

    return () => {
      slotRef.current = null;
    };
  }, [isNativeAndroidSlot]);

  useEffect(() => {
    if (!isNativeAndroidSlot) return;

    const syncBounds = () => {
      if (!window.Android) return;
      // Compat: intenta API dedicada de pantalla 4 y luego fallback a la API genérica.
      window.Android.showLobbyScreen4?.();
      window.Android.showLobbyScreen?.();
      window.Android.updateLobby4Bounds?.();
      window.Android.updateLobbyBounds?.();
    };

    window.requestAnimationFrame(syncBounds);
    window.setTimeout(syncBounds, 120);
    window.setTimeout(syncBounds, 420);
    const intervalId = window.setInterval(syncBounds, 120);
    window.addEventListener("resize", syncBounds);
    window.addEventListener("scroll", syncBounds, true);
    window.addEventListener("orientationchange", syncBounds);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("resize", syncBounds);
      window.removeEventListener("scroll", syncBounds, true);
      window.removeEventListener("orientationchange", syncBounds);
      window.Android?.hideLobbyScreen4?.();
    };
  }, [isNativeAndroidSlot]);

  return (
    <div
      ref={slotRef}
      id={LOBBY_SCREEN4_SLOT_ID}
      data-native-webview-slot={LOBBY_SCREEN4_SLOT_ID}
      style={{
        width,
        height,
        background: "#02030a",
        borderRadius: 10,
        border: "1px solid rgba(34,211,238,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#7dd3fc",
        fontFamily: "system-ui, sans-serif",
        fontSize: 11,
        textAlign: "center",
        padding: 10,
        boxSizing: "border-box",
        userSelect: "none",
        contain: "strict",
      }}
    >
      Pantalla 4: WebView nativo.
    </div>
  );
});

