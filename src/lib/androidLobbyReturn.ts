/**
 * Salida del lobby inmersivo en Android: {@code window.Android.onVrClick()} o
 * {@code window.Android.openSelector()} (sin argumentos).
 */
export function invokeAndroidLobbyReturn(): boolean {
  if (typeof window.Android === "undefined") return false;

  if (typeof window.Android.onVrClick === "function") {
    window.Android.onVrClick();
    return true;
  }
  if (typeof window.Android.openSelector === "function") {
    window.Android.openSelector();
    return true;
  }
  return false;
}
