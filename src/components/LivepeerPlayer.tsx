import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import Hls from "hls.js";

interface LivepeerPlayerProps {
  playbackId: string;
  title: string;
}

/** Player web oficial Livepeer (a veces el WebView lo bloquea o deja iframe en negro). */
export const livepeerWatchUrl = (playbackId: string) =>
  `https://lvpr.tv/?v=${encodeURIComponent(playbackId)}`;

const livepeerMuxSource = (playbackId: string) =>
  `https://livepeercdn.studio/hls/${encodeURIComponent(playbackId)}/index.m3u8`;

type Strategy = "native_hls" | "hlsjs" | "iframe";

const LIVE_STALL_MS = 12_000;

const LivepeerPlayer = ({ playbackId, title }: LivepeerPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const stallTimerRef = useRef<number | null>(null);
  const [strategy, setStrategy] = useState<Strategy>("native_hls");

  const hlsUrl = livepeerMuxSource(playbackId);
  const openExternal = livepeerWatchUrl(playbackId);

  /** 1) HLS nativo en <video> (mejor en WebView Android). 2) hls.js 3) iframe */
  useEffect(() => {
    let cancelled = false;
    const clearStallTimer = () => {
      if (stallTimerRef.current != null) {
        window.clearTimeout(stallTimerRef.current);
        stallTimerRef.current = null;
      }
    };

    if (!playbackId) return undefined;

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
  }, [playbackId, hlsUrl, strategy]);

  const embedSrc = `${openExternal}&lowLatency=true`;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-3"
    >
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 shadow-[0_0_60px_-15px_hsl(var(--primary)/0.3)]">
        <div className="aspect-video w-full bg-black">
          {strategy === "iframe" ? (
            <iframe
              title={title}
              src={embedSrc}
              className="h-full w-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
            />
          ) : (
            <video ref={videoRef} controls playsInline className="h-full w-full" title={title} />
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
          {strategy === "native_hls" && "Reproduciendo HLS (nativo)…"}
          {strategy === "hlsjs" && "Reproduciendo HLS (motor web)…"}
          {strategy === "iframe" && "Reproductor Livepeer incrustado…"}
        </span>
        <a
          href={openExternal}
          target="_blank"
          rel="noreferrer"
          className="font-medium text-primary underline underline-offset-4 hover:text-primary/90"
        >
          Si se ve negro: abrir en Chrome / navegador
        </a>
      </div>
      <p className="text-xs text-muted-foreground">
        El HLS suele aparecer varios segundos después de pulsar «Iniciar live» en el celular que transmite.
      </p>
    </motion.div>
  );
};

export default LivepeerPlayer;
