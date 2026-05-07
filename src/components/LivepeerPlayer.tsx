import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import Hls from "hls.js";

interface LivepeerPlayerProps {
  playbackId: string;
  title: string;
}

const LivepeerPlayer = ({ playbackId, title }: LivepeerPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsUrl = `https://livepeercdn.studio/hls/${encodeURIComponent(playbackId)}/index.m3u8`;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !playbackId) return;

    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(hlsUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
      });
      return () => hls.destroy();
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = hlsUrl;
      video.addEventListener("loadedmetadata", () => {
        video.play().catch(() => {});
      });
    }
  }, [hlsUrl, playbackId]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="relative rounded-2xl overflow-hidden border border-primary/20 shadow-[0_0_60px_-15px_hsl(var(--primary)/0.3)]">
        <div className="aspect-video w-full bg-muted">
          <video
            ref={videoRef}
            controls
            playsInline
            className="w-full h-full"
            title={title}
          />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        <span className="text-sm text-muted-foreground font-medium">
          Transmisión en vivo vía Livepeer
        </span>
      </div>
    </motion.div>
  );
};

export default LivepeerPlayer;
