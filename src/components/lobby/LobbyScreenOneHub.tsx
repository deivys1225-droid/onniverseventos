import { memo, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";

const DB_NAME = "onniverso.lobby.screen1.audio";
const STORE = "handles";
const STORE_KEY = "musicDir";

const MEDIA_EXT = /\.(mp3|m4a|ogg|wav|aac|flac|mp4)$/i;

/**
 * Item nativo Android: el archivo vive en el dispositivo del usuario; se obtiene vía
 * el bridge {@code window.AndroidMusic} (SAF + base64). Solo cargamos los bytes en
 * memoria cuando vamos a reproducir esa canción (lazy), no toda la playlist a la vez.
 */
type AndroidMusicItem = { idx: number; name: string; mime: string };

type PlaylistItem =
  | { kind: "file"; name: string; handle: FileSystemFileHandle }
  | { kind: "blob"; name: string; file: File }
  | { kind: "url"; name: string; url: string }
  | { kind: "android"; name: string; idx: number; mime: string };

declare global {
  interface Window {
    AndroidMusic?: {
      pickMusicFolder(callbackName: string): void;
      readMusicFileBase64(idx: number): string;
      getMusicMime(idx: number): string;
      getMusicCount(): number;
    };
    __onniversoMusicFolderPicked?: (
      items: AndroidMusicItem[] | null,
      error: string | null,
    ) => void;
  }
}

const ANDROID_MUSIC_CALLBACK = "__onniversoMusicFolderPicked";

function hasAndroidMusicBridge(): boolean {
  return typeof window !== "undefined" && typeof window.AndroidMusic?.pickMusicFolder === "function";
}

/** Convierte un base64 sin saltos en {@link Blob} sin pasar por `atob` enorme de una sola vez. */
function base64ToBlob(b64: string, mime: string): Blob {
  const byteChars = atob(b64);
  const len = byteChars.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = byteChars.charCodeAt(i);
  return new Blob([bytes], { type: mime || "application/octet-stream" });
}

function isMp4(name: string): boolean {
  return /\.mp4$/i.test(name);
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function loadStoredDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const r = tx.objectStore(STORE).get(STORE_KEY);
      r.onsuccess = () => resolve((r.result as FileSystemDirectoryHandle | undefined) ?? null);
      r.onerror = () => reject(r.error);
    });
  } catch {
    return null;
  }
}

async function saveDirectoryHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(handle, STORE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function verifyDirReadPermission(dir: FileSystemDirectoryHandle): Promise<boolean> {
  const opts: FileSystemHandlePermissionDescriptor = { mode: "read" };
  if ((await dir.queryPermission?.(opts)) === "granted") return true;
  if ((await dir.requestPermission?.(opts)) === "granted") return true;
  return false;
}

async function collectMediaFiles(root: FileSystemDirectoryHandle): Promise<PlaylistItem[]> {
  const out: PlaylistItem[] = [];

  async function walk(dir: FileSystemDirectoryHandle, prefix: string) {
    for await (const [name, entry] of dir.entries()) {
      const path = prefix ? `${prefix}/${name}` : name;
      if (entry.kind === "file" && MEDIA_EXT.test(name)) {
        out.push({ kind: "file", name: path, handle: entry as FileSystemFileHandle });
      } else if (entry.kind === "directory") {
        await walk(entry as FileSystemDirectoryHandle, path);
      }
    }
  }

  await walk(root, "");
  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}

function shuffleOrder(length: number): number[] {
  const arr = Array.from({ length }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const bundledModules = import.meta.glob("../../assets/lobby-screen1/*.{mp3,ogg,wav,m4a,mp4}", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

const bundledPlaylist: PlaylistItem[] = Object.entries(bundledModules).map(([path, url]) => ({
  kind: "url" as const,
  name: path.split("/").pop() ?? path,
  url: url as string,
}));

type HubProps = {
  width: number;
  height: number;
};

function cpuStateColor(state: string | null): string {
  switch (state) {
    case "critical":
      return "#f87171";
    case "serious":
      return "#fb923c";
    case "fair":
      return "#fbbf24";
    case "nominal":
      return "#22d3ee";
    default:
      return "#94a3b8";
  }
}

function NeonCpuIcon({ state }: { state: string | null }) {
  const stroke = cpuStateColor(state);
  return (
    <svg width="52" height="44" viewBox="0 0 28 24" aria-hidden style={{ filter: `drop-shadow(0 0 4px ${stroke}88)` }}>
      <rect x="5" y="4" width="18" height="14" rx="2" fill="none" stroke={stroke} strokeWidth="1.5" />
      <path d="M9 8h10M9 11h7M9 14h10" stroke={stroke} strokeWidth="1.1" strokeLinecap="round" />
      <path d="M14 1v3M14 20v3M1 11h3M24 11h3" stroke={stroke} strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

function NeonDiskIcon({ stroke }: { stroke: string }) {
  return (
    <svg width="52" height="44" viewBox="0 0 28 24" aria-hidden style={{ filter: `drop-shadow(0 0 4px ${stroke}88)` }}>
      <ellipse cx="14" cy="18" rx="9" ry="3" fill="none" stroke={stroke} strokeWidth="1.3" />
      <path d="M5 18V8c0-2 4-3.5 9-3.5s9 1.5 9 3.5v10" fill="none" stroke={stroke} strokeWidth="1.3" />
      <ellipse cx="14" cy="8" rx="9" ry="3" fill="none" stroke={stroke} strokeWidth="1.3" />
    </svg>
  );
}

function NeonSpeakerIcon({ muted }: { muted: boolean }) {
  const stroke = muted ? "#f87171" : "#22d3ee";
  return (
    <svg width="52" height="44" viewBox="0 0 28 24" aria-hidden style={{ filter: `drop-shadow(0 0 4px ${stroke}88)` }}>
      <path d="M4 9v6h4l5 4V5L8 9H4z" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" />
      {!muted ? (
        <>
          <path d="M15 8c2 2 2 6 0 8" fill="none" stroke={stroke} strokeWidth="1.3" strokeLinecap="round" />
          <path d="M17 5c3.5 3.5 3.5 10.5 0 14" fill="none" stroke={stroke} strokeWidth="1.3" strokeLinecap="round" />
        </>
      ) : (
        <path d="M15 7l9 10M24 7l-9 10" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
      )}
    </svg>
  );
}

function NeonVibrateIcon({ active }: { active: boolean }) {
  const stroke = active ? "#a78bfa" : "#475569";
  return (
    <svg width="52" height="44" viewBox="0 0 28 24" aria-hidden style={{ filter: active ? `drop-shadow(0 0 4px ${stroke}88)` : "none" }}>
      <rect x="11" y="3" width="6" height="18" rx="1.5" fill="none" stroke={stroke} strokeWidth="1.4" />
      <path d="M7 7v2M7 12v2M7 17v2M21 7v2M21 12v2M21 17v2" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function NeonFpsIcon({ stroke }: { stroke: string }) {
  return (
    <svg width="52" height="44" viewBox="0 0 28 24" aria-hidden style={{ filter: `drop-shadow(0 0 4px ${stroke}88)` }}>
      <rect x="3" y="4" width="22" height="16" rx="2" fill="none" stroke={stroke} strokeWidth="1.3" />
      <path d="M7 17l4-10 4 8 4-8" fill="none" stroke={stroke} strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function NeonBatteryIcon({ level }: { level: number | null }) {
  const pct = level == null ? null : Math.round(level * 100);
  const fillH = pct == null ? 16 : Math.max(3, Math.round((pct / 100) * 24));
  return (
    <svg width="60" height="60" viewBox="0 0 40 40" aria-hidden style={{ filter: "drop-shadow(0 0 5px rgba(34,211,238,0.85))" }}>
      <rect x="4" y="10" width="28" height="20" rx="3" fill="none" stroke="#22d3ee" strokeWidth="2" />
      <rect x="32" y="15" width="3" height="10" rx="1" fill="#22d3ee" />
      <rect x="8" y={30 - fillH} width="20" height={fillH} rx="2" fill="#22d3ee" opacity="0.9" />
    </svg>
  );
}

function NeonWifiIcon({ online, quality }: { online: boolean; quality: string }) {
  const stroke = online ? "#22d3ee" : "#64748b";
  return (
    <svg width="60" height="60" viewBox="0 0 40 40" aria-hidden style={{ filter: online ? "drop-shadow(0 0 5px rgba(34,211,238,0.8))" : "none" }}>
      {!online ? (
        <>
          <path d="M6 32 L32 8" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round" />
          <path
            d="M8 24c6-5 14-8 22-8M12 18c5-4 11-6 16-6"
            fill="none"
            stroke={stroke}
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.45"
          />
        </>
      ) : (
        <>
          <path d="M6 22c8-7 20-7 28 0" fill="none" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" />
          <path d="M11 28c6-5 12-5 18 0" fill="none" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" />
          <path d="M16 34c4-3 8-3 12 0" fill="none" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="22" cy="38" r="2" fill={stroke} />
        </>
      )}
      {online && quality !== "unknown" ? (
        <text x="2" y="9" fill="#7dd3fc" fontSize="7" fontFamily="monospace">
          {quality}
        </text>
      ) : null}
    </svg>
  );
}

function indicatorWrap(icon: ReactNode, label: string) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1, minWidth: "68px" }}>
      {icon}
      <span style={{ fontSize: "14px", color: "#a5f3fc", fontWeight: 700, letterSpacing: "0.02em", textAlign: "center", lineHeight: 1.1 }}>
        {label}
      </span>
    </div>
  );
}

export const LobbyScreenOneHub = memo(function LobbyScreenOneHub({
  width,
  height,
}: HubProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  /**
   * Input oculto (sin botón visible) usado como último fallback en navegadores
   * móviles web (Chrome Android, Safari iOS) donde no hay bridge nativo
   * AndroidMusic ni `window.showDirectoryPicker`. `webkitdirectory` se aplica
   * vía ref porque no es atributo HTML estándar y rolldown/tsx lo rechaza en
   * el JSX. Cuando el SO no expone selector de carpetas, el mismo input cae a
   * multiselección de archivos — útil de todos modos.
   */
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    folderInputRef.current?.setAttribute("webkitdirectory", "");
    folderInputRef.current?.setAttribute("directory", "");
  }, []);

  const [playlist, setPlaylist] = useState<PlaylistItem[]>([]);
  const [order, setOrder] = useState<number[]>([]);
  const [orderPos, setOrderPos] = useState(0);
  const [status, setStatus] = useState("");
  const [playingVideo, setPlayingVideo] = useState(false);
  const [muted, setMuted] = useState(false);

  const [clock, setClock] = useState(() => new Date());
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [online, setOnline] = useState(() => (typeof navigator !== "undefined" ? navigator.onLine : true));
  const [netQuality, setNetQuality] = useState<string>("unknown");

  const [cpuPressure, setCpuPressure] = useState<string | null>(null);
  const [diskFreePct, setDiskFreePct] = useState<number | null>(null);
  const [fps, setFps] = useState(0);

  const halfH = Math.floor(height / 2);

  const currentItem = useMemo(() => {
    if (!playlist.length || !order.length) return null;
    return playlist[order[orderPos % order.length]];
  }, [playlist, order, orderPos]);

  const revokeObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = muted;
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted, playingVideo]);

  const playItem = useCallback(
    async (item: PlaylistItem) => {
      revokeObjectUrl();
      const name = item.name;
      const asVideo = isMp4(name);

      let url: string;
      if (item.kind === "url") {
        url = item.url;
      } else if (item.kind === "blob") {
        // Android / fallback: el File proviene de <input type=file webkitdirectory multiple>.
        url = URL.createObjectURL(item.file);
        objectUrlRef.current = url;
      } else if (item.kind === "android") {
        // Lectura lazy desde el bridge SAF: solo cargamos en memoria el track que vamos a tocar.
        const bridge = window.AndroidMusic;
        if (!bridge) {
          setStatus("Bridge nativo no disponible. Toca Play otra vez.");
          return;
        }
        const b64 = bridge.readMusicFileBase64(item.idx);
        if (!b64) {
          setStatus("No se pudo leer el archivo. Elige la carpeta otra vez.");
          return;
        }
        const mime = bridge.getMusicMime(item.idx) || item.mime || (isMp4(name) ? "video/mp4" : "audio/mpeg");
        const blob = base64ToBlob(b64, mime);
        url = URL.createObjectURL(blob);
        objectUrlRef.current = url;
      } else {
        // Desktop Chrome/Edge con File System Access API.
        const file = await item.handle.getFile();
        url = URL.createObjectURL(file);
        objectUrlRef.current = url;
      }

      audioRef.current?.pause();
      if (audioRef.current) {
        audioRef.current.removeAttribute("src");
        audioRef.current.load();
      }
      videoRef.current?.pause();
      if (videoRef.current) {
        videoRef.current.removeAttribute("src");
        videoRef.current.load();
      }

      if (asVideo) {
        const v = videoRef.current;
        if (!v) return;
        v.src = url;
        v.muted = muted;
        setPlayingVideo(true);
        await v.play();
      } else {
        setPlayingVideo(false);
        const a = audioRef.current;
        if (!a) return;
        a.src = url;
        a.muted = muted;
        await a.play();
      }
    },
    [muted, revokeObjectUrl],
  );

  const bootstrapFromDirectory = useCallback(
    async (dir: FileSystemDirectoryHandle) => {
      const ok = await verifyDirReadPermission(dir);
      if (!ok) return false;
      const list = await collectMediaFiles(dir);
      if (!list.length) return false;
      await saveDirectoryHandle(dir);
      const shuffled = shuffleOrder(list.length);
      setPlaylist(list);
      setOrder(shuffled);
      setOrderPos(0);
      await playItem(list[shuffled[0]]);
      return true;
    },
    [playItem],
  );

  const tryRestoreOnMount = useCallback(async () => {
    const dir = await loadStoredDirectoryHandle();
    if (!dir) return;
    const ok = await verifyDirReadPermission(dir);
    if (!ok) return;
    const list = await collectMediaFiles(dir);
    if (!list.length) return;
    const shuffled = shuffleOrder(list.length);
    setPlaylist(list);
    setOrder(shuffled);
    setOrderPos(0);
  }, []);

  useEffect(() => {
    void tryRestoreOnMount();
  }, [tryRestoreOnMount]);

  useEffect(() => {
    const id = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const nav = navigator as Navigator & {
      connection?: {
        effectiveType?: string;
        addEventListener: typeof window.addEventListener;
        removeEventListener: typeof window.removeEventListener;
      };
    };
    const syncNet = () => {
      setOnline(navigator.onLine);
      setNetQuality(nav.connection?.effectiveType ?? "unknown");
    };
    syncNet();
    window.addEventListener("online", syncNet);
    window.addEventListener("offline", syncNet);
    nav.connection?.addEventListener?.("change", syncNet as EventListener);
    return () => {
      window.removeEventListener("online", syncNet);
      window.removeEventListener("offline", syncNet);
      nav.connection?.removeEventListener?.("change", syncNet as EventListener);
    };
  }, []);

  useEffect(() => {
    const p = navigator.getBattery?.();
    if (!p) return;
    let b: BatteryManager | null = null;
    const onLevel = () => b && setBatteryLevel(b.level);
    void p.then((bat) => {
      b = bat;
      onLevel();
      bat.addEventListener("levelchange", onLevel);
    });
    return () => {
      if (b) b.removeEventListener("levelchange", onLevel);
    };
  }, []);

  useEffect(() => {
    let obs: { disconnect: () => void } | null = null;
    const w = window as unknown as {
      PressureObserver?: new (cb: (records: ReadonlyArray<{ state: string }>) => void, opts?: { sampleInterval?: number }) => {
        observe: (source: "cpu") => void;
        disconnect: () => void;
      };
    };
    if (w.PressureObserver) {
      try {
        const o = new w.PressureObserver(
          (records) => {
            const s = records[0]?.state;
            if (s) setCpuPressure(s);
          },
          { sampleInterval: 1500 },
        );
        void o.observe("cpu");
        obs = o;
      } catch {
        setCpuPressure(null);
      }
    }
    return () => obs?.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const est = await navigator.storage?.estimate?.();
        if (cancelled || !est?.quota) return;
        const free = 1 - est.usage / est.quota;
        setDiskFreePct(Math.round(Math.max(0, Math.min(1, free)) * 100));
      } catch {
        setDiskFreePct(null);
      }
    };
    void tick();
    const id = window.setInterval(tick, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    let frames = 0;
    let last = performance.now();
    let raf = 0;
    const loop = (t: number) => {
      frames++;
      if (t - last >= 1000) {
        setFps(frames);
        frames = 0;
        last = t;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => () => revokeObjectUrl(), [revokeObjectUrl]);

  /**
   * Arma playlist desde el `FileList` del input oculto (fallback navegador móvil
   * web sin bridge AndroidMusic ni showDirectoryPicker). Cada archivo se vuelve
   * un PlaylistItem `kind: "blob"` que en playItem se convierte a object URL.
   */
  const buildPlaylistFromFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) {
        setStatus("");
        return false;
      }
      const items: PlaylistItem[] = [];
      for (const f of Array.from(files)) {
        if (!MEDIA_EXT.test(f.name)) continue;
        const rel = (f as File & { webkitRelativePath?: string }).webkitRelativePath;
        items.push({ kind: "blob", name: rel?.trim() || f.name, file: f });
      }
      if (!items.length) {
        setStatus("Sin archivos MP3/MP4 en la selección.");
        return false;
      }
      items.sort((a, b) => a.name.localeCompare(b.name));
      const shuffled = shuffleOrder(items.length);
      setPlaylist(items);
      setOrder(shuffled);
      setOrderPos(0);
      setStatus("");
      await playItem(items[shuffled[0]]);
      return true;
    },
    [playItem],
  );

  const onFolderInputChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      e.target.value = ""; // permite re-elegir la misma carpeta y disparar change otra vez
      await buildPlaylistFromFiles(files);
    },
    [buildPlaylistFromFiles],
  );

  /**
   * Selector de carpeta para Android Capacitor (bridge nativo SAF).
   * Define el callback global ANTES de invocar el bridge — el resultado vuelve por
   * {@code window[ANDROID_MUSIC_CALLBACK]} (ver MainActivity.dispatchMusicResult).
   *
   * Declarado ANTES de {@link onPlay} porque éste lo referencia en sus deps de
   * useCallback: las `const` están en TDZ hasta su línea de declaración, y si
   * onPlay se evalúa primero se rompe todo el componente con ReferenceError.
   */
  const pickFolderViaAndroidBridge = useCallback(() => {
    const bridge = window.AndroidMusic;
    if (!bridge) return false;
    setStatus("Pidiendo permiso y abriendo selector de carpeta…");
    window[ANDROID_MUSIC_CALLBACK] = async (items, error) => {
      window[ANDROID_MUSIC_CALLBACK] = undefined;
      if (error === "cancelled") {
        setStatus("");
        return;
      }
      if (error || !items || items.length === 0) {
        setStatus(
          error === "no-tree" || error === "no-picker"
            ? "Tu Android no abrió el selector. Toca Play de nuevo."
            : "Sin archivos MP3/MP4 en la carpeta elegida.",
        );
        return;
      }
      const playlistItems: PlaylistItem[] = items
        .map<PlaylistItem>((it) => ({
          kind: "android" as const,
          name: it.name,
          idx: it.idx,
          mime: it.mime,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
      const shuffled = shuffleOrder(playlistItems.length);
      setPlaylist(playlistItems);
      setOrder(shuffled);
      setOrderPos(0);
      setStatus("");
      try {
        await playItem(playlistItems[shuffled[0]]);
      } catch (e) {
        setStatus("Error al iniciar reproducción.");
        console.warn("AndroidMusic playItem failed", e);
      }
    };
    try {
      bridge.pickMusicFolder(ANDROID_MUSIC_CALLBACK);
      return true;
    } catch (e) {
      window[ANDROID_MUSIC_CALLBACK] = undefined;
      console.warn("AndroidMusic.pickMusicFolder threw", e);
      setStatus("Bridge nativo no respondió. Toca Play otra vez.");
      return false;
    }
  }, [playItem]);

  const onPlay = useCallback(async () => {
    // Eco visible inmediato: confirma que el click del boton llego al handler.
    // Si no aparece este texto en cyan abajo del reproductor al tocar Play en mobile,
    // es señal de que el toque se está perdiendo antes de React (pointerEvents/<Html>).
    setStatus("Buscando música…");
    if (playlist.length > 0 && order.length > 0) {
      const item = playlist[order[orderPos % order.length]];
      await playItem(item);
      return;
    }
    if (bundledPlaylist.length > 0) {
      const shuffled = shuffleOrder(bundledPlaylist.length);
      setPlaylist(bundledPlaylist);
      setOrder(shuffled);
      setOrderPos(0);
      await playItem(bundledPlaylist[shuffled[0]]);
      return;
    }
    // Android Capacitor: bridge nativo SAF → permisos + selector de carpeta del sistema.
    if (hasAndroidMusicBridge()) {
      pickFolderViaAndroidBridge();
      return;
    }
    // Desktop: File System Access API → carpeta persistente con permisos.
    if (typeof window.showDirectoryPicker === "function") {
      try {
        const dir = await window.showDirectoryPicker();
        const ok = await bootstrapFromDirectory(dir);
        if (!ok) setStatus("Sin archivos MP3/MP4 en la carpeta.");
      } catch {
        setStatus("");
      }
      return;
    }
    // Restaurar carpeta previa (solo si el navegador la persistió).
    const dir = await loadStoredDirectoryHandle();
    if (dir) {
      const list = await collectMediaFiles(dir);
      const canRead = await verifyDirReadPermission(dir);
      if (canRead && list.length > 0) {
        await bootstrapFromDirectory(dir);
        return;
      }
    }
    // Último fallback (navegador móvil web sin bridge ni File System Access):
    // disparamos un <input type="file" webkitdirectory multiple> programáticamente.
    // El usuario ve el selector nativo del SO con sus carpetas / archivos de música.
    if (folderInputRef.current) {
      folderInputRef.current.click();
      return;
    }
    setStatus("Tu navegador no soporta selector de archivos. Abre la app desde el APK.");
  }, [playlist, order, orderPos, playItem, bootstrapFromDirectory, pickFolderViaAndroidBridge]);

  const onPause = useCallback(() => {
    audioRef.current?.pause();
    videoRef.current?.pause();
  }, []);

  const onNext = useCallback(async () => {
    if (!playlist.length || !order.length) return;
    const next = (orderPos + 1) % order.length;
    setOrderPos(next);
    await playItem(playlist[order[next]]);
  }, [playlist, order, orderPos, playItem]);

  const timeLabel = useMemo(
    () =>
      clock.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }),
    [clock],
  );

  const batteryPct = batteryLevel == null ? "—" : `${Math.round(batteryLevel * 100)}%`;
  const diskLabel = diskFreePct == null ? "—" : `${diskFreePct}%`;
  const cpuLabel = cpuPressure ? cpuPressure.toUpperCase() : "CPU";
  const vibrateHint = typeof navigator.vibrate === "function";

  const btnStyle: CSSProperties = {
    flex: 1,
    minWidth: 0,
    padding: "10px 6px",
    fontSize: "18px",
    fontWeight: 800,
    letterSpacing: "0.05em",
    borderRadius: "12px",
    border: "2px solid rgba(34,211,238,0.6)",
    background: "rgba(2,8,18,0.95)",
    color: "#e0fbff",
    cursor: "pointer",
    boxShadow: "0 0 16px rgba(34,211,238,0.4), inset 0 0 16px rgba(34,211,238,0.06)",
    textTransform: "uppercase",
    // En WebView Android los <button> heredan touch-action del canvas Three.js y a veces
    // los taps se "comen" antes de disparar onClick. manipulation = pan + zoom sin doble-tap.
    touchAction: "manipulation",
    WebkitTapHighlightColor: "rgba(34,211,238,0.5)",
    WebkitUserSelect: "none",
    userSelect: "none",
  };

  return (
    <div
      style={{
        width,
        height,
        display: "flex",
        flexDirection: "column",
        background: "#02030a",
        fontFamily: "system-ui, sans-serif",
        userSelect: "none",
        contain: "strict",
      }}
    >
      <audio ref={audioRef} preload="none" style={{ display: "none" }} />
      {/*
        Selector oculto disparado por Play como último fallback en navegadores
        móviles web (Chrome Android / Safari iOS). webkitdirectory se aplica vía
        ref porque no es prop estándar JSX; si el SO no soporta selector de
        carpetas, el mismo input cae a multi-selección de archivos.
      */}
      <input
        ref={folderInputRef}
        type="file"
        multiple
        accept=".mp3,.m4a,.ogg,.wav,.aac,.flac,.mp4,audio/*,video/mp4"
        onChange={onFolderInputChange}
        style={{ display: "none" }}
        aria-hidden
      />

      <div
        style={{
          height: halfH,
          boxSizing: "border-box",
          borderBottom: "1px solid rgba(34,211,238,0.35)",
          display: "flex",
          flexDirection: "column",
          padding: "6px 10px",
          gap: 6,
          minHeight: 0,
        }}
      >
        <video
          ref={videoRef}
          playsInline
          preload="metadata"
          muted={muted}
          style={{
            flex: playingVideo ? 1 : 0,
            width: "100%",
            minHeight: playingVideo ? 40 : 0,
            maxHeight: playingVideo ? "100%" : 0,
            opacity: playingVideo ? 1 : 0,
            pointerEvents: playingVideo ? "auto" : "none",
            objectFit: "contain",
            background: "#000",
            borderRadius: "8px",
            border: playingVideo ? "1px solid rgba(34,211,238,0.35)" : "none",
            transition: "opacity 0.15s ease",
          }}
        />

        {!playingVideo ? (
          <div
            style={{
              flex: 1,
              minHeight: 0,
              borderRadius: "8px",
              border: "1px dashed rgba(34,211,238,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "11px",
              color: "#64748b",
            }}
          >
            MP3 · audio · MP4 = video
          </div>
        ) : null}

        <div
          style={{
            fontSize: "11px",
            color: "#7dd3fc",
            textAlign: "center",
            lineHeight: 1.25,
            textShadow: "0 0 6px rgba(34,211,238,0.45)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          {currentItem ? currentItem.name : "Play · MP3 o MP4 · orden aleatorio"}
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button type="button" style={btnStyle} onClick={() => void onPlay()}>
            Play
          </button>
          <button type="button" style={btnStyle} onClick={onPause}>
            Pausa
          </button>
          <button type="button" style={btnStyle} onClick={() => void onNext()}>
            Siguiente
          </button>
        </div>
        {status ? <div style={{ fontSize: "10px", color: "#fca5a5", textAlign: "center" }}>{status}</div> : null}
      </div>

      <div
        style={{
          height: height - halfH,
          boxSizing: "border-box",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "4px 6px",
          gap: 4,
          flexWrap: "nowrap",
          minHeight: 0,
        }}
      >
        <div
          style={{
            fontSize: "min(6.5vw, 30px)",
            fontWeight: 800,
            fontVariantNumeric: "tabular-nums",
            color: "#ecfeff",
            textShadow: "0 0 10px rgba(34,211,238,0.85), 0 0 24px rgba(34,211,238,0.35)",
            letterSpacing: "0.03em",
            flexShrink: 0,
          }}
        >
          {timeLabel}
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "flex-end",
            justifyContent: "flex-end",
            gap: "4px 6px",
            flex: 1,
            minWidth: 0,
          }}
        >
          {indicatorWrap(<NeonCpuIcon state={cpuPressure} />, cpuLabel)}
          <button
            type="button"
            title={muted ? "Activar sonido" : "Silenciar"}
            onClick={() => setMuted((m) => !m)}
            style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
          >
            {indicatorWrap(<NeonSpeakerIcon muted={muted} />, muted ? "Silencio" : "Sonido")}
          </button>
          <div title={vibrateHint ? "navigator.vibrate disponible" : "Vibración del sistema no accesible en web"}>
            {indicatorWrap(<NeonVibrateIcon active={vibrateHint} />, vibrateHint ? "Vibra" : "—")}
          </div>
          {indicatorWrap(<NeonDiskIcon stroke="#22d3ee" />, diskLabel)}
          {indicatorWrap(<NeonFpsIcon stroke="#34d399" />, `${fps}`)}
          {indicatorWrap(<NeonBatteryIcon level={batteryLevel} />, batteryPct)}
          {indicatorWrap(<NeonWifiIcon online={online} quality={netQuality} />, online ? "Wi‑Fi" : "Off")}
        </div>
      </div>
    </div>
  );
});
