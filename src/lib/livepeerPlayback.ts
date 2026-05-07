/** URL HLS pública Livepeer (playback) — CDN principal. */
export function livepeerPublicHlsUrl(playbackId: string): string {
  const id = playbackId.trim();
  return `https://livepeercdn.com/hls/${encodeURIComponent(id)}/index.m3u8`;
}

/** CDN alternativo (mismo manifest); útil si un borde de red bloquea uno de los hosts. */
export function livepeerStudioHlsUrl(playbackId: string): string {
  const id = playbackId.trim();
  return `https://livepeercdn.studio/hls/${encodeURIComponent(id)}/index.m3u8`;
}

/** URLs a probar en orden para un mismo playbackId. */
export function livepeerHlsUrlCandidates(playbackId: string): string[] {
  const id = playbackId.trim();
  if (!id) return [];
  return [livepeerPublicHlsUrl(id), livepeerStudioHlsUrl(id)];
}

/** Si la URL ya es HLS Livepeer, devuelve el otro host (com ↔ studio). */
export function livepeerHlsAlternateCdnUrl(hlsUrl: string): string | null {
  const u = hlsUrl.trim();
  if (!u) return null;
  if (u.includes("livepeercdn.com")) {
    return u.replace(/livepeercdn\.com/gi, "livepeercdn.studio");
  }
  if (u.includes("livepeercdn.studio")) {
    return u.replace(/livepeercdn\.studio/gi, "livepeercdn.com");
  }
  return null;
}

/** Extrae playbackId de una URL .../hls/{id}/... */
export function extractPlaybackIdFromHlsUrl(url: string): string | null {
  const m = url.trim().match(/\/hls\/([^/]+)\//i);
  return m?.[1] ? decodeURIComponent(m[1]) : null;
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
      const fromUrl = extractPlaybackIdFromHlsUrl(t);
      return { kind: "hls", url: t, lvprPlaybackId: fromUrl };
    }
    return { kind: "progressive", url: t };
  }
  return { kind: "hls", url: livepeerPublicHlsUrl(t), lvprPlaybackId: t };
}
