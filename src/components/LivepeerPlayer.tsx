import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import Hls from "hls.js";
import { resolveLivepeerPlayerMedia } from "@/lib/livepeerPlayback";

interface LivepeerPlayerProps {
  /** Id de playback Livepeer, URL .m3u8, o URL de vídeo (p. ej. MP4). */
  playbackId: string;
  title: string;
}

/** Player web oficial Livepeer (a veces el WebView lo bloquea o deja iframe en negro). */
export const livepeerWatchUrl = (playbackId: string) =>
  `https://lvpr.tv/?v=${encodeURIComponent(playbackId)}`;

type Strategy = "native_hls" | "hlsjs" | "iframe";

const LIVE_STALL_MS = 12_000;

const LivepeerPlayer = ({ playbackId, title }: LivepeerPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const stallTimerRef = useRef<number | null>(null);
  const [strategy, setStrategy] = useState<Strategy>("native_hls");
  const resolved = resolveLivepeerPlayerMedia(playbackId);

  const isProgressive = resolved?.kind === "progressive";
  const hlsUrl = resolved?.kind === "hls" ? resolved.url : "";
  const lvprId = resolved?.kind === "hls" ? resolved.lvprPlaybackId : null;
  const openExternal = lvprId ? livepeerWatchUrl(lvprId) : hlsUrl || "";

  useEffect(() => {
    if (resolved?.kind === "hls") {
      setStrategy("native_hls");
    }
  }, [playbackId, resolved?.kind]);

  useEffect(() => {
    let cancelled = false;
    const clearStallTimer = () => {
      if (stallTimerRef.current != null) {
        window.clearTimeout(stallTimerRef.current);
        stallTimerRef.current = null;
      }
    };

    if (!resolved || resolved.kind === "progressive") {
      return undefined;
    }

    if (strategy === "iframe") {
      return undefined;
    }

    const video = videoRef.current;
    if (!video) return undefined;

    video.playsInline = true;
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");

    clearStallTimer();

    const giveUpNative = () => {
      clearStallTimer();
      try {
        video.removeAttribute("src");
        video.load();
      } catch {
        /* ignore */
      }
      if (!cancelled) setStrategy("hlsjs");
    };

    if (strategy === "native_hls") {
      video.src = hlsUrl;

      let played = false;
      const bumpStallGuard = () => {
        clearStallTimer();
        stallTimerRef.current = window.setTimeout(() => {
          if (cancelled || played) return;
          if ((video.readyState ?? 0) >= 3) return;
          giveUpNative();
        }, LIVE_STALL_MS);
      };

      const onPlaying = () => {
        played = true;
        clearStallTimer();
      };
      const onError = () => giveUpNative();

      video.addEventListener("playing", onPlaying);
      video.addEventListener("error", onError);
      bumpStallGuard();

      void video.play().catch(() => bumpStallGuard());

      return () => {
        cancelled = true;
        clearStallTimer();
        video.removeEventListener("playing", onPlaying);
        video.removeEventListener("error", onError);
      };
    }

    if (strategy === "hlsjs") {
      if (!Hls.isSupported()) {
        if (!cancelled) setStrategy("iframe");
        return undefined;
      }

      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
      });

      let played = false;
      const bumpStallGuardJs = () => {
        clearStallTimer();
        stallTimerRef.current = window.setTimeout(() => {
          if (cancelled || played) return;
          try {
            hls.destroy();
          } catch {
            /* ignore */
          }
          if (!cancelled) setStrategy("iframe");
        }, LIVE_STALL_MS);
      };

      hls.loadSource(hlsUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        bumpStallGuardJs();
        void video.play().catch(() => {});
      });
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (!data.fatal) return;
        hls.destroy();
        if (!cancelled) setStrategy("iframe");
      });
      video.addEventListener(
        "playing",
        () => {
          played = true;
          clearStallTimer();
        },
        { once: true },
      );

      return () => {
        cancelled = true;
        clearStallTimer();
        hls.destroy();
      };
    }

    return undefined;
  }, [playbackId, hlsUrl, strategy, resolved]);

  useEffect(() => {
    if (!isProgressive || !resolved) return undefined;
    const video = videoRef.current;
    if (!video) return undefined;
    let cancelled = false;
    video.playsInline = true;
    video.src = resolved.url;
    void video.play().catch(() => {});
    return () => {
      cancelled = true;
      try {
        video.removeAttribute("src");
        video.load();
      } catch {
        /* ignore */
      }
    };
  }, [isProgressive, resolved]);

  if (!resolved) {
    return (
      <p className="rounded-xl border border-border/50 bg-card/50 p-4 text-sm text-muted-foreground">
        No hay fuente de reproduccion.
      </p>
    );
  }

  const embedSrc = lvprId ? `${livepeerWatchUrl(lvprId)}&lowLatency=true` : "";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-3"
    >
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 shadow-[0_0_60px_-15px_hsl(var(--primary)/0.3)]">
        <div className="aspect-video w-full bg-black">
          {resolved.kind === "progressive" ? (
            <video ref={videoRef} controls playsInline className="h-full w-full" title={title} />
          ) : strategy === "iframe" && lvprId ? (
            <iframe
              title={title}
              src={embedSrc}
              className="h-full w-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
            />
          ) : strategy === "iframe" && !lvprId && hlsUrl ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-sm text-muted-foreground">
              <p>No se pudo iniciar HLS en este navegador.</p>
              <a
                href={hlsUrl}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-primary underline underline-offset-4"
              >
                Abrir manifest HLS (.m3u8)
              </a>
            </div>
          ) : (
            <video ref={videoRef} controls playsInline className="h-full w-full" title={title} />
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
          {resolved.kind === "progressive" && "Reproduciendo video (MP4 / progresivo)…"}
          {resolved.kind === "hls" && strategy === "native_hls" && "Reproduciendo HLS (nativo)…"}
          {resolved.kind === "hls" && strategy === "hlsjs" && "Reproduciendo HLS (motor web)…"}
          {resolved.kind === "hls" && strategy === "iframe" && lvprId && "Reproductor Livepeer incrustado…"}
          {resolved.kind === "hls" && strategy === "iframe" && !lvprId && "HLS: usa el enlace externo…"}
        </span>
        {openExternal ? (
          <a
            href={openExternal}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-primary underline underline-offset-4 hover:text-primary/90"
          >
            Si se ve negro: abrir en Chrome / navegador
          </a>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">
        El HLS suele aparecer varios segundos después de pulsar «Iniciar live» en el celular que transmite.
      </p>
    </motion.div>
  );
};

export default LivepeerPlayer;
