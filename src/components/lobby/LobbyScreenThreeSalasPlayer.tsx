import { memo, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { getLobbySalaVideoPlaylist } from "@/lib/lobbySalaVideoPlaylist";

const lobbyBtnStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  padding: "10px 6px",
  fontSize: "16px",
  fontWeight: 800,
  letterSpacing: "0.05em",
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

export const LobbyScreenThreeSalasPlayer = memo(function LobbyScreenThreeSalasPlayer({
  width,
  height,
}: {
  width: number;
  height: number;
}) {
  const playlist = useMemo(() => getLobbySalaVideoPlaylist(), []);
  const [index, setIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const current = playlist.length > 0 ? playlist[index % playlist.length] : null;

  const playAt = useCallback(
    async (nextIndex: number) => {
      if (!playlist.length) return;
      const item = playlist[nextIndex % playlist.length];
      const video = videoRef.current;
      if (!video) return;
      video.src = item.url;
      video.load();
      try {
        await video.play();
      } catch {
        /* autoplay bloqueado hasta interacción */
      }
    },
    [playlist],
  );

  useEffect(() => {
    if (!playlist.length) return;
    void playAt(0);
  }, [playlist, playAt]);

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
    void playAt(next);
  }, [index, playlist.length, playAt]);

  const controlsH = 88;

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
      <video
        ref={videoRef}
        key={current?.id}
        playsInline
        controls
        preload="metadata"
        crossOrigin="anonymous"
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
            fontSize: "11px",
            color: "#7dd3fc",
            textAlign: "center",
            lineHeight: 1.2,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            textShadow: "0 0 6px rgba(34,211,238,0.45)",
          }}
        >
          {current ? `${index + 1}/${playlist.length} · ${current.name}` : "Sin videos de salas"}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" style={lobbyBtnStyle} onClick={() => void onPlay()}>
            Play
          </button>
          <button type="button" style={lobbyBtnStyle} onClick={onPause}>
            Pausa
          </button>
          <button type="button" style={lobbyBtnStyle} onClick={() => void onNext()}>
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
});
