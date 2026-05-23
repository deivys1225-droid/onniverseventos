/** Android: abre la actividad nativa del reproductor galería; sin URL. */
export function invokeOpenGalleryDirect(): boolean {
  if (typeof window.AndroidBridge?.openGalleryDirect === "function") {
    window.AndroidBridge.openGalleryDirect();
    return true;
  }
  return false;
}
