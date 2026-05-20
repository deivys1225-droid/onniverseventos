import { useCallback, useEffect, useRef, useState } from "react";
import { Copy, Mic, MicOff, Radio, Square, Video, VideoOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { releaseLocalMediaCapture, stopMediaStreamTracks } from "@/lib/mediaStreamCleanup";
import { cn } from "@/lib/utils";
import { probeMuxStreamSignal, type MuxStreamSignalState } from "@/lib/muxStreamStatus";
import { toast } from "sonner";

type MuxBroadcastPanelProps = {
  title?: string;
  playbackId: string;
  streamKey: string;
  rtmpPushUrl: string;
  playbackUrl: string;
  /** true cuando el live ya está activo en plataforma */
  broadcasting: boolean;
  connecting?: boolean;
  onStartTransmission: () => void | Promise<void>;
  onStopTransmission: () => void;
  className?: string;
};

/**
 * Emisor Mux: vista previa local + RTMP (Larix/OBS).
 * Mux no usa WHIP en navegador; la señal entra por RTMP con stream_key.
 */
export function MuxBroadcastPanel({
  title = "Transmisión en vivo",
  playbackId,
  streamKey,
  rtmpPushUrl,
  playbackUrl,
  broadcasting,
  connecting = false,
  onStartTransmission,
  onStopTransmission,
  className,
}: MuxBroadcastPanelProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [previewOn, setPreviewOn] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [rtmpSignal, setRtmpSignal] = useState<MuxStreamSignalState>("checking");

  useEffect(() => {
    if (!broadcasting || !playbackId.trim()) {
      setRtmpSignal("checking");
      return;
    }

    let cancelled = false;
    const poll = async () => {
      const next = await probeMuxStreamSignal(playbackId);
      if (!cancelled) setRtmpSignal(next);
    };

    void poll();
    const timer = window.setInterval(() => void poll(), 6000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [broadcasting, playbackId]);

  const stopPreview = useCallback(() => {
    stopMediaStreamTracks(streamRef.current);
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setPreviewOn(false);
  }, []);

  const startPreview = useCallback(async () => {
    setPreviewError(null);
    stopPreview();
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: videoEnabled,
        audio: audioEnabled,
      });
      streamRef.current = media;
      if (videoRef.current) {
        videoRef.current.srcObject = media;
        await videoRef.current.play();
      }
      setPreviewOn(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "No se pudo abrir cámara/micrófono.";
      setPreviewError(msg);
    }
  }, [audioEnabled, stopPreview, videoEnabled]);

  useEffect(() => {
    void startPreview();
    return () => {
      stopPreview();
      releaseLocalMediaCapture();
    };
  }, [startPreview, stopPreview]);

  const copyRtmp = () => {
    void navigator.clipboard?.writeText(rtmpPushUrl);
    toast.success("URL RTMP copiada para Larix/OBS.");
  };

  return (
    <div className={cn("w-full space-y-3", className)}>
      <div className="rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
        <p className="font-semibold text-amber-50">Emisión Mux por RTMP</p>
        <p className="mt-1">
          {broadcasting
            ? "Envía la señal desde Larix u OBS con la URL RTMP para que los espectadores vean el live."
            : "El live ya está creado en Mux. Envía RTMP con la URL de abajo."}
        </p>
        <p className="mt-1 break-all font-mono text-[10px] text-amber-200/90">{rtmpPushUrl}</p>
        <Button type="button" variant="outline" size="sm" className="mt-2 border-amber-400/50" onClick={copyRtmp}>
          <Copy className="mr-1 h-3 w-3" />
          Copiar RTMP
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
              "absolute left-3 top-3 flex items-center gap-2 rounded-full px-2.5 py-1 backdrop-blur",
              rtmpSignal === "active" ? "bg-emerald-900/70" : "bg-amber-900/70",
            )}
          >
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                rtmpSignal === "active" ? "animate-pulse bg-emerald-400" : "bg-amber-400",
              )}
            />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-white">
              {rtmpSignal === "active" ? "RTMP conectado" : "Falta RTMP"}
            </span>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3 pt-10">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {!broadcasting ? (
              <Button
                type="button"
                disabled={connecting}
                className="inline-flex min-h-11 min-w-[11rem] gap-2 border-cyan-400/60 bg-cyan-500/25 px-5 font-semibold text-cyan-50 hover:bg-cyan-500/40"
                onClick={() => void onStartTransmission()}
              >
                <Radio className="h-5 w-5" />
                {connecting ? "Conectando…" : "Iniciar transmisión"}
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="inline-flex min-h-11 min-w-[11rem] gap-2 border-rose-400/60 bg-rose-500/20 px-5 font-semibold text-rose-100"
                onClick={onStopTransmission}
              >
                <Square className="h-5 w-5" />
                Detener transmisión
              </Button>
            )}
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
