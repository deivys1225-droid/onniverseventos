/**
 * Emisión desde el navegador → mux-api (WebSocket) → ffmpeg → RTMP Mux.
 * Sustituto de @mux/mux-broadcast (no publicado en npm).
 */

export type MuxBrowserBroadcastState = "idle" | "connecting" | "live" | "error";

function resolveWsBase(): string {
  const explicit = (import.meta.env.VITE_MUX_WS_URL as string | undefined)?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const api = (import.meta.env.VITE_MUX_API_URL as string | undefined)?.trim();
  if (api) {
    return api.replace(/^http/i, (m) => (m.toLowerCase() === "https" ? "wss" : "ws")).replace(/\/$/, "");
  }

  if (import.meta.env.DEV) {
    const host = typeof window !== "undefined" ? window.location.host : "localhost:5173";
    const proto = typeof window !== "undefined" && window.location.protocol === "https:" ? "wss" : "ws";
    return `${proto}://${host}`;
  }

  if (typeof window !== "undefined") {
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    return `${proto}://${window.location.host}`;
  }

  return "";
}

function pickRecorderMime(): string {
  const candidates = ["video/webm;codecs=vp8,opus", "video/webm;codecs=vp9,opus", "video/webm"];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? "video/webm";
}

export class MuxBrowserBroadcaster {
  private ws: WebSocket | null = null;
  private recorder: MediaRecorder | null = null;
  private mediaStream: MediaStream | null = null;
  private state: MuxBrowserBroadcastState = "idle";
  private onStateChange?: (state: MuxBrowserBroadcastState, detail?: string) => void;

  constructor(onStateChange?: (state: MuxBrowserBroadcastState, detail?: string) => void) {
    this.onStateChange = onStateChange;
  }

  getState(): MuxBrowserBroadcastState {
    return this.state;
  }

  private setState(next: MuxBrowserBroadcastState, detail?: string) {
    this.state = next;
    this.onStateChange?.(next, detail);
  }

  async start(streamKey: string, mediaStream: MediaStream): Promise<void> {
    const key = streamKey.trim();
    if (!key) throw new Error("Falta stream_key de Mux.");

    const base = resolveWsBase();
    if (!base) throw new Error("No hay URL de WebSocket para mux-api (VITE_MUX_WS_URL).");

    this.stop();
    this.mediaStream = mediaStream;
    this.setState("connecting");

    const url = `${base}/api/mux/ws-ingest?streamKey=${encodeURIComponent(key)}`;

    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(url);
      ws.binaryType = "arraybuffer";

      const fail = (message: string) => {
        ws.close();
        this.setState("error", message);
        reject(new Error(message));
      };

      ws.onopen = () => resolve();
      ws.onerror = () => fail("No se pudo conectar al servidor de emisión (WebSocket).");
      ws.onclose = (ev) => {
        if (this.state === "connecting") {
          fail(ev.reason || "WebSocket cerrado antes de iniciar.");
        } else if (this.state === "live") {
          this.setState("error", ev.reason || "Conexión de emisión cerrada.");
        }
      };

      this.ws = ws;
    });

    const mimeType = pickRecorderMime();
    const recorder = new MediaRecorder(mediaStream, {
      mimeType,
      videoBitsPerSecond: 2_500_000,
    });

    recorder.ondataavailable = (event) => {
      if (!event.data.size || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
      void event.data.arrayBuffer().then((buf) => {
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(buf);
        }
      });
    };

    recorder.onerror = () => {
      this.setState("error", "Error del MediaRecorder.");
    };

    recorder.start(1000);
    this.recorder = recorder;
    this.setState("live");
    console.log("[MuxBroadcast] Enviando WebM → RTMP Mux, mime:", mimeType);
  }

  stop(): void {
    if (this.recorder && this.recorder.state !== "inactive") {
      try {
        this.recorder.stop();
      } catch {
        /* ignore */
      }
    }
    this.recorder = null;

    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        /* ignore */
      }
    }
    this.ws = null;
    this.mediaStream = null;
    if (this.state !== "error") {
      this.setState("idle");
    }
  }
}
