import { useEffect, useRef } from "react";

export type LobbyNativeRect = { x: number; y: number; w: number; h: number };

const slotGetters = new Map<string, () => LobbyNativeRect | null>();

function installGlobalSlotResolver() {
  if (typeof window === "undefined") return;
  window.__onniversoGetNativeWebViewSlotRect = (slotId?: string) => {
    if (!slotId) return null;
    return slotGetters.get(slotId)?.() ?? null;
  };
}

/** Registra un slot DOM para que Android lea su rect con {@code getNativeWebViewSlotRect(id)}. */
export function registerLobbyNativeSlot(
  slotId: string,
  getRect: () => LobbyNativeRect | null,
  legacyId?: string,
) {
  slotGetters.set(slotId, getRect);
  if (legacyId) slotGetters.set(legacyId, getRect);
  installGlobalSlotResolver();
}

export function unregisterLobbyNativeSlot(slotId: string, legacyId?: string) {
  slotGetters.delete(slotId);
  if (legacyId) slotGetters.delete(legacyId);
}

export function readLobbyNativeSlotRect(slotId: string): LobbyNativeRect | null {
  const el = document.getElementById(slotId);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return null;
  return {
    x: Math.round(r.left),
    y: Math.round(r.top),
    w: Math.round(r.width),
    h: Math.round(r.height),
  };
}

export function isLobbyNativeAndroid(): boolean {
  return (
    typeof window !== "undefined" &&
    (typeof window.Android !== "undefined" || typeof window.AndroidBridge !== "undefined")
  );
}

/** Sincroniza bounds solo al enfocar y en resize; sin intervalo (no sigue la cámara al caminar). */
function runLobbyNativeBoundsSyncOnce(syncBounds: () => void): () => void {
  window.requestAnimationFrame(syncBounds);
  const t1 = window.setTimeout(syncBounds, 80);
  const t2 = window.setTimeout(syncBounds, 240);
  const onResize = () => syncBounds();
  window.addEventListener("resize", onResize);
  window.addEventListener("orientationchange", onResize);
  return () => {
    window.clearTimeout(t1);
    window.clearTimeout(t2);
    window.removeEventListener("resize", onResize);
    window.removeEventListener("orientationchange", onResize);
  };
}

type LobbyNativeOverlayConfig = {
  /** Pantalla enfocada (usuario tocó la pantalla); si false se oculta el WebView nativo. */
  active: boolean;
  slotId: string;
  legacyId?: string;
  setRectGlobal?: (getter: (() => LobbyNativeRect | null) | undefined) => void;
  onShow: () => void;
  onHide: () => void;
  onUpdateBounds: () => void;
  setUrl?: (url: string) => void;
  url?: string;
};

/**
 * WebView nativo fijo en la pared: solo visible con {@code active}, rect congelado al enfocar
 * para que no se mueva ni cambie de tamaño al caminar por el lobby.
 */
export function useLobbyNativeOverlay({
  active,
  slotId,
  legacyId,
  setRectGlobal,
  onShow,
  onHide,
  onUpdateBounds,
  setUrl,
  url,
}: LobbyNativeOverlayConfig) {
  const frozenRectRef = useRef<LobbyNativeRect | null>(null);
  const onShowRef = useRef(onShow);
  const onHideRef = useRef(onHide);
  const onUpdateBoundsRef = useRef(onUpdateBounds);
  const setRectGlobalRef = useRef(setRectGlobal);
  const setUrlRef = useRef(setUrl);

  onShowRef.current = onShow;
  onHideRef.current = onHide;
  onUpdateBoundsRef.current = onUpdateBounds;
  setRectGlobalRef.current = setRectGlobal;
  setUrlRef.current = setUrl;

  useEffect(() => {
    const getRect = () => {
      if (frozenRectRef.current) return frozenRectRef.current;
      const fresh = readLobbyNativeSlotRect(slotId);
      if (fresh) frozenRectRef.current = fresh;
      return fresh;
    };
    registerLobbyNativeSlot(slotId, getRect, legacyId);
    setRectGlobalRef.current?.(getRect);
    return () => {
      unregisterLobbyNativeSlot(slotId, legacyId);
      setRectGlobalRef.current?.(undefined);
      frozenRectRef.current = null;
    };
  }, [slotId, legacyId]);

  useEffect(() => {
    if (url) setUrlRef.current?.(url);
  }, [url]);

  useEffect(() => {
    if (!active) {
      frozenRectRef.current = null;
      onHideRef.current();
      return;
    }

    frozenRectRef.current = null;

    const sync = () => {
      const fresh = readLobbyNativeSlotRect(slotId);
      if (fresh) frozenRectRef.current = fresh;
      onShowRef.current();
      onUpdateBoundsRef.current();
    };

    const stop = runLobbyNativeBoundsSyncOnce(sync);
    return () => {
      stop();
      frozenRectRef.current = null;
      onHideRef.current();
    };
  }, [active, slotId]);
}

declare global {
  interface Window {
    __onniversoGetNativeWebViewSlotRect?: (slotId?: string) => LobbyNativeRect | null;
    __onniversoGetLobbyScreen2Rect?: () => LobbyNativeRect | null;
    __onniversoGetLobbyScreen4Rect?: () => LobbyNativeRect | null;
  }
}
