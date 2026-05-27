import { memo, useRef } from "react";
import { isLobbyNativeAndroid, useLobbyNativeOverlay } from "@/lib/lobbyNativeWebViewBridge";

const LOBBY_SCREEN4_SLOT_ID = "lobby-screen-4";
const LOBBY_SCREEN4_SLOT_LEGACY_ID = "onni-native-webview-lobby-screen-4";
const LOBBY_SCREEN4_URL = "https://www.facebook.com/profile.php?id=61588834621279";

export const LobbyScreenFourWebViewSlot = memo(function LobbyScreenFourWebViewSlot({
  width,
  height,
}: {
  width: number;
  height: number;
}) {
  const slotRef = useRef<HTMLDivElement | null>(null);
  const isNativeAndroidSlot = isLobbyNativeAndroid();

  useLobbyNativeOverlay({
    active: isNativeAndroidSlot,
    slotId: LOBBY_SCREEN4_SLOT_ID,
    legacyId: LOBBY_SCREEN4_SLOT_LEGACY_ID,
    setRectGlobal: (getter) => {
      window.__onniversoGetLobbyScreen4Rect = getter;
    },
    url: LOBBY_SCREEN4_URL,
    setUrl: (u) => window.Android?.setLobbyScreen4Url?.(u),
    onShow: () => {
      window.Android?.showLobbyScreen4?.();
    },
    onHide: () => {
      window.Android?.hideLobbyScreen4?.();
    },
    onUpdateBounds: () => {
      window.Android?.updateLobby4Bounds?.();
    },
  });

  if (!isNativeAndroidSlot) {
    return (
      <iframe
        src={LOBBY_SCREEN4_URL}
        width={width}
        height={height}
        title="Facebook — OnniVers"
        style={{ border: 0, display: "block", background: "#02030a" }}
      />
    );
  }

  return (
    <div
      ref={slotRef}
      id={LOBBY_SCREEN4_SLOT_ID}
      data-native-webview-slot={LOBBY_SCREEN4_SLOT_ID}
      data-lobby-native-url={LOBBY_SCREEN4_URL}
      style={{
        width,
        height,
        background: "#02030a",
        borderRadius: 10,
        border: "1px solid rgba(34,211,238,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#7dd3fc",
        fontFamily: "system-ui, sans-serif",
        fontSize: 11,
        textAlign: "center",
        padding: 10,
        boxSizing: "border-box",
        userSelect: "none",
        contain: "strict",
      }}
    >
      WebView nativo (Facebook)
    </div>
  );
});
