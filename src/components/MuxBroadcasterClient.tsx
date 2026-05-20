"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Copy, Mic, MicOff, Square, Video, VideoOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MuxBrowserBroadcaster, type MuxBrowserBroadcastState } from "@/lib/muxBrowserBroadcast";
import { releaseLocalMediaCapture, stopMediaStreamTracks } from "@/lib/mediaStreamCleanup";
import { probeMuxStreamSignal, type MuxStreamSignalState } from "@/lib/muxStreamStatus";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/**
 * Emisor Mux (solo cliente).
 *
 * `@mux/mux-broadcast-react` no está publicado en npm (404).
 * Toda la lógica de emisión desde navegador vive aquí: getUserMedia, MediaRecorder
 * y WebSocket → mux-api → ffmpeg → RTMP Mux.
 *
 * Cuando Mux publique el paquete oficial, importarlo únicamente en este archivo.
 */

export type MuxBroadcasterClientProps = {
  title?: string;
  playbackId: string;
  streamKey: string;
  rtmpPushUrl: string;
  playbackUrl: string;
  broadcasting: boolean;
  connecting?: boolean;
  onStopTransmission: () => void;
  className?: string;
};

export default function MuxBroadcasterClient({
  title = "Transmisión en vivo",
  playbackId,
  streamKey,
  rtmpPushUrl,
  playbackUrl,
  broadcasting,
  connecting = false,
  onStopTransmission,
  className,
}: MuxBroadcasterClientProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const broadcasterRef = useRef<MuxBrowserBroadcaster | null>(null);

  const [previewOn, setPreviewOn] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [broadcastState, setBroadcastState] = useState<MuxBrowserBroadcastState>("idle");
  const [broadcastError, setBroadcastError] = useState<string | null>(null);
  const [muxSignal, setMuxSignal] = useState<MuxStreamSignalState>("checking");

  const stopPreview = useCallback(() => {
    broadcasterRef.current?.stop();
    stopMediaStreamTracks(streamRef.current);
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setPreviewOn(false);
  }, []);

  const startPreview = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setPreviewError("Cámara/micrófono no disponibles en este entorno.");
      return null;
    }

    setPreviewError(null);
    stopPreview();
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: videoEnabled ? { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } } : false,
        audio: audioEnabled,
      });
      streamRef.current = media;
      if (videoRef.current) {
        videoRef.current.srcObject = media;
        await videoRef.current.play();
      }
      setPreviewOn(true);
      return media;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "No se pudo abrir cámara/micrófono.";
      setPreviewError(msg);
      return null;
    }
  }, [audioEnabled, stopPreview, videoEnabled]);

  useEffect(() => {
    void startPreview();
    return () => {
      broadcasterRef.current?.stop();
      stopPreview();
      releaseLocalMediaCapture();
    };
  }, [startPreview, stopPreview]);

  useEffect(() => {
    if (!broadcasting || !streamKey.trim()) {
      broadcasterRef.current?.stop();
      setBroadcastState("idle");
      return;
    }

    let cancelled = false;

    const run = async () => {
      const media = streamRef.current ?? (await startPreview());
      if (!media || cancelled) return;

      if (!broadcasterRef.current) {
        broadcasterRef.current = new MuxBrowserBroadcaster((state, detail) => {
          setBroadcastState(state);
          if (state === "error" && detail) setBroadcastError(detail);
        });
      }

      setBroadcastError(null);
      try {
        await broadcasterRef.current.start(streamKey, media);
        if (!cancelled) toast.success("Enviando video a Mux desde el navegador.");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "No se pudo iniciar la emisión.";
        setBroadcastError(msg);
        toast.error(msg);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [broadcasting, streamKey, startPreview]);

  useEffect(() => {
    if (!broadcasting || !playbackId.trim()) {
      setMuxSignal("checking");
      return;
    }

    let cancelled = false;
    const poll = async () => {
      const next = await probeMuxStreamSignal(playbackId);
      if (!cancelled) setMuxSignal(next);
    };

    void poll();
    const timer = window.setInterval(() => void poll(), 6000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [broadcasting, playbackId]);

  const copyRtmp = () => {
    void navigator.clipboard?.writeText(rtmpPushUrl);
    toast.success("URL RTMP copiada (respaldo Larix/OBS).");
  };

  const handleStop = () => {
    broadcasterRef.current?.stop();
    onStopTransmission();
  };

  const statusLabel =
    broadcastState === "live"
      ? muxSignal === "active"
        ? "Mux Active · transmitiendo"
        : "Enviando… esperando Active en Mux"
      : broadcastState === "connecting"
        ? "Conectando emisor…"
        : broadcastState === "error"
          ? "Error de emisión"
          : "Listo";

  return (
    <div className={cn("w-full space-y-3", className)}>
      <div className="rounded-lg border border-cyan-400/40 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100">
        <p className="font-semibold text-cyan-50">Emisión desde el navegador (Web → RTMP Mux)</p>
        <p className="mt-1">
          La cámara y el micrófono se envían al servidor y de ahí a Mux con tu{" "}
          <span className="font-mono">stream_key</span>. Si falla, usa Larix/OBS con la URL RTMP de respaldo.
        </p>
        {broadcastError && (
          <p className="mt-2 rounded border border-destructive/40 bg-destructive/10 p-2 text-destructive">
            {broadcastError}
          </p>
        )}
        <Button type="button" variant="outline" size="sm" className="mt-2 border-cyan-400/50" onClick={copyRtmp}>
          <Copy className="mr-1 h-3 w-3" />
          Copiar RTMP (respaldo)
        </Button>
      </div>

      <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-cyan-300/40 bg-black shadow-[0_0_40px_-10px_rgba(34,211,238,0.85)]">
        <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" title={title} />
        {!previewOn && !previewError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-sm text-muted-foreground">
            Activando cámara…
          </div>
        )}
        {previewError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-4 text-center text-sm text-destructive">
            {previewError}
          </div>
        )}
        {broadcasting && (
          <div
            className={cn(
              "absolute left-3 top-3 flex flex-col gap-0.5 rounded-lg px-2.5 py-1 backdrop-blur",
              muxSignal === "active"
                ? "bg-emerald-900/80"
                : broadcastState === "live"
                  ? "bg-cyan-900/80"
                  : "bg-amber-900/80",
            )}
          >
            <span className="flex items-center gap-2">
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  muxSignal === "active" ? "animate-pulse bg-emerald-400" : "bg-amber-400",
                )}
              />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white">{statusLabel}</span>
            </span>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3 pt-10">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={connecting || !broadcasting}
              className="inline-flex min-h-11 min-w-[11rem] gap-2 border-rose-400/60 bg-rose-500/20 px-5 font-semibold text-rose-100"
              onClick={handleStop}
            >
              <Square className="h-5 w-5" />
              Detener transmisión
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-10 w-10 border-cyan-400/35"
              title="Cámara"
              onClick={() => {
                setVideoEnabled((v) => !v);
                void startPreview();
              }}
            >
              {videoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-10 w-10 border-cyan-400/35"
              title="Micrófono"
              onClick={() => {
                setAudioEnabled((a) => !a);
                void startPreview();
              }}
            >
              {audioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      <p className="text-center text-[10px] text-muted-foreground">
        HLS espectadores: <span className="break-all font-mono text-violet-200/80">{playbackUrl}</span>
      </p>
    </div>
  );
}
