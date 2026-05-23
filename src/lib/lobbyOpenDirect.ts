/** Android: abre LobbyVrActivity nativa (doble ventana) sin pasar URL. */
export function invokeOpenLobbyDirect(): boolean {
  if (typeof window.AndroidBridge?.openLobbyDirect === "function") {
    window.AndroidBridge.openLobbyDirect();
    return true;
  }
  return false;
}
