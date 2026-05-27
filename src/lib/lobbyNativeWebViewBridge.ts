import { useEffect, useRef } from "react";

export type LobbyNativeRect = { x: number; y: number; w: number; h: number };

const MIN_SLOT_PX = 48;
const BOUNDS_STABLE_MS = 1000;
const MIN_WALL_TOP_PX = 40;

const slotGetters = new Map<string, () => LobbyNativeRect | null>();

function installGlobalSlotResolver() {
  if (typeof window === "undefined") return;
  window.__onniversoGetNativeWebViewSlotRect = (slotId?: string) => {
    if (!slotId) return null;
    return slotGetters.get(slotId)?.() ?? null;
  };
}

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
  if (r.width < MIN_SLOT_PX || r.height < MIN_SLOT_PX) return null;
  return {
    x: Math.round(r.left),
    y: Math.round(r.top),
    w: Math.round(r.width),
    h: Math.round(r.height),
  };
}

/** Descarta rects de pantalla completa arriba (fallback viejo / layout aún no listo). */
export function isPlausibleWallSlotRect(rect: LobbyNativeRect): boolean {
  if (typeof window === "undefined") return true;
  const maxH = window.innerHeight * 0.92;
  const maxW = window.innerWidth * 0.92;
  if (rect.h >= maxH && rect.w >= maxW * 0.85) return false;
  if (rect.y < MIN_WALL_TOP_PX && rect.h > window.innerHeight * 0.45) return false;
  return true;
}

function rectDelta(a: LobbyNativeRect, b: LobbyNativeRect): number {
  return Math.max(
    Math.abs(a.x - b.x),
    Math.abs(a.y - b.y),
    Math.abs(a.w - b.w),
    Math.abs(a.h - b.h),
  );
}

export function isLobbyNativeAndroid(): boolean {
  return (
    typeof window !== "undefined" &&
    (typeof window.Android !== "undefined" || typeof window.AndroidBridge !== "undefined")
  );
}

type LobbyNativeOverlayConfig = {
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
  const lastAppliedRef = useRef<LobbyNativeRect | null>(null);
  const onShowRef = useRef(onShow);
  const onHideRef = useRef(onHide);
  const onUpdateBoundsRef = useRef(onUpdateBounds);
  const setRectGlobalRef = useRef(setRectGlobal);
  const setUrlRef = useRef(setUrl);
  const shownRef = useRef(false);

  onShowRef.current = onShow;
  onHideRef.current = onHide;
  onUpdateBoundsRef.current = onUpdateBounds;
  setRectGlobalRef.current = setRectGlobal;
  setUrlRef.current = setUrl;

  useEffect(() => {
    const getRect = () => {
      const fresh = readLobbyNativeSlotRect(slotId);
      if (!fresh || !isPlausibleWallSlotRect(fresh)) return null;
      return fresh;
    };
    registerLobbyNativeSlot(slotId, getRect, legacyId);
    setRectGlobalRef.current?.(getRect);
    return () => {
      unregisterLobbyNativeSlot(slotId, legacyId);
      setRectGlobalRef.current?.(undefined);
      lastAppliedRef.current = null;
      shownRef.current = false;
    };
  }, [slotId, legacyId]);

  useEffect(() => {
    if (url) setUrlRef.current?.(url);
  }, [url]);

  useEffect(() => {
    if (!active) {
      lastAppliedRef.current = null;
      shownRef.current = false;
      onHideRef.current();
      return;
    }

    const trySync = (force: boolean) => {
      const fresh = readLobbyNativeSlotRect(slotId);
      if (!fresh || !isPlausibleWallSlotRect(fresh)) return false;

      const last = lastAppliedRef.current;
      if (!force && last && rectDelta(last, fresh) < 10) {
        return shownRef.current;
      }

      lastAppliedRef.current = fresh;

      if (!shownRef.current) {
        onShowRef.current();
        shownRef.current = true;
      }
      onUpdateBoundsRef.current();
      return true;
    };

    trySync(true);
    const delays = [100, 250, 500, 1000, 2000, 3500];
    const timers = delays.map((ms) => window.setTimeout(() => trySync(false), ms));

    const intervalId = window.setInterval(() => trySync(false), BOUNDS_STABLE_MS);

    const onResize = () => {
      lastAppliedRef.current = null;
      trySync(true);
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);

    return () => {
      timers.forEach((id) => window.clearTimeout(id));
      window.clearInterval(intervalId);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      lastAppliedRef.current = null;
      shownRef.current = false;
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
