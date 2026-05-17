import { getShuffledEventSalaVideos } from "@/data/eventSalaVideos";
import { SkipBack, SkipForward } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export default function CinemaScreenTwoEvents() {
  const playlist = useMemo(() => getShuffledEventSalaVideos(), []);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [index, setIndex] = useState(0);
  const [status, setStatus] = useState("");

  const loadIndex = useCallback(
    (nextIndex: number, autoplay = false) => {
      const item = playlist[nextIndex];
      const el = videoRef.current;
      if (!item || !el) return;

      const wasPlaying = autoplay || !el.paused;
      el.src = item.url;
      el.load();
      setIndex(nextIndex);
      setStatus(`${nextIndex + 1}/${playlist.length} · ${item.title}`);

      if (wasPlaying) {
        void el.play().catch(() => undefined);
      }
    },
    [playlist],
  );

  useEffect(() => {
    if (playlist.length > 0) loadIndex(0, false);
  }, [loadIndex, playlist.length]);

  const onPrevious = useCallback(() => {
    if (playlist.length === 0) return;
    loadIndex((index - 1 + playlist.length) % playlist.length);
  }, [index, loadIndex, playlist.length]);

  const onNext = useCallback(() => {
    if (playlist.length === 0) return;
    loadIndex((index + 1) % playlist.length);
  }, [index, loadIndex, playlist.length]);

  const onEnded = useCallback(() => {
    if (playlist.length === 0) return;
    loadIndex((index + 1) % playlist.length, true);
  }, [index, loadIndex, playlist.length]);

  if (playlist.length === 0) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black text-xs text-white/70">
        No hay videos de eventos
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex flex-col bg-black">
      <div className="absolute inset-x-0 top-0 z-10 flex items-center gap-1 bg-black/55 px-1.5 py-1 backdrop-blur-sm">
        <button
          type="button"
          onClick={onPrevious}
          className="shrink-0 rounded p-1 text-white/90 hover:bg-white/15"
          aria-label="Video anterior"
        >
          <SkipBack className="h-4 w-4" />
        </button>
        <p className="min-w-0 flex-1 truncate text-center text-[8px] text-white/90 sm:text-[9px]">{status}</p>
        <button
          type="button"
          onClick={onNext}
          className="shrink-0 rounded p-1 text-white/90 hover:bg-white/15"
          aria-label="Siguiente video"
        >
          <SkipForward className="h-4 w-4" />
        </button>
      </div>

      <video
        ref={videoRef}
        className="h-full w-full object-contain"
        controls
        playsInline
        preload="metadata"
        onEnded={onEnded}
      />
    </div>
  );
}
