import { Capacitor } from "@capacitor/core";
import { invokeOpenLobbyDirect } from "@/lib/lobbyOpenDirect";

export const LOBBY_IMMERSIVE_PATH = "/lobby-inmersivo";
export const LOBBY_OPEN_TRANSITION_MS = 320;

function tryLegacyAndroidLobbyBridge(): boolean {
  const bridge = window.Android;
  if (typeof bridge?.openLobby === "function") {
    bridge.openLobby();
    return true;
  }
  return false;
}

export function openLobbyImmersiveOnAndroid(): void {
  if (Capacitor.getPlatform() !== "android") return;
  if (invokeOpenLobbyDirect()) return;
  if (tryLegacyAndroidLobbyBridge()) return;
  window.location.replace(LOBBY_IMMERSIVE_PATH);
}
