import { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { App as CapacitorApp } from "@capacitor/app";
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
      /** URL .m3u8 Mux + OPEN_STREAM | OPEN_STREAM_CAM */
      openStreamDirect?: (m3u8Url: string, action: string) => void;
      /** URL sala .m3u8 | .mp4 + OPEN_SALA_DIVIDIDA | OPEN_SALA_MIXTA | OPEN_SALA_360 */
      openSalaDirect?: (salaUrl: string, action: string) => void;
      /** Abre AulaVirtualActivity nativa (estéreo); parámetros legacy ignorados. */
      openModelDirect?: (modelUrl: string, action: string) => void;
      /** Abre LobbyVrActivity nativa (doble ventana); sin URL. */
      openLobbyDirect?: () => void;
      /** Abre reproductor galería nativo; sin URL. */
      openGalleryDirect?: () => void;
      /** Onni: pide RECORD_AUDIO; llama window[callbackName](granted: boolean). */
      requestOnniMicrophonePermission?: (callbackName: string) => void;
    };
    /** Puente AR: registrado en MainActivity como {@code Android}. */
    Android?: {
      onArClick(url?: string): void;
      /** HLS/URL → SelectorActivity (ExoPlayer nativo). */
      playStream?(streamUrl: string): void;
      /** @deprecated Usar playStream */
      openLiveSelector?(playbackUrl: string, playbackId: string): void;
      /** Entrada legacy Agora (no HLS Mux). */
      getAgoraParams?(canal: string, token: string): void;
      /** Cine Live — payload Agora: appId|canal|token de la sesión activa. */
      abrirCineLive?(agoraPayload: string): void;
      /** Live Cam — payload Agora: appId|canal|token de la sesión activa. */
      abrirCamLive?(agoraPayload: string): void;
      openLobby?(): void;
      /** Mismo que {@code AndroidBridge.openLobbyDirect} (Tierra / lobby nativo). */
      openLobbyDirect?: () => void;
      /** Lobby Pantalla 2 — WebView nativo YouTube (implementación original del APK). */
      showLobbyPantalla2WebView?(): void;
      hideLobbyPantalla2WebView?(): void;
    };
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

function AppRoot() {
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
        if (u.protocol === "onniver:" && u.hostname === "open-lobby") {
          return "/lobby-inmersivo";
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

  return <App />;
}

createRoot(document.getElementById("root")!).render(<AppRoot />);
