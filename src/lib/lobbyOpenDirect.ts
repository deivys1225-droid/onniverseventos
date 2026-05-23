/** Android: abre Lobby nativo; sin URL. Prueba AndroidBridge y Android. */
export function invokeOpenLobbyDirect(): boolean {
  if (window.AndroidBridge && window.AndroidBridge.openLobbyDirect) {
    window.AndroidBridge.openLobbyDirect();
    return true;
  }
  if (window.Android && window.Android.openLobbyDirect) {
    window.Android.openLobbyDirect();
    return true;
  }
  return false;
}
