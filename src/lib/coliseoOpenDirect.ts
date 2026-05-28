/** Hay puente nativo Coliseo (APK). */
export function hasColiceoNativeBridge(): boolean {
  return (
    typeof window.Android?.openColiseoVR === "function" ||
    typeof window.Android?.openSelector === "function" ||
    typeof window.Android?.openColiceo === "function" ||
    typeof window.AndroidBridge?.openColiceo === "function"
  );
}

/** Abre {@link ColiceoActivity} en Android (mismo flujo que btn_coliceo en SelectorActivity). */
export function invokeOpenColiceoDirect(): boolean {
  if (typeof window.Android?.openColiseoVR === "function") {
    window.Android.openColiseoVR();
    return true;
  }
  if (typeof window.Android?.openSelector === "function") {
    window.Android.openSelector();
    return true;
  }
  if (typeof window.Android?.openColiceo === "function") {
    window.Android.openColiceo();
    return true;
  }
  if (typeof window.AndroidBridge?.openColiceo === "function") {
    window.AndroidBridge.openColiceo();
    return true;
  }
  return false;
}
