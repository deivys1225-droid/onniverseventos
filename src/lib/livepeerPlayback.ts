/** URL HLS pública Livepeer (playback) — formato recomendado por Livepeer para espectadores. */
export function livepeerPublicHlsUrl(playbackId: string): string {
  const id = playbackId.trim();
  return `https://livepeercdn.com/hls/${encodeURIComponent(id)}/index.m3u8`;
}

export type ResolvedPlayerMedia =
  | { kind: "hls"; url: string; lvprPlaybackId: string | null }
  | { kind: "progressive"; url: string };

/**
 * `playbackId` de Livepeer (no URL), URL HLS (.m3u8), o URL MP4 / vídeo progresivo.
 */
export function resolveLivepeerPlayerMedia(raw: string): ResolvedPlayerMedia | null {
  const t = raw.trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) {
    const lower = t.toLowerCase();
    if (lower.includes(".m3u8") || lower.includes("/hls/")) {
      return { kind: "hls", url: t, lvprPlaybackId: null };
    }
    return { kind: "progressive", url: t };
  }
  return { kind: "hls", url: livepeerPublicHlsUrl(t), lvprPlaybackId: t };
}
