import { Capacitor } from "@capacitor/core";
import { invokeOpenLobbyDirect } from "@/lib/lobbyOpenDirect";

export const LOBBY_IMMERSIVE_PATH = "/lobby-inmersivo";
export const LOBBY_OPEN_TRANSITION_MS = 320;

export function openLobbyImmersiveOnAndroid(): void {
  if (Capacitor.getPlatform() !== "android") return;
  if (invokeOpenLobbyDirect()) return;
  window.location.replace(LOBBY_IMMERSIVE_PATH);
}
