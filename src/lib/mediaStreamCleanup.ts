import { clearAndStopLivePreviewStream, getLivePreviewStream } from "@/lib/livePreviewBus";

/** Detiene todos los tracks de un MediaStream (apaga cámara/mic en el SO). */
export function stopMediaStreamTracks(stream: MediaStream | null | undefined): void {
  stream?.getTracks().forEach((track) => {
    try {
      track.stop();
    } catch {
      /* track ya detenido */
    }
  });
}

/**
 * Libera captura local: preview global + videos dentro del contenedor del emisor.
 */
export function releaseLocalMediaCapture(root?: ParentNode | null): void {
  stopMediaStreamTracks(getLivePreviewStream());
  clearAndStopLivePreviewStream();

  const scope = root ?? (typeof document !== "undefined" ? document : null);
  if (!scope) return;

  scope.querySelectorAll("video").forEach((el) => {
    const src = el.srcObject;
    if (src instanceof MediaStream) {
      stopMediaStreamTracks(src);
    }
    el.srcObject = null;
  });
}
