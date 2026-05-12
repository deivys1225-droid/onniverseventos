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
