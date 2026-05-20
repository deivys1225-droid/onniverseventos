import { useCallback, useEffect, useId, useRef, useState } from "react";
import Hls from "hls.js";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";

export type MuxHlsPlayerProps = {
  playbackUrl: string;
  title?: string;
  compact?: boolean;
  /** Espera al botón «Ver transmisión» antes de cargar HLS. */
  manualStart?: boolean;
  className?: string;
};

/** Reproductor HLS (Mux, Livepeer u otra URL .m3u8). */
export function MuxHlsPlayer({
  playbackUrl,
  title,
  compact = false,
  manualStart = true,
  className = "",
}: MuxHlsPlayerProps) {
  const instanceId = useId().replace(/:/g, "");
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [status, setStatus] = useState(manualStart ? "Pulsa para ver en vivo" : "Listo");
  const [connecting, setConnecting] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const teardown = useCallback(() => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.removeAttribute("src");
      video.load();
    }
    setPlaying(false);
    setConnecting(false);
  }, []);

  const startPlayback = useCallback(async () => {
    const url = playbackUrl.trim();
    if (!url) {
      setError("No hay URL de reproducción HLS.");
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    setError(null);
    setConnecting(true);
    setStatus("Conectando…");
    teardown();

    try {
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 30,
        });
        hlsRef.current = hls;
        hls.loadSource(url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          void video.play().then(() => {
            setPlaying(true);
            setConnecting(false);
            setStatus("En vivo");
          });
        });
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (!data.fatal) return;
          setError("No se pudo reproducir el stream. ¿El emisor ya está en vivo?");
          setConnecting(false);
          setStatus("Error");
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = url;
        video.onloadedmetadata = () => {
          void video.play().then(() => {
            setPlaying(true);
            setConnecting(false);
            setStatus("En vivo");
          });
        };
      } else {
        throw new Error("HLS no soportado en este navegador.");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error al reproducir.";
      setError(msg);
      setConnecting(false);
      setStatus("Error");
    }
  }, [playbackUrl, teardown]);

  useEffect(() => {
    if (!manualStart) {
      void startPlayback();
    }
    return () => {
      teardown();
    };
  }, [manualStart, playbackUrl, startPlayback, teardown]);

  const showStartOverlay = manualStart && !playing && !connecting;

  return (
    <div className={className}>
      <div className="relative">
        <video
          ref={videoRef}
          id={`mux-hls-${instanceId}`}
          playsInline
          controls={playing}
          muted={!playing}
          className={
            compact
              ? "h-full min-h-[12rem] w-full rounded-lg border border-cyan-300/45 bg-black object-contain"
              : "aspect-video w-full rounded-xl border border-cyan-300/45 bg-black object-contain shadow-[0_0_48px_-10px_rgba(34,211,238,0.95)]"
          }
        />
        {showStartOverlay && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-xl bg-black/75 p-4">
            <p className="text-center text-sm text-cyan-100/90">{title || "Transmisión en vivo"}</p>
            <button
              type="button"
              onClick={() => void startPlayback()}
              className="inline-flex min-h-[52px] items-center gap-2 rounded-xl border border-cyan-400/60 bg-cyan-500/20 px-6 py-3 text-sm font-semibold text-cyan-50 shadow-[0_0_32px_-8px_rgba(34,211,238,0.8)] transition hover:bg-cyan-500/35"
            >
              <Play className="h-5 w-5 fill-current" aria-hidden />
              Ver transmisión
            </button>
          </div>
        )}
        {connecting && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/60">
            <p className="text-sm text-cyan-100">Conectando…</p>
          </div>
        )}
      </div>
      <p className="mt-3 text-xs text-cyan-100">
        {title ? `${title} · ` : ""}
        {status}
      </p>
      {error && (
        <p className="mt-2 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">Mux Video HLS</p>
    </div>
  );
}

export { MuxHlsPlayer as LivepeerHlsPlayer };
