import { useState } from "react";
import MuxPlayer from "@mux/mux-player-react";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";

export type MuxHlsPlayerProps = {
  /** ID de reproducción Mux (no la URL .m3u8). */
  playbackId: string;
  title?: string;
  compact?: boolean;
  /** Espera al botón «Ver transmisión» antes de cargar el player. */
  manualStart?: boolean;
  className?: string;
};

/** Reproductor en vivo Mux (@mux/mux-player-react). */
export function MuxHlsPlayer({
  playbackId,
  title,
  compact = false,
  manualStart = true,
  className = "",
}: MuxHlsPlayerProps) {
  const [started, setStarted] = useState(!manualStart);
  const [error, setError] = useState<string | null>(null);
  const id = playbackId.trim();

  const shellClass = compact
    ? "h-full min-h-[12rem] w-full rounded-lg border border-cyan-300/45 bg-black object-contain"
    : "aspect-video w-full rounded-xl border border-cyan-300/45 bg-black object-contain shadow-[0_0_48px_-10px_rgba(34,211,238,0.95)]";

  if (!id) {
    return (
      <div className={className}>
        <p className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive">
          No hay playback ID de Mux para reproducir.
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="relative">
        {started ? (
          <MuxPlayer
            key={id}
            playbackId={id}
            streamType="live"
            metadata={{ video_title: title?.trim() || "Transmisión en vivo" }}
            title={title}
            autoPlay="muted"
            playsInline
            className={shellClass}
            onError={() => {
              setError("No se pudo reproducir el stream. ¿El emisor ya está enviando RTMP?");
            }}
          />
        ) : (
          <div
            className={cn(
              shellClass,
              "flex flex-col items-center justify-center gap-4 bg-black/90 p-4",
            )}
          >
            <p className="text-center text-sm text-cyan-100/90">{title || "Transmisión en vivo"}</p>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setStarted(true);
              }}
              className="inline-flex min-h-[52px] items-center gap-2 rounded-xl border border-cyan-400/60 bg-cyan-500/20 px-6 py-3 text-sm font-semibold text-cyan-50 shadow-[0_0_32px_-8px_rgba(34,211,238,0.8)] transition hover:bg-cyan-500/35"
            >
              <Play className="h-5 w-5 fill-current" aria-hidden />
              Ver transmisión
            </button>
          </div>
        )}
      </div>
      {title && started && (
        <p className="mt-3 text-xs text-cyan-100">
          {title} · En vivo
        </p>
      )}
      {error && (
        <p className="mt-2 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">Mux Player</p>
    </div>
  );
}

export { MuxHlsPlayer as LivepeerHlsPlayer };
