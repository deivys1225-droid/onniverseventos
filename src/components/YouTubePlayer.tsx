import { motion } from "framer-motion";
import { youtubeEmbedUrlFromUrl } from "@/lib/audiencePlayback";

interface YouTubePlayerProps {
  videoId?: string;
  embedUrl?: string;
  title: string;
  /** Sin marco extra ni pie; mismo aspecto que un `<video>` de sala. */
  variant?: "default" | "cinema";
}

const cinemaFrameClassName =
  "aspect-video w-full overflow-hidden rounded-xl border border-cyan-300/45 bg-black shadow-[0_0_48px_-10px_rgba(34,211,238,0.95)]";

const YouTubePlayer = ({ videoId, embedUrl, title, variant = "default" }: YouTubePlayerProps) => {
  const src =
    embedUrl?.trim() ||
    (videoId ? youtubeEmbedUrlFromUrl(`youtube:${videoId}`) : null);

  if (!src) return null;

  if (variant === "cinema") {
    return (
      <iframe
        src={src}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        className={cinemaFrameClassName}
      />
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
          <iframe
            src={src}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <div className="h-2 w-2 animate-pulse rounded-full bg-destructive" />
        <span className="text-sm font-medium text-muted-foreground">Transmisión vía YouTube</span>
      </div>
    </motion.div>
  );
};

export default YouTubePlayer;
