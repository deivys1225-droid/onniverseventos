import { memo } from "react";

const LOBBY_SCREEN4_URL = "https://www.facebook.com/profile.php?id=61588834621279";

/** Pantalla 4: iframe web (sin WebView nativo hasta alinear bien el slot). */
export const LobbyScreenFourWebViewSlot = memo(function LobbyScreenFourWebViewSlot({
  width,
  height,
}: {
  width: number;
  height: number;
}) {
  return (
    <iframe
      src={LOBBY_SCREEN4_URL}
      width={width}
      height={height}
      title="Facebook — OnniVers"
      allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowFullScreen
      style={{
        border: 0,
        display: "block",
        width: `${width}px`,
        height: `${height}px`,
        background: "#02030a",
      }}
    />
  );
});
