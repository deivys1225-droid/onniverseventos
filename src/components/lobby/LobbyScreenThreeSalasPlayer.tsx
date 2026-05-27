import { memo, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { getLobbySalaVideoPlaylist } from "@/lib/lobbySalaVideoPlaylist";
import {
  ANDROID_VIDEO_CALLBACK,
  buildVideoItemsFromAndroid,
  buildVideoItemsFromFileList,
  collectVideoFiles,
  displayNameFromItem,
  hasAndroidMusicBridge,
  loadStoredVideoDirectoryHandle,
  resolveLocalVideoUrl,
  saveVideoDirectoryHandle,
  type LocalVideoItem,
  verifyDirReadPermission,
} from "@/lib/lobbyLocalVideoPicker";

declare global {
  interface Window {
    __onniversoGetNativeWebViewSlotRect?: (slotId?: string) => { x: number; y: number; w: number; h: number } | null;
    __onniversoGetLobbyScreen2Rect?: () => { x: number; y: number; w: number; h: number } | null;
  }
}

const LOBBY_NATIVE_WEBVIEW_SLOT_ID = "lobby-screen-2";
const LOBBY_NATIVE_WEBVIEW_SLOT_LEGACY_ID = "onni-native-webview-lobby-screen-2";

const lobbyBtnStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  padding: "8px 4px",
  fontSize: "13px",
  fontWeight: 800,
  letterSpacing: "0.04em",
  borderRadius: "12px",
  border: "2px solid rgba(34,211,238,0.6)",
  background: "rgba(2,8,18,0.95)",
  color: "#e0fbff",
  cursor: "pointer",
  boxShadow: "0 0 16px rgba(34,211,238,0.4), inset 0 0 16px rgba(34,211,238,0.06)",
  textTransform: "uppercase",
  touchAction: "manipulation",
  WebkitTapHighlightColor: "rgba(34,211,238,0.5)",
  WebkitUserSelect: "none",
  userSelect: "none",
};

const openBtnStyle: CSSProperties = {
  ...lobbyBtnStyle,
  flex: "1 1 100%",
  borderColor: "rgba(167,139,250,0.65)",
  color: "#ede9fe",
};

function defaultPlaylistItems(): LocalVideoItem[] {
  return getLobbySalaVideoPlaylist().map((item) => ({
    kind: "url",
    id: item.id,
    name: item.name,
    url: item.url,
  }));
}

function isNativeAndroidLobby(): boolean {
  return (
    typeof window !== "undefined" &&
    (typeof window.Android !== "undefined" || typeof window.AndroidBridge !== "undefined")
  );
}

export const LobbyScreenThreeSalasPlayer = memo(function LobbyScreenThreeSalasPlayer({
  width,
  height,
}: {
  width: number;
  height: number;
}) {
  const nativeSlotRef = useRef<HTMLDivElement | null>(null);
  const isNativeAndroidSlot = isNativeAndroidLobby();

  // Android: WebView nativo encima del slot 3D (show + updateBounds como cuando funcionaba).
  useEffect(() => {
    if (!isNativeAndroidSlot) return;
    const sync = () => {
      if (!window.Android) return;
      window.Android.showLobbyPantalla2WebView?.();
      window.Android.updateLobbyBounds?.();
    };
    sync();
    window.requestAnimationFrame(sync);
    const retryIds = [120, 300, 600, 1200, 2400].map((ms) => window.setTimeout(sync, ms));
    const intervalId = window.setInterval(sync, 200);
    window.addEventListener("resize", sync);
    window.addEventListener("orientationchange", sync);
    return () => {
      retryIds.forEach((id) => window.clearTimeout(id));
      window.clearInterval(intervalId);
      window.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", sync);
      window.Android?.hideLobbyPantalla2WebView?.();
    };
  }, [isNativeAndroidSlot]);

  useEffect(() => {
    if (!isNativeAndroidSlot) return;
    const getRect = () => {
      const el =
        document.getElementById(LOBBY_NATIVE_WEBVIEW_SLOT_ID) ??
        document.getElementById(LOBBY_NATIVE_WEBVIEW_SLOT_LEGACY_ID) ??
        nativeSlotRef.current;
      if (!el) return null;
      const r = el.getBoundingClientRect();
      if (r.width < 8 || r.height < 8) return null;
      return {
        x: Math.round(r.left),
        y: Math.round(r.top),
        w: Math.round(r.width),
        h: Math.round(r.height),
      };
    };
    window.__onniversoGetLobbyScreen2Rect = getRect;
    window.__onniversoGetNativeWebViewSlotRect = (slotId?: string) => {
      if (
        slotId &&
        slotId !== LOBBY_NATIVE_WEBVIEW_SLOT_ID &&
        slotId !== LOBBY_NATIVE_WEBVIEW_SLOT_LEGACY_ID
      ) {
        return null;
      }
      return getRect();
    };
    return () => {
      nativeSlotRef.current = null;
    };
  }, [isNativeAndroidSlot]);

  if (isNativeAndroidSlot) {
    return (
      <div
        ref={nativeSlotRef}
        id={LOBBY_NATIVE_WEBVIEW_SLOT_ID}
        data-native-webview-slot={LOBBY_NATIVE_WEBVIEW_SLOT_ID}
        style={{
          width,
          height,
          background: "transparent",
          borderRadius: 10,
          border: "1px solid rgba(34,211,238,0.2)",
          boxSizing: "border-box",
          userSelect: "none",
          pointerEvents: "none",
        }}
        aria-hidden
      />
    );
  }

  const [playlist, setPlaylist] = useState<LocalVideoItem[]>(() => defaultPlaylistItems());
  const [index, setIndex] = useState(0);
  const [status, setStatus] = useState("");
  const [sourceLabel, setSourceLabel] = useState("Salas en línea");
  const videoRef = useRef<HTMLVideoElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  const current = playlist.length > 0 ? playlist[index % playlist.length] : null;

  const revokeObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const loadItemAt = useCallback(
    async (nextIndex: number, autoplay: boolean) => {
      if (!playlist.length) return;
      const item = playlist[nextIndex % playlist.length];
      const video = videoRef.current;
      if (!video) return;

      revokeObjectUrl();
      try {
        const url = await resolveLocalVideoUrl(item);
        if (item.kind !== "url") objectUrlRef.current = url;
        video.src = url;
        video.load();
        if (autoplay) {
          try {
            await video.play();
          } catch {
            /* autoplay bloqueado hasta interacción */
          }
        }
      } catch {
        setStatus("No se pudo cargar el video.");
      }
    },
    [playlist, revokeObjectUrl],
  );

  useEffect(() => {
    folderInputRef.current?.setAttribute("webkitdirectory", "");
    folderInputRef.current?.setAttribute("directory", "");
  }, []);

  useEffect(() => {
    if (!playlist.length) return;
    void loadItemAt(0, false);
  }, [playlist, loadItemAt]);

  useEffect(() => () => revokeObjectUrl(), [revokeObjectUrl]);

  const applyLocalPlaylist = useCallback(
    (items: LocalVideoItem[], label: string) => {
      if (!items.length) {
        setStatus("Sin videos en la carpeta elegida.");
        return false;
      }
      setPlaylist(items);
      setIndex(0);
      setSourceLabel(label);
      setStatus(`${items.length} video(s) listos`);
      return true;
    },
    [],
  );

  const pickFolderViaAndroidBridge = useCallback(() => {
    const bridge = window.AndroidMusic;
    if (!bridge) return false;
    setStatus("Abriendo almacenamiento…");
    window[ANDROID_VIDEO_CALLBACK] = (items, error) => {
      window[ANDROID_VIDEO_CALLBACK] = undefined;
      if (error === "cancelled") {
        setStatus("");
        return;
      }
      if (error || !items?.length) {
        setStatus("Sin videos en la carpeta elegida.");
        return;
      }
      const videoItems = buildVideoItemsFromAndroid(items);
      applyLocalPlaylist(videoItems, "Almacenamiento");
    };
    try {
      bridge.pickMusicFolder(ANDROID_VIDEO_CALLBACK);
      return true;
    } catch {
      window[ANDROID_VIDEO_CALLBACK] = undefined;
      setStatus("No se pudo abrir el selector.");
      return false;
    }
  }, [applyLocalPlaylist]);

  const bootstrapFromDirectory = useCallback(
    async (dir: FileSystemDirectoryHandle) => {
      const ok = await verifyDirReadPermission(dir);
      if (!ok) return false;
      const list = await collectVideoFiles(dir);
      if (!list.length) return false;
      await saveVideoDirectoryHandle(dir);
      applyLocalPlaylist(list, "Carpeta local");
      return true;
    },
    [applyLocalPlaylist],
  );

  const onOpenStorage = useCallback(async () => {
    setStatus("Buscando videos…");
    if (hasAndroidMusicBridge()) {
      pickFolderViaAndroidBridge();
      return;
    }
    if (typeof window.showDirectoryPicker === "function") {
      try {
        const dir = await window.showDirectoryPicker();
        const ok = await bootstrapFromDirectory(dir);
        if (!ok) setStatus("Sin videos MP4/WebM en la carpeta.");
      } catch {
        setStatus("");
      }
      return;
    }
    const dir = await loadStoredVideoDirectoryHandle();
    if (dir) {
      const canRead = await verifyDirReadPermission(dir);
      const list = canRead ? await collectVideoFiles(dir) : [];
      if (list.length > 0) {
        await bootstrapFromDirectory(dir);
        return;
      }
    }
    folderInputRef.current?.click();
  }, [bootstrapFromDirectory, pickFolderViaAndroidBridge]);

  const onFolderInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const items = buildVideoItemsFromFileList(e.target.files);
      e.target.value = "";
      if (applyLocalPlaylist(items, "Archivos del dispositivo")) {
        setStatus(`${items.length} video(s) listos`);
      }
    },
    [applyLocalPlaylist],
  );

  const onPlay = useCallback(() => {
    void videoRef.current?.play();
  }, []);

  const onPause = useCallback(() => {
    videoRef.current?.pause();
  }, []);

  const onNext = useCallback(() => {
    if (!playlist.length) return;
    const next = (index + 1) % playlist.length;
    setIndex(next);
    void loadItemAt(next, true);
  }, [index, playlist.length, loadItemAt]);

  const currentLabel = useMemo(() => {
    if (!current) return "Sin videos";
    return displayNameFromItem(current);
  }, [current]);

  const controlsH = 118;

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
      <input
        ref={folderInputRef}
        type="file"
        multiple
        accept="video/*,.mp4,.webm,.mov,.m4v,.mkv"
        style={{ display: "none" }}
        onChange={onFolderInputChange}
      />
      <video
        ref={videoRef}
        playsInline
        controls
        preload="metadata"
        crossOrigin={current?.kind === "url" ? "anonymous" : undefined}
        onEnded={() => void onNext()}
        style={{
          width: "100%",
          height: height - controlsH,
          objectFit: "contain",
          background: "#000",
          borderRadius: "8px 8px 0 0",
          border: "1px solid rgba(34,211,238,0.35)",
          display: "block",
        }}
      />
      <div
        style={{
          height: controlsH,
          boxSizing: "border-box",
          padding: "6px 8px",
          display: "flex",
          flexDirection: "column",
          gap: 6,
          borderTop: "1px solid rgba(34,211,238,0.35)",
        }}
      >
        <div
          style={{
            fontSize: "10px",
            color: "#7dd3fc",
            textAlign: "center",
            lineHeight: 1.2,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            textShadow: "0 0 6px rgba(34,211,238,0.45)",
          }}
        >
          {playlist.length > 0
            ? `${index + 1}/${playlist.length} · ${sourceLabel} · ${currentLabel}`
            : "Sin videos"}
        </div>
        {status ? (
          <div style={{ fontSize: "9px", color: "#a5f3fc", textAlign: "center", lineHeight: 1.2 }}>{status}</div>
        ) : null}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button type="button" style={lobbyBtnStyle} onClick={() => void onPlay()}>
            Play
          </button>
          <button type="button" style={lobbyBtnStyle} onClick={onPause}>
            Pausa
          </button>
          <button type="button" style={lobbyBtnStyle} onClick={() => void onNext()}>
            Siguiente
          </button>
          <button type="button" style={openBtnStyle} onClick={() => void onOpenStorage()}>
            Abrir almacenamiento
          </button>
        </div>
      </div>
    </div>
  );
});
