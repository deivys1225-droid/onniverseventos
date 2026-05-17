import { Capacitor } from "@capacitor/core";

export const LOBBY_IMMERSIVE_PATH = "/lobby-inmersivo";
export const LOBBY_OPEN_TRANSITION_MS = 320;

function tryAndroidLobbyBridge(): boolean {
  const bridge = window.Android;
  if (typeof bridge?.openLobby === "function") {
    bridge.openLobby();
    return true;
  }
  return false;
}

export function openLobbyImmersiveOnAndroid(): void {
  if (Capacitor.getPlatform() !== "android") return;
  if (tryAndroidLobbyBridge()) return;
  window.location.replace(LOBBY_IMMERSIVE_PATH);
}
