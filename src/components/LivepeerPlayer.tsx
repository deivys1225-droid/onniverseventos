import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import Hls from "hls.js";
import {
  extractPlaybackIdFromHlsUrl,
  isLikelyLivepeerPlaybackId,
  livepeerHlsAlternateCdnUrl,
  livepeerHlsUrlCandidates,
  resolveLivepeerPlayerMedia,
  type ResolvedPlayerMedia,
} from "@/lib/livepeerPlayback";

interface LivepeerPlayerProps {
  /** Id de playback Livepeer, URL .m3u8, o URL de vídeo (p. ej. MP4). */
  playbackId: string;
  title: string;
}

/** Player web oficial Livepeer (a veces el WebView lo bloquea o deja iframe en negro). */
export const livepeerWatchUrl = (playbackId: string) =>
  `https://lvpr.tv/?v=${encodeURIComponent(playbackId)}`;

type Strategy = "native_hls" | "hlsjs" | "lvpr_iframe" | "external_only";

const LIVE_STALL_MS = 18_000;

function buildHlsCandidates(resolved: Extract<ResolvedPlayerMedia, { kind: "hls" }>): string[] {
  const seen = new Set<string>();
  const add = (u: string) => {
    const t = u.trim();
    if (t) seen.add(t);
  };
  add(resolved.url);
  const alt = livepeerHlsAlternateCdnUrl(resolved.url);
  if (alt) add(alt);
  if (resolved.lvprPlaybackId) {
    for (const u of livepeerHlsUrlCandidates(resolved.lvprPlaybackId)) {
      add(u);
    }
  } else {
    const extracted = extractPlaybackIdFromHlsUrl(resolved.url);
    if (extracted) {
      for (const u of livepeerHlsUrlCandidates(extracted)) {
        add(u);
      }
    }
  }
  return Array.from(seen);
}

function browserSupportsNativeHls(): boolean {
  if (typeof document === "undefined") return false;
  const v = document.createElement("video");
  return (
    v.canPlayType("application/vnd.apple.mpegurl") !== "" ||
    v.canPlayType("application/x-mpegURL") !== ""
  );
}

const LivepeerPlayer = ({ playbackId, title }: LivepeerPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const stallTimerRef = useRef<number | null>(null);
  const hlsCandidateIndexRef = useRef(0);
  const [strategy, setStrategy] = useState<Strategy>("hlsjs");
  const resolved = useMemo(() => resolveLivepeerPlayerMedia(playbackId), [playbackId]);
  const hlsCandidates = useMemo(() => {
    if (resolved?.kind !== "hls") return [];
    return buildHlsCandidates(resolved);
  }, [resolved]);
  const primaryHlsUrl = hlsCandidates[0] ?? "";
  const isProgressive = resolved?.kind === "progressive";
  const lvprId = resolved?.kind === "hls" ? resolved.lvprPlaybackId : null;
  const canEmbedLvpr = Boolean(lvprId && isLikelyLivepeerPlaybackId(lvprId));
  const openExternal =
    lvprId != null && lvprId !== ""
      ? livepeerWatchUrl(lvprId)
      : primaryHlsUrl || "";

  useEffect(() => {
    if (resolved?.kind !== "hls") return;
    hlsCandidateIndexRef.current = 0;
    if (browserSupportsNativeHls()) {
      setStrategy("native_hls");
    } else if (Hls.isSupported()) {
      setStrategy("hlsjs");
    } else {
      setStrategy(canEmbedLvpr ? "lvpr_iframe" : "external_only");
    }
  }, [playbackId, resolved?.kind, canEmbedLvpr]);

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

    if (strategy === "lvpr_iframe" || strategy === "external_only") {
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
      if (!cancelled) {
        if (Hls.isSupported()) setStrategy("hlsjs");
        else setStrategy(canEmbedLvpr ? "lvpr_iframe" : "external_only");
      }
    };

    if (strategy === "native_hls") {
      video.src = primaryHlsUrl;

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
        if (!cancelled) setStrategy(canEmbedLvpr ? "lvpr_iframe" : "external_only");
        return undefined;
      }

      const hls = new Hls({
        enableWorker: false,
        lowLatencyMode: true,
        manifestLoadingTimeOut: 25_000,
        manifestLoadingMaxRetry: 5,
        levelLoadingTimeOut: 25_000,
        fragLoadingTimeOut: 25_000,
      });

      hlsCandidateIndexRef.current = 0;
      const firstUrl = hlsCandidates[hlsCandidateIndexRef.current] ?? primaryHlsUrl;

      let played = false;
      const bumpStallGuardJs = () => {
        clearStallTimer();
        stallTimerRef.current = window.setTimeout(() => {
          if (cancelled || played) return;
          hlsCandidateIndexRef.current += 1;
          if (hlsCandidateIndexRef.current < hlsCandidates.length) {
            try {
              hls.loadSource(hlsCandidates[hlsCandidateIndexRef.current]!);
              hls.startLoad();
            } catch {
              /* ignore */
            }
            bumpStallGuardJs();
            return;
          }
          try {
            hls.destroy();
          } catch {
            /* ignore */
          }
          if (!cancelled) setStrategy(canEmbedLvpr ? "lvpr_iframe" : "external_only");
        }, LIVE_STALL_MS);
      };

      hls.loadSource(firstUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        bumpStallGuardJs();
        void video.play().catch(() => {});
      });
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (!data.fatal) return;
        hlsCandidateIndexRef.current += 1;
        if (hlsCandidateIndexRef.current < hlsCandidates.length) {
          try {
            hls.loadSource(hlsCandidates[hlsCandidateIndexRef.current]!);
            hls.startLoad();
          } catch {
            hls.destroy();
            if (!cancelled) setStrategy(canEmbedLvpr ? "lvpr_iframe" : "external_only");
          }
          return;
        }
        hls.destroy();
        if (!cancelled) setStrategy(canEmbedLvpr ? "lvpr_iframe" : "external_only");
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
  }, [playbackId, primaryHlsUrl, strategy, resolved, hlsCandidates, canEmbedLvpr]);

  useEffect(() => {
    if (!isProgressive || !resolved) return undefined;
    const video = videoRef.current;
    if (!video) return undefined;
    video.playsInline = true;
    video.src = resolved.url;
    void video.play().catch(() => {});
    return () => {
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
          ) : strategy === "lvpr_iframe" && lvprId ? (
            <iframe
              title={title}
              src={embedSrc}
              className="h-full w-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
            />
          ) : strategy === "external_only" && primaryHlsUrl ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-sm text-muted-foreground">
              <p>No se pudo iniciar HLS en este navegador.</p>
              <a
                href={primaryHlsUrl}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-primary underline underline-offset-4"
              >
                Abrir manifest HLS (.m3u8)
              </a>
            </div>
          ) : (
            <video ref={videoRef} controls playsInline className="h-full w-full bg-black" title={title} />
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
          {resolved.kind === "progressive" && "Reproduciendo video (MP4 / progresivo)…"}
          {resolved.kind === "hls" && strategy === "native_hls" && "Reproduciendo HLS (Safari / nativo)…"}
          {resolved.kind === "hls" && strategy === "hlsjs" && "Reproduciendo HLS (motor web)…"}
          {resolved.kind === "hls" && strategy === "lvpr_iframe" && lvprId && "Reproductor Livepeer incrustado…"}
          {resolved.kind === "hls" && strategy === "external_only" && "HLS: abre el enlace externo o espera a que empiece la señal…"}
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
        Si acabas de iniciar la emision, espera 10–30 s: el manifest HLS puede tardar. En Android suele funcionar
        mejor el motor HLS (no el video nativo).
      </p>
    </motion.div>
  );
};

export default LivepeerPlayer;
