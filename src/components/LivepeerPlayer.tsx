import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Capacitor } from "@capacitor/core";
import Hls from "hls.js";

interface LivepeerPlayerProps {
  playbackId: string;
  title: string;
}

/** Reproductor oficial en web (funciona bien en WebView cuando Hls.js falla). */
const livepeerEmbedSrc = (playbackId: string) =>
  `https://lvpr.tv/?v=${encodeURIComponent(playbackId)}&lowLatency=true`;

/** Capacitor o WebView Android típico (`; wv)`): Hls.js suele ir mal, mejor iframe lvpr. */
function preferLivepeerEmbedInitially(): boolean {
  if (Capacitor.isNativePlatform()) return true;
  if (typeof navigator === "undefined") return false;
  return /; wv\)/i.test(navigator.userAgent);
}

const LivepeerPlayer = ({ playbackId, title }: LivepeerPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [useIframeFallback, setUseIframeFallback] = useState(() => preferLivepeerEmbedInitially());
  const hlsUrl = `https://livepeercdn.studio/hls/${encodeURIComponent(playbackId)}/index.m3u8`;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !playbackId || useIframeFallback) return;

    video.playsInline = true;
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });
      hls.loadSource(hlsUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        void video.play().catch(() => {});
      });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          hls.destroy();
          setUseIframeFallback(true);
        }
      });
      return () => hls.destroy();
    }

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = hlsUrl;
      const onMeta = () => void video.play().catch(() => {});
      video.addEventListener("loadedmetadata", onMeta);
      video.addEventListener("error", () => setUseIframeFallback(true));
      return () => {
        video.removeEventListener("loadedmetadata", onMeta);
      };
    }

    setUseIframeFallback(true);
    return undefined;
  }, [hlsUrl, playbackId, useIframeFallback]);

  if (useIframeFallback) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="relative overflow-hidden rounded-2xl border border-primary/20 shadow-[0_0_60px_-15px_hsl(var(--primary)/0.3)]">
          <div className="aspect-video w-full bg-muted">
            <iframe
              title={title}
              src={livepeerEmbedSrc(playbackId)}
              className="h-full w-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
            />
          </div>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Si no ves imagen aún, espera unos segundos: el HLS puede tardar en estar listo cuando el celular acaba de iniciar la emisión.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 shadow-[0_0_60px_-15px_hsl(var(--primary)/0.3)]">
        <div className="aspect-video w-full bg-muted">
          <video
            ref={videoRef}
            controls
            playsInline
            className="h-full w-full"
            title={title}
          />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
        <span className="text-sm font-medium text-muted-foreground">Transmisión en vivo vía Livepeer</span>
      </div>
    </motion.div>
  );
};

export default LivepeerPlayer;
