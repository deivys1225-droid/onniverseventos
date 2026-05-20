import { useEffect, useMemo, useState } from "react";
import MuxPlayer from "@mux/mux-player-react";
import { Play } from "lucide-react";
import { sanitizeMuxPlaybackId } from "@/lib/muxPlaybackId";
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
  const sanitizedPlaybackId = useMemo(
    () => sanitizeMuxPlaybackId(playbackId),
    [playbackId],
  );

  useEffect(() => {
    console.log("[MuxPlayer] playbackId → MuxPlayer:", {
      raw: playbackId,
      sanitized: sanitizedPlaybackId,
      esUrl: /\.m3u8|stream\.mux\.com/i.test(String(playbackId ?? "")),
    });
  }, [playbackId, sanitizedPlaybackId]);

  const shellClass = compact
    ? "h-full min-h-[12rem] w-full rounded-lg border border-cyan-300/45 bg-black object-contain"
    : "aspect-video w-full rounded-xl border border-cyan-300/45 bg-black object-contain shadow-[0_0_48px_-10px_rgba(34,211,238,0.95)]";

  if (!sanitizedPlaybackId) {
    return (
      <div className={className}>
        <p className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive">
          Playback ID de Mux inválido
          {playbackId?.trim() ? ` (recibido: ${playbackId.trim().slice(0, 48)}…)` : ""}.
          Usa el ID plano de Mux, no la URL .m3u8.
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="relative">
        {started ? (
          <MuxPlayer
            key={sanitizedPlaybackId}
            playbackId={sanitizedPlaybackId}
            streamType="live"
            metadata={{ video_title: title?.trim() || "Transmisión en vivo" }}
            title={title}
            autoPlay="muted"
            playsInline
            className={shellClass}
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
              onClick={() => setStarted(true)}
              className="inline-flex min-h-[52px] items-center gap-2 rounded-xl border border-cyan-400/60 bg-cyan-500/20 px-6 py-3 text-sm font-semibold text-cyan-50 shadow-[0_0_32px_-8px_rgba(34,211,238,0.8)] transition hover:bg-cyan-500/35"
            >
              <Play className="h-5 w-5 fill-current" aria-hidden />
              Ver transmisión
            </button>
          </div>
        )}
      </div>
      {title && started && (
        <p className="mt-3 text-xs text-cyan-100">{title} · En vivo</p>
      )}
      {started && (
        <p className="mt-2 rounded-md border border-amber-400/35 bg-amber-500/10 p-2 text-xs text-amber-100/95">
          Si aparece «Live stream is not currently available», el canal Mux está creado pero el emisor aún no envía
          video por RTMP (Larix, OBS, etc.). La cámara del navegador solo es vista previa.
        </p>
      )}
      <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
        Mux Player · ID {sanitizedPlaybackId.slice(0, 16)}…
      </p>
    </div>
  );
}

export { MuxHlsPlayer as LivepeerHlsPlayer };
