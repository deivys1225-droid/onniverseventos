import {
  AlarmClock,
  BatteryMedium,
  Facebook,
  Instagram,
  Music2,
  Pause,
  Play,
  Signal,
  SkipForward,
  Video,
  Volume2,
  Wifi,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type MediaMode = "mp3" | "mp4";

const AUDIO_EXT = /\.(mp3|m4a|wav|ogg|aac|flac)$/i;
const VIDEO_EXT = /\.(mp4|webm|mov|m4v|mkv)$/i;

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M16.5 3.5c.8 1.2 1.9 2.1 3.2 2.6V9c-1.2-.05-2.3-.4-3.2-1v6.8c0 3-2.4 5.4-5.4 5.4S5.7 17.8 5.7 14.8c0-3 2.4-5.4 5.4-5.4.4 0 .8 0 1.2.1v3.1c-.3-.1-.7-.2-1.1-.2-1.2 0-2.2 1-2.2 2.2s1 2.2 2.2 2.2 2.2-1 2.2-2.2V3.5h3.1z" />
    </svg>
  );
}

function StatusClock() {
  const [time, setTime] = useState(() => formatClock(new Date()));

  useEffect(() => {
    const id = window.setInterval(() => setTime(formatClock(new Date())), 1000);
    return () => window.clearInterval(id);
  }, []);

  return <span className="tabular-nums font-semibold">{time}</span>;
}

function formatClock(d: Date) {
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });
}

type AppTileProps = {
  label: string;
  icon: React.ReactNode;
  className?: string;
  onClick?: () => void;
};

function AppTile({ label, icon, className, onClick }: AppTileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-0 flex-col items-center justify-center gap-0.5 rounded-lg border border-white/10 bg-white/[0.06] p-1 transition hover:bg-white/12 active:scale-[0.98]",
        className,
      )}
    >
      <span className="flex h-[42%] max-h-9 w-[42%] max-w-9 items-center justify-center [&>svg]:h-full [&>svg]:w-full">
        {icon}
      </span>
      <span className="line-clamp-1 w-full text-center text-[7px] font-medium leading-tight text-white/85 sm:text-[8px]">
        {label}
      </span>
    </button>
  );
}


export default function CinemaScreenOnePhone() {
  const folderInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [mode, setMode] = useState<MediaMode>("mp3");
  const [queue, setQueue] = useState<File[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [statusText, setStatusText] = useState("Pulsa Play y elige una carpeta");

  const currentFile = queue[currentIndex] ?? null;

  const revokeUrl = useCallback((url: string | null) => {
    if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
  }, []);

  useEffect(() => {
    return () => revokeUrl(objectUrl);
  }, [objectUrl, revokeUrl]);

  const loadFileAt = useCallback(
    (index: number, files: File[]) => {
      const file = files[index];
      if (!file) return;
      revokeUrl(objectUrl);
      const url = URL.createObjectURL(file);
      setObjectUrl(url);
      setCurrentIndex(index);
      setStatusText(file.name);

      const audio = audioRef.current;
      const video = videoRef.current;
      if (mode === "mp3" && audio) {
        audio.src = url;
        void audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      } else if (mode === "mp4" && video) {
        video.src = url;
        void video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      }
    },
    [mode, objectUrl, revokeUrl],
  );

  const filterFiles = useCallback((files: FileList | null, mediaMode: MediaMode) => {
    if (!files) return [];
    const list = Array.from(files);
    const ext = mediaMode === "mp3" ? AUDIO_EXT : VIDEO_EXT;
    return list.filter((f) => ext.test(f.name) || (mediaMode === "mp3" ? f.type.startsWith("audio/") : f.type.startsWith("video/")));
  }, []);

  const openFolderPicker = useCallback(() => {
    const input = folderInputRef.current;
    if (!input) return;
    input.value = "";
    input.click();
  }, []);

  const onFolderSelected = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const picked = filterFiles(e.target.files, mode);
      if (picked.length === 0) {
        setStatusText(mode === "mp3" ? "No hay audio en esa carpeta" : "No hay video en esa carpeta");
        setQueue([]);
        setIsPlaying(false);
        return;
      }
      picked.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
      setQueue(picked);
      loadFileAt(0, picked);
    },
    [filterFiles, loadFileAt, mode],
  );

  const onPlay = useCallback(() => {
    if (queue.length === 0) {
      openFolderPicker();
      return;
    }
    const audio = audioRef.current;
    const video = videoRef.current;
    if (mode === "mp3" && audio) {
      void audio.play().then(() => setIsPlaying(true));
    } else if (mode === "mp4" && video) {
      void video.play().then(() => setIsPlaying(true));
    }
  }, [mode, openFolderPicker, queue.length]);

  const onPause = useCallback(() => {
    audioRef.current?.pause();
    videoRef.current?.pause();
    setIsPlaying(false);
  }, []);

  const onNext = useCallback(() => {
    if (queue.length === 0) {
      openFolderPicker();
      return;
    }
    const next = (currentIndex + 1) % queue.length;
    loadFileAt(next, queue);
  }, [currentIndex, loadFileAt, openFolderPicker, queue]);

  const onModeChange = (next: MediaMode) => {
    setMode(next);
    setQueue([]);
    setCurrentIndex(0);
    setIsPlaying(false);
    revokeUrl(objectUrl);
    setObjectUrl(null);
    if (audioRef.current) audioRef.current.src = "";
    if (videoRef.current) videoRef.current.src = "";
    setStatusText(next === "mp3" ? "Modo MP3 — Play para elegir carpeta" : "Modo MP4 — Play para elegir carpeta");
  };

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden bg-[#0a0a0f] text-white">
      <input
        ref={folderInputRef}
        type="file"
        className="sr-only"
        // @ts-expect-error webkitdirectory para carpeta completa
        webkitdirectory=""
        directory=""
        multiple
        onChange={onFolderSelected}
      />
      <audio ref={audioRef} className="sr-only" onEnded={onNext} onPause={() => setIsPlaying(false)} onPlay={() => setIsPlaying(true)} />
      {mode === "mp4" && (
        <video
          ref={videoRef}
          className="pointer-events-none absolute inset-0 z-0 h-full w-full object-cover opacity-35"
          playsInline
          onEnded={onNext}
          onPause={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
        />
      )}

      {/* Barra de estado */}
      <div className="relative z-10 flex shrink-0 items-center justify-between gap-2 border-b border-white/10 bg-black/55 px-2 py-1 text-[9px] sm:text-[10px]">
        <StatusClock />
        <div className="flex items-center gap-1.5 text-white/90 sm:gap-2">
          <Signal className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden />
          <Wifi className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden />
          <Volume2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden />
          <AlarmClock className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden />
          <span className="flex items-center gap-0.5 tabular-nums">
            <BatteryMedium className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
            84%
          </span>
        </div>
      </div>

      {/* Reproductor MP3 / MP4 */}
      <div className="relative z-10 flex shrink-0 flex-col gap-1 border-b border-white/10 bg-black/70 px-2 py-1.5 backdrop-blur-sm">
        <div className="grid grid-cols-2 gap-1">
          <button
            type="button"
            onClick={() => onModeChange("mp3")}
            className={cn(
              "flex items-center justify-center gap-1 rounded-md py-1 text-[9px] font-bold uppercase tracking-wide sm:text-[10px]",
              mode === "mp3" ? "bg-cyan-600 text-white" : "bg-white/10 text-white/70",
            )}
          >
            <Music2 className="h-3 w-3" /> MP3
          </button>
          <button
            type="button"
            onClick={() => onModeChange("mp4")}
            className={cn(
              "flex items-center justify-center gap-1 rounded-md py-1 text-[9px] font-bold uppercase tracking-wide sm:text-[10px]",
              mode === "mp4" ? "bg-violet-600 text-white" : "bg-white/10 text-white/70",
            )}
          >
            <Video className="h-3 w-3" /> MP4
          </button>
        </div>
        <p className="line-clamp-1 text-center text-[8px] text-white/75 sm:text-[9px]">{statusText}</p>
        <div className="grid grid-cols-3 gap-1">
          <button
            type="button"
            onClick={onPlay}
            className="flex items-center justify-center gap-1 rounded-md bg-emerald-600 py-1.5 text-[9px] font-semibold hover:bg-emerald-500 sm:text-[10px]"
          >
            <Play className="h-3.5 w-3.5" /> Play
          </button>
          <button
            type="button"
            onClick={onPause}
            className="flex items-center justify-center gap-1 rounded-md bg-amber-600 py-1.5 text-[9px] font-semibold hover:bg-amber-500 sm:text-[10px]"
          >
            <Pause className="h-3.5 w-3.5" /> Pausa
          </button>
          <button
            type="button"
            onClick={onNext}
            className="flex items-center justify-center gap-1 rounded-md bg-sky-600 py-1.5 text-[9px] font-semibold hover:bg-sky-500 sm:text-[10px]"
          >
            <SkipForward className="h-3.5 w-3.5" /> Siguiente
          </button>
        </div>
        <button
          type="button"
          onClick={openFolderPicker}
          className="rounded-md border border-white/15 bg-white/5 py-0.5 text-[8px] text-white/70 hover:bg-white/10 sm:text-[9px]"
        >
          Elegir carpeta…
        </button>
      </div>

      {/* Iconos — ocupan el resto de la pantalla */}
      <div className="relative z-10 grid min-h-0 flex-1 grid-cols-3 grid-rows-3 gap-1 p-1.5 sm:gap-1.5 sm:p-2">
        <AppTile label="Facebook" icon={<Facebook className="text-[#1877f2]" />} className="bg-[#1877f2]/15" />
        <AppTile label="Instagram" icon={<Instagram className="text-[#e4405f]" />} className="bg-[#e4405f]/15" />
        <AppTile label="TikTok" icon={<TikTokIcon className="text-white" />} className="bg-white/10" />
        <AppTile label="Volumen" icon={<Volume2 className="text-cyan-300" />} onClick={() => setStatusText("Volumen del sistema")} />
        <AppTile label="Alarma" icon={<AlarmClock className="text-amber-300" />} onClick={() => setStatusText("Alarma")} />
        <AppTile label="Señal" icon={<Signal className="text-emerald-400" />} />
        <AppTile label="WiFi" icon={<Wifi className="text-sky-400" />} />
        <AppTile label="Batería" icon={<BatteryMedium className="text-lime-400" />} />
      </div>
    </div>
  );
}
