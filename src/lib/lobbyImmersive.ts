import { invokeOpenLobbyDirect, hasAndroidNativeBridge } from "@/lib/lobbyOpenDirect";

export const LOBBY_IMMERSIVE_PATH = "/lobby-inmersivo";
export const LOBBY_OPEN_TRANSITION_MS = 320;

/** APK: solo puente nativo. Nunca cambia URL del WebView. */
export function openLobbyImmersiveOnAndroid(): boolean {
  return invokeOpenLobbyDirect();
}

export function shouldUseWebLobbyRoute(): boolean {
  return !hasAndroidNativeBridge();
}
