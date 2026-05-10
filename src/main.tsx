import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { App as CapacitorApp } from "@capacitor/app";
import html2canvas from "html2canvas";
import App from "./App.tsx";
import "./index.css";

declare global {
  interface Window {
    /** Solo Android: llama {@code AndroidBridge.abrirMiSelectorNativo()} (sin cargar página). */
    irAlSelectorNativo?: () => void;
    AndroidBridge?: {
      abrirMiSelectorNativo?: () => void;
      onVrClick?: (mp4Url?: string) => void;
      on360Click?: (mp4Url?: string) => void;
      onMtClick?: (mp4Url?: string) => void;
    };
    /** Puente AR / VR: registrados en MainActivity como {@code Android}. */
    Android?: {
      onArClick(url?: string): void;
      /** Interruptor modo estereoscópico (SBS) — WebView → nativo puede reinyectar {@link __onniversoToggleVrMode}. */
      onVrModeClick(): void;
    };
    /** Alterna el modo VR duplicado (canvas SBS) — usable desde JS y desde {@code evaluateJavascript} tras {@code Android.onVrModeClick}. */
    __onniversoToggleVrMode?: () => void;
  }
}

/** Android: solo puente nativo (AlertDialog escena). PC: no-op (usa toast desde UI si hace falta). */
function irAlSelectorNativo() {
  const bridge = typeof window.AndroidBridge !== "undefined" ? window.AndroidBridge : undefined;
  if (bridge != null && typeof bridge.abrirMiSelectorNativo === "function") {
    bridge.abrirMiSelectorNativo();
  }
}

window.irAlSelectorNativo = irAlSelectorNativo;

function MirrorSbsRoot() {
  const [vrMode, setVrMode] = useState(false);
  const [hasFrame, setHasFrame] = useState(false);

  useEffect(() => {
    window.__onniversoToggleVrMode = () => setVrMode((v) => !v);
    return () => {
      delete window.__onniversoToggleVrMode;
    };
  }, []);
  const sourceHostRef = useRef<HTMLDivElement | null>(null);
  const masterCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const leftEyeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rightEyeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const leftEyeRef = useRef<HTMLDivElement | null>(null);
  const rightEyeRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const { pushState, replaceState } = window.history;

    window.history.pushState = function patchedPushState(...args) {
      pushState.apply(window.history, args);
      window.dispatchEvent(new PopStateEvent("popstate"));
    };

    window.history.replaceState = function patchedReplaceState(...args) {
      replaceState.apply(window.history, args);
      window.dispatchEvent(new PopStateEvent("popstate"));
    };

    return () => {
      window.history.pushState = pushState;
      window.history.replaceState = replaceState;
    };
  }, []);

  useEffect(() => {
    const isAllowedWebHost = (host: string): boolean => {
      const normalizedHost = host.trim().toLowerCase();
      if (!normalizedHost) return false;
      if (normalizedHost === "onniverso.com" || normalizedHost === "www.onniverso.com") return true;
      if (normalizedHost === "localhost" || normalizedHost === "127.0.0.1") return true;
      return false;
    };

    const normalizeDeepLinkPath = (incomingUrl: string): string | null => {
      try {
        const u = new URL(incomingUrl);
        // onniverso://open?url=<destino>: conserva navegación interna de la web.
        if (u.protocol === "onniverso:" && u.hostname === "open") {
          const inner = u.searchParams.get("url");
          if (!inner) return null;
          try {
            const innerUrl = new URL(inner);
            if (innerUrl.protocol === "https:" && isAllowedWebHost(innerUrl.hostname)) {
              return `${innerUrl.pathname}${innerUrl.search}${innerUrl.hash}`;
            }
          } catch {
            return null;
          }
        }
      } catch {
        return null;
      }
      return null;
    };

    const applyPath = (path: string | null) => {
      if (!path) return;
      if (window.location.pathname + window.location.search + window.location.hash === path) return;
      window.history.pushState({}, "", path);
      window.dispatchEvent(new PopStateEvent("popstate"));
    };

    void CapacitorApp.getLaunchUrl().then(({ url }) => {
      applyPath(normalizeDeepLinkPath(url ?? ""));
    });

    const sub = CapacitorApp.addListener("appUrlOpen", ({ url }) => {
      applyPath(normalizeDeepLinkPath(url));
    });

    return () => {
      void sub.then((s) => s.remove());
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle("vr-mode-active", vrMode);
    return () => document.body.classList.remove("vr-mode-active");
  }, [vrMode]);

  useEffect(() => {
    if (!vrMode) {
      setHasFrame(false);
      return;
    }

    const sourceHost = sourceHostRef.current;
    const masterCanvas = masterCanvasRef.current;
    const leftCanvas = leftEyeCanvasRef.current;
    const rightCanvas = rightEyeCanvasRef.current;
    if (!sourceHost || !masterCanvas || !leftCanvas || !rightCanvas) return;

    const masterCtx = masterCanvas.getContext("2d", { alpha: false });
    const leftCtx = leftCanvas.getContext("2d", { alpha: false });
    const rightCtx = rightCanvas.getContext("2d", { alpha: false });
    if (!masterCtx || !leftCtx || !rightCtx) return;

    let rafId = 0;
    let framePainted = false;
    const targetCaptureFps = vrMode ? 24 : 60;
    const minCaptureIntervalMs = 1000 / targetCaptureFps;
    let lastCaptureAt = 0;

    const syncCanvasSize = (canvas: HTMLCanvasElement) => {
      // VR stereo: force 1:1 pixels — prioritize FPS over sharpness (mirror capture path).
      const dpr = vrMode ? 1 : Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(2, Math.floor(canvas.clientWidth * dpr));
      const height = Math.max(2, Math.floor(canvas.clientHeight * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
    };

    /** Misma imagen 2D en ambos ojos: sin estéreo ni distorsión (espejo duplicado). */
    const drawEye = (ctx: CanvasRenderingContext2D, target: HTMLCanvasElement) => {
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, target.width, target.height);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = vrMode ? "low" : "high";
      ctx.drawImage(masterCanvas, 0, 0, masterCanvas.width, masterCanvas.height, 0, 0, target.width, target.height);
    };

    let captureInFlight = false;
    const render = () => {
      syncCanvasSize(leftCanvas);
      syncCanvasSize(rightCanvas);
      drawEye(leftCtx, leftCanvas);
      drawEye(rightCtx, rightCanvas);

      const now = performance.now();
      const canCaptureNow = now - lastCaptureAt >= minCaptureIntervalMs;
      if (!captureInFlight && canCaptureNow) {
        captureInFlight = true;
        lastCaptureAt = now;
        void html2canvas(sourceHost, {
          backgroundColor: "#000000",
          useCORS: true,
          // In VR mirror mode we intentionally lower capture resolution for stable frame pacing.
          scale: vrMode ? 0.5 : 1,
          logging: false,
        })
          .then((snapshot) => {
            if (masterCanvas.width !== snapshot.width || masterCanvas.height !== snapshot.height) {
              masterCanvas.width = snapshot.width;
              masterCanvas.height = snapshot.height;
            }

            masterCtx.clearRect(0, 0, masterCanvas.width, masterCanvas.height);
            masterCtx.drawImage(snapshot, 0, 0, masterCanvas.width, masterCanvas.height);
            if (!framePainted) {
              framePainted = true;
              setHasFrame(true);
            }
          })
          .finally(() => {
            captureInFlight = false;
          });
      }

      rafId = window.requestAnimationFrame(render);
    };

    rafId = window.requestAnimationFrame(render);
    return () => window.cancelAnimationFrame(rafId);
  }, [vrMode]);

  useEffect(() => {
    if (!vrMode || !hasFrame) return;

    const sourceHost = sourceHostRef.current;
    const leftEye = leftEyeRef.current;
    const rightEye = rightEyeRef.current;
    if (!sourceHost || !leftEye || !rightEye) return;

    const forwardPointer = (event: PointerEvent | MouseEvent | WheelEvent, eye: HTMLElement) => {
      const eyeRect = eye.getBoundingClientRect();
      const sourceRect = sourceHost.getBoundingClientRect();
      if (eyeRect.width <= 0 || eyeRect.height <= 0 || sourceRect.width <= 0 || sourceRect.height <= 0) return;

      const normX = (event.clientX - eyeRect.left) / eyeRect.width;
      const normY = (event.clientY - eyeRect.top) / eyeRect.height;
      const sourceX = sourceRect.left + normX * sourceRect.width;
      const sourceY = sourceRect.top + normY * sourceRect.height;

      const panels = document.querySelectorAll(".sbs-eye, .sbs-eye-canvas");
      sourceHost.style.pointerEvents = "auto";
      panels.forEach((el) => ((el as HTMLElement).style.pointerEvents = "none"));
      const rawTarget = document.elementFromPoint(sourceX, sourceY) as HTMLElement | null;
      panels.forEach((el) => ((el as HTMLElement).style.pointerEvents = "auto"));
      sourceHost.style.pointerEvents = "none";
      if (!rawTarget) return;

      const interactiveTarget =
        rawTarget.closest("button, a, [role='button'], input, select, textarea, label") ??
        rawTarget;

      const findScrollableAncestor = (el: HTMLElement | null) => {
        let node: HTMLElement | null = el;
        while (node && node !== sourceHost) {
          const style = window.getComputedStyle(node);
          const canScrollY =
            (style.overflowY === "auto" || style.overflowY === "scroll") &&
            node.scrollHeight > node.clientHeight;
          const canScrollX =
            (style.overflowX === "auto" || style.overflowX === "scroll") &&
            node.scrollWidth > node.clientWidth;
          if (canScrollY || canScrollX) return node;
          node = node.parentElement;
        }
        return sourceHost;
      };

      if (event.type === "click") {
        interactiveTarget.click();
        return;
      }

      if (event instanceof WheelEvent) {
        const scrollHost = findScrollableAncestor(rawTarget);
        scrollHost.scrollTop += event.deltaY;
        scrollHost.scrollLeft += event.deltaX;
        interactiveTarget.dispatchEvent(
          new WheelEvent("wheel", {
            bubbles: true,
            cancelable: true,
            clientX: sourceX,
            clientY: sourceY,
            deltaX: event.deltaX,
            deltaY: event.deltaY,
            deltaZ: event.deltaZ,
            deltaMode: event.deltaMode,
          }),
        );
        return;
      }

      if (event instanceof PointerEvent) {
        interactiveTarget.dispatchEvent(
          new PointerEvent(event.type, {
            bubbles: true,
            cancelable: true,
            clientX: sourceX,
            clientY: sourceY,
            pointerId: event.pointerId,
            pointerType: event.pointerType,
            isPrimary: event.isPrimary,
            pressure: event.pressure,
            button: event.button,
            buttons: event.buttons,
          }),
        );
        if (event.type === "pointerup") {
          interactiveTarget.click();
        }
      }

      const type = event.type === "pointerdown" ? "mousedown" : event.type === "pointerup" ? "mouseup" : "mousemove";
      interactiveTarget.dispatchEvent(
        new MouseEvent(type, {
          bubbles: true,
          cancelable: true,
          clientX: sourceX,
          clientY: sourceY,
          button: (event as MouseEvent).button ?? 0,
          buttons: (event as MouseEvent).buttons ?? 1,
        }),
      );
    };

    const bindEye = (eye: HTMLElement) => {
      const onPointerDown = (e: PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();
        forwardPointer(e, eye);
      };
      const onPointerUp = (e: PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();
        forwardPointer(e, eye);
      };
      const onClick = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        forwardPointer(e, eye);
      };
      const onWheel = (e: WheelEvent) => {
        e.preventDefault();
        e.stopPropagation();
        forwardPointer(e, eye);
      };

      eye.addEventListener("pointerdown", onPointerDown, { passive: false });
      eye.addEventListener("pointerup", onPointerUp, { passive: false });
      eye.addEventListener("click", onClick, { passive: false });
      eye.addEventListener("wheel", onWheel, { passive: false });

      return () => {
        eye.removeEventListener("pointerdown", onPointerDown);
        eye.removeEventListener("pointerup", onPointerUp);
        eye.removeEventListener("click", onClick);
        eye.removeEventListener("wheel", onWheel);
      };
    };

    const unbindLeft = bindEye(leftEye);
    const unbindRight = bindEye(rightEye);
    return () => {
      unbindLeft();
      unbindRight();
    };
  }, [vrMode, hasFrame]);

  return (
    <div id="mirror-body" className={`${vrMode ? "sbs-active" : ""} ${vrMode && hasFrame ? "sbs-ready" : ""}`}>
      <div className="sbs-panels">
        <div id="mirror-source" ref={sourceHostRef} className="sbs-source">
          <App />
        </div>
        <canvas ref={masterCanvasRef} className="sbs-master-canvas" aria-hidden="true" />
        {vrMode && <div className="sbs-vr-backdrop" aria-hidden="true" />}
        {vrMode && (
          <>
            <div className="sbs-eye sbs-eye-left" ref={leftEyeRef}>
              <canvas ref={leftEyeCanvasRef} className="sbs-eye-canvas" aria-hidden="true" />
            </div>
            <div className="sbs-eye sbs-eye-right" ref={rightEyeRef}>
              <canvas ref={rightEyeCanvasRef} className="sbs-eye-canvas" aria-hidden="true" />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<MirrorSbsRoot />);
