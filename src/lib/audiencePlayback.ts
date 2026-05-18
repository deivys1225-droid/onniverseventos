/**
 * Distingue URLs de reproducción pull (HLS/MP4/RTMP) de identificadores Agora (canal, token).
 */
export function isStreamPlaybackUrl(value: string | null | undefined): boolean {
  const t = (value ?? "").trim();
  if (!t) return false;
  if (/^https?:\/\//i.test(t)) return true;
  if (/^rtmps?:\/\//i.test(t)) return true;
  return false;
}

/**
 * URL actual para puente nativo (Cine Live / Live Cam): prioriza ?stream= (HLS/RTMP),
 * luego MP4 de la sala si aplica (VOD o catálogo).
 */
export function resolveCurrentTransmissionUrl(options: {
  streamParam?: string | null;
  mp4Param?: string | null;
  includeMp4Fallback?: boolean;
}): string | null {
  const stream = (options.streamParam ?? "").trim();
  if (isStreamPlaybackUrl(stream)) return stream;

  if (options.includeMp4Fallback !== false) {
    const mp4 = (options.mp4Param ?? "").trim();
    if (isStreamPlaybackUrl(mp4)) return mp4;
  }

  return null;
}
