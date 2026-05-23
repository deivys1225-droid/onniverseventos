import { Capacitor } from "@capacitor/core";
import { invokeOpenLobbyDirect } from "@/lib/lobbyOpenDirect";

export const LOBBY_IMMERSIVE_PATH = "/lobby-inmersivo";
export const LOBBY_OPEN_TRANSITION_MS = 320;

/** Solo puente nativo en APK; no cambia URL del WebView. */
export function openLobbyImmersiveOnAndroid(): boolean {
  if (Capacitor.getPlatform() !== "android") return false;
  return invokeOpenLobbyDirect();
}
