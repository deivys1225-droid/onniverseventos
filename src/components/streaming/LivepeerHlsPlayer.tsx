import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { ClientOnly } from "@/components/ClientOnly";
import { Play, Radio } from "lucide-react";
import { probeMuxStreamSignal, type MuxStreamSignalState } from "@/lib/muxStreamStatus";
import { sanitizeMuxPlaybackId } from "@/lib/muxPlaybackId";
import { WebLivePlayerGate } from "@/components/streaming/WebLivePlayerGate";
import { cn } from "@/lib/utils";

const MuxPlayerLazy = lazy(() => import("@mux/mux-player-react"));

type MuxPlayerClientProps = {
  playbackId: string;
  streamType?: "live" | "on-demand";
  metadata?: { video_title?: string };
  title?: string;
  autoPlay?: "muted" | boolean;
  playsInline?: boolean;
  className?: string;
};

function MuxPlayerClient(props: MuxPlayerClientProps) {
  const shell = props.className ?? "";
  return (
    <ClientOnly fallback={<div className={shell} aria-hidden />}>
      <Suspense fallback={<div className={cn(shell, "animate-pulse bg-black/80")} aria-hidden />}>
        <MuxPlayerLazy {...props} />
      </Suspense>
    </ClientOnly>
  );
}

export type MuxHlsPlayerProps = {
  playbackId: string;
  title?: string;
  compact?: boolean;
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
  return (
    <WebLivePlayerGate
      nativeFallback={
        <div
          className={cn(
            "flex aspect-video w-full items-center justify-center rounded-xl border border-cyan-300/35 bg-black/50 p-6 text-center text-sm text-muted-foreground",
            className,
          )}
        >
          Reproducción nativa Android (ExoPlayer). Pulsa la tarjeta EN VIVO o playStream.
        </div>
      }
    >
      <MuxHlsPlayerWeb {...{ playbackId, title, compact, manualStart, className }} />
    </WebLivePlayerGate>
  );
}

function MuxHlsPlayerWeb({
  playbackId,
  title,
  compact = false,
  manualStart = true,
  className = "",
}: MuxHlsPlayerProps) {
  const [started, setStarted] = useState(!manualStart);
  const [signal, setSignal] = useState<MuxStreamSignalState>("checking");

  const sanitizedPlaybackId = useMemo(
    () => sanitizeMuxPlaybackId(playbackId),
    [playbackId],
  );

  useEffect(() => {
    console.log("[MuxPlayer] playbackId → MuxPlayer:", {
      raw: playbackId,
      sanitized: sanitizedPlaybackId,
    });
  }, [playbackId, sanitizedPlaybackId]);

  useEffect(() => {
    if (!sanitizedPlaybackId || !started) return;

    let cancelled = false;
    const poll = async () => {
      const next = await probeMuxStreamSignal(sanitizedPlaybackId);
      if (!cancelled) setSignal(next);
    };

    void poll();
    const timer = window.setInterval(() => void poll(), 8000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [sanitizedPlaybackId, started]);

  const shellClass = compact
    ? "h-full min-h-[12rem] w-full rounded-lg border border-cyan-300/45 bg-black object-contain"
    : "aspect-video w-full rounded-xl border border-cyan-300/45 bg-black object-contain shadow-[0_0_48px_-10px_rgba(34,211,238,0.95)]";

  if (!sanitizedPlaybackId) {
    return (
      <div className={className}>
        <p className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive">
          Playback ID de Mux inválido. Usa el ID plano, no la URL .m3u8.
        </p>
      </div>
    );
  }

  const waitingRtmp = started && signal === "idle";

  return (
    <div className={className}>
      <div className="relative">
        {started ? (
          <>
            <MuxPlayerClient
              key={sanitizedPlaybackId}
              playbackId={sanitizedPlaybackId}
              streamType="live"
              metadata={{ video_title: title?.trim() || "Transmisión en vivo" }}
              title={title}
              autoPlay="muted"
              playsInline
              className={shellClass}
            />
            {waitingRtmp && (
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-black/80 p-6 text-center">
                <Radio className="h-10 w-10 animate-pulse text-amber-300" aria-hidden />
                <p className="max-w-md text-sm font-semibold text-amber-50">
                  Sin señal de video en Mux
                </p>
                <p className="max-w-md text-xs text-amber-100/90">
                  El emisor debe conectar <strong>Larix</strong> u <strong>OBS</strong> con la URL RTMP del panel.
                  La cámara del navegador no transmite a los espectadores.
                </p>
              </div>
            )}
          </>
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
        <p className="mt-3 text-xs text-cyan-100">
          {title} · {signal === "active" ? "Señal Mux activa" : signal === "idle" ? "Esperando RTMP" : "Comprobando…"}
        </p>
      )}
      <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
        Mux Player · ID {sanitizedPlaybackId.slice(0, 16)}…
      </p>
    </div>
  );
}

export { MuxHlsPlayer as LivepeerHlsPlayer };
