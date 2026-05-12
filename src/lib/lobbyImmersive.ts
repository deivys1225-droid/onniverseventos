import { Capacitor } from "@capacitor/core";

export const LOBBY_IMMERSIVE_ENTRY_URL = "/lobby-inmersivo/index.html";
export const LOBBY_NATIVE_DEEP_LINK = "onniver://open-lobby";
export const LOBBY_OPEN_TRANSITION_MS = 320;

function openWebLobby() {
  window.location.assign(LOBBY_IMMERSIVE_ENTRY_URL);
}

function tryAndroidLobbyBridge(): boolean {
  const bridge = window.Android;
  if (typeof bridge?.openLobby === "function") {
    bridge.openLobby();
    return true;
  }
  return false;
}

export function openLobbyImmersive() {
  if (Capacitor.getPlatform() === "android") {
    if (tryAndroidLobbyBridge()) return;
    window.location.assign(LOBBY_NATIVE_DEEP_LINK);
    return;
  }

  openWebLobby();
}

export function openLobbyImmersiveWithTransition() {
  window.setTimeout(openLobbyImmersive, LOBBY_OPEN_TRANSITION_MS);
}
