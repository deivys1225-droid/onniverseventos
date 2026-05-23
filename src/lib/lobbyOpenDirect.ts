/** Android: abre Lobby nativo; sin URL (la app conoce la pantalla). */
export function invokeOpenLobbyDirect(): boolean {
  if (window.AndroidBridge) {
    window.AndroidBridge.openLobbyDirect();
    return true;
  }
  return false;
}
