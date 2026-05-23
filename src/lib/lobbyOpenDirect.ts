/** Hay puente nativo inyectado por MainActivity (APK). */
export function hasAndroidNativeBridge(): boolean {
  return typeof window.AndroidBridge !== "undefined" || typeof window.Android !== "undefined";
}

/**
 * Abre lobby nativo. Orden: AndroidBridge.openLobbyDirect → Android.openLobbyDirect → Android.openLobby.
 * Sin URL, sin navegación web.
 */
export function invokeOpenLobbyDirect(): boolean {
  if (window.AndroidBridge && window.AndroidBridge.openLobbyDirect) {
    window.AndroidBridge.openLobbyDirect();
    return true;
  }
  if (window.Android && window.Android.openLobbyDirect) {
    window.Android.openLobbyDirect();
    return true;
  }
  if (window.Android && window.Android.openLobby) {
    window.Android.openLobby();
    return true;
  }
  return false;
}
