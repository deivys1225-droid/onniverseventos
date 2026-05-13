import { memo, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

const DB_NAME = "onniverso.lobby.screen1.audio";
const STORE = "handles";
const STORE_KEY = "musicDir";

const AUDIO_EXT = /\.(mp3|m4a|ogg|wav|aac|flac)$/i;

type PlaylistItem =
  | { kind: "file"; name: string; handle: FileSystemFileHandle }
  | { kind: "url"; name: string; url: string };

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

async function collectAudioFiles(root: FileSystemDirectoryHandle): Promise<PlaylistItem[]> {
  const out: PlaylistItem[] = [];

  async function walk(dir: FileSystemDirectoryHandle, prefix: string) {
    for await (const [name, entry] of dir.entries()) {
      const path = prefix ? `${prefix}/${name}` : name;
      if (entry.kind === "file" && AUDIO_EXT.test(name)) {
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

const bundledModules = import.meta.glob("../../assets/lobby-screen1/*.{mp3,ogg,wav,m4a}", {
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

function NeonBatteryIcon({ level }: { level: number | null }) {
  const pct = level == null ? null : Math.round(level * 100);
  const fillH = pct == null ? 18 : Math.max(4, Math.round((pct / 100) * 28));
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden style={{ filter: "drop-shadow(0 0 5px rgba(34,211,238,0.85))" }}>
      <rect x="4" y="10" width="28" height="20" rx="3" fill="none" stroke="#22d3ee" strokeWidth="2" />
      <rect x="32" y="15" width="3" height="10" rx="1" fill="#22d3ee" />
      <rect x="8" y={30 - fillH} width="20" height={fillH} rx="2" fill="#22d3ee" opacity="0.9" />
    </svg>
  );
}

function NeonWifiIcon({ online, quality }: { online: boolean; quality: string }) {
  const stroke = online ? "#22d3ee" : "#64748b";
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden style={{ filter: online ? "drop-shadow(0 0 5px rgba(34,211,238,0.8))" : "none" }}>
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

export const LobbyScreenOneHub = memo(function LobbyScreenOneHub({ width, height }: HubProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const [playlist, setPlaylist] = useState<PlaylistItem[]>([]);
  const [order, setOrder] = useState<number[]>([]);
  const [orderPos, setOrderPos] = useState(0);
  const [status, setStatus] = useState("");

  const [clock, setClock] = useState(() => new Date());
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [online, setOnline] = useState(() => (typeof navigator !== "undefined" ? navigator.onLine : true));
  const [netQuality, setNetQuality] = useState<string>("unknown");

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

  const playItem = useCallback(
    async (item: PlaylistItem) => {
      const el = audioRef.current;
      if (!el) return;
      revokeObjectUrl();
      if (item.kind === "url") {
        el.src = item.url;
      } else {
        const file = await item.handle.getFile();
        const url = URL.createObjectURL(file);
        objectUrlRef.current = url;
        el.src = url;
      }
      await el.play();
    },
    [revokeObjectUrl],
  );

  const bootstrapFromDirectory = useCallback(
    async (dir: FileSystemDirectoryHandle) => {
      const ok = await verifyDirReadPermission(dir);
      if (!ok) return false;
      const list = await collectAudioFiles(dir);
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
    const list = await collectAudioFiles(dir);
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

  useEffect(() => () => revokeObjectUrl(), [revokeObjectUrl]);

  const onPlay = useCallback(async () => {
    setStatus("");
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
    if (typeof window.showDirectoryPicker === "function") {
      try {
        const dir = await window.showDirectoryPicker();
        const ok = await bootstrapFromDirectory(dir);
        if (!ok) setStatus("Sin archivos de audio en la carpeta.");
      } catch {
        setStatus("");
      }
      return;
    }
    const dir = await loadStoredDirectoryHandle();
    if (dir) {
      const list = await collectAudioFiles(dir);
      const canRead = await verifyDirReadPermission(dir);
      if (canRead && list.length > 0) {
        await bootstrapFromDirectory(dir);
        return;
      }
    }
    setStatus("Añade archivos .mp3 en src/assets/lobby-screen1/ o abre en Chrome/Edge.");
  }, [playlist, order, orderPos, playItem, bootstrapFromDirectory]);

  const onPause = useCallback(() => {
    audioRef.current?.pause();
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

  const btnStyle: CSSProperties = {
    flex: 1,
    minWidth: 0,
    padding: "12px 8px",
    fontSize: "20px",
    fontWeight: 800,
    letterSpacing: "0.05em",
    borderRadius: "12px",
    border: "2px solid rgba(34,211,238,0.6)",
    background: "rgba(2,8,18,0.95)",
    color: "#e0fbff",
    cursor: "pointer",
    boxShadow: "0 0 16px rgba(34,211,238,0.4), inset 0 0 16px rgba(34,211,238,0.06)",
    textTransform: "uppercase",
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
      <div
        style={{
          height: halfH,
          boxSizing: "border-box",
          borderBottom: "1px solid rgba(34,211,238,0.35)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "8px 12px",
          gap: 8,
        }}
      >
        <div
          style={{
            fontSize: "12px",
            color: "#7dd3fc",
            textAlign: "center",
            lineHeight: 1.3,
            textShadow: "0 0 6px rgba(34,211,238,0.45)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {currentItem ? currentItem.name : "Play · primera pista o orden aleatorio"}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
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
          padding: "6px 12px",
          gap: 10,
        }}
      >
        <div
          style={{
            fontSize: "min(7.5vw, 38px)",
            fontWeight: 800,
            fontVariantNumeric: "tabular-nums",
            color: "#ecfeff",
            textShadow: "0 0 10px rgba(34,211,238,0.85), 0 0 24px rgba(34,211,238,0.35)",
            letterSpacing: "0.03em",
          }}
        >
          {timeLabel}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
            <NeonBatteryIcon level={batteryLevel} />
            <span style={{ fontSize: "11px", color: "#a5f3fc", fontWeight: 700 }}>{batteryPct}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
            <NeonWifiIcon online={online} quality={netQuality} />
            <span style={{ fontSize: "10px", color: online ? "#6ee7b7" : "#fca5a5", fontWeight: 700 }}>
              {online ? "En línea" : "Sin red"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});
