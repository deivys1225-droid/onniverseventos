/**
 * Limpia el valor recibido (doble URL-decode, comillas, segmento /hls/{id}/).
 * Evita pasar basura a lvpr.tv ("Invalid source / could not fetch playback information").
 */
export function normalizePlaybackIdForLivepeer(raw: string): string {
  let s = raw.trim().replace(/^['"]|['"]$/g, "");
  if (!s) return "";
  for (let i = 0; i < 5; i++) {
    try {
      const next = decodeURIComponent(s);
      if (next === s) break;
      s = next.trim();
    } catch {
      break;
    }
  }
  const fromHls = extractPlaybackIdFromHlsUrl(s);
  if (fromHls) return fromHls;
  const m = s.match(/\/hls\/([^/?#]+)/i);
  if (m?.[1]) {
    let seg = m[1];
    for (let j = 0; j < 3; j++) {
      try {
        const next = decodeURIComponent(seg);
        if (next === seg) break;
        seg = next;
      } catch {
        break;
      }
    }
    return seg.trim();
  }
  return s.replace(/^\/+|\/+$/g, "").trim();
}

/**
 * Playback ID público Livepeer (no el UUID del stream). lvpr.tv falla con UUID u otros formatos.
 */
export function isLikelyLivepeerPlaybackId(id: string): boolean {
  const n = normalizePlaybackIdForLivepeer(id);
  if (n.length < 4 || n.length > 80) return false;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(n)) return false;
  return /^[a-z0-9_-]+$/i.test(n);
}

/** URL HLS pública Livepeer (playback) — CDN principal. */
export function livepeerPublicHlsUrl(playbackId: string): string {
  const id = normalizePlaybackIdForLivepeer(playbackId);
  if (!id) return "";
  return `https://livepeercdn.com/hls/${encodeURIComponent(id)}/index.m3u8`;
}

/** CDN alternativo (mismo manifest); útil si un borde de red bloquea uno de los hosts. */
export function livepeerStudioHlsUrl(playbackId: string): string {
  const id = normalizePlaybackIdForLivepeer(playbackId);
  if (!id) return "";
  return `https://livepeercdn.studio/hls/${encodeURIComponent(id)}/index.m3u8`;
}

/** URLs a probar en orden para un mismo playbackId. */
export function livepeerHlsUrlCandidates(playbackId: string): string[] {
  const a = livepeerPublicHlsUrl(playbackId);
  const b = livepeerStudioHlsUrl(playbackId);
  return [a, b].filter((u) => u.length > 0);
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
  const m = url.trim().match(/\/hls\/([^/?#]+)/i);
  if (!m?.[1]) return null;
  let seg = m[1];
  for (let i = 0; i < 4; i++) {
    try {
      const next = decodeURIComponent(seg);
      if (next === seg) break;
      seg = next;
    } catch {
      break;
    }
  }
  const t = seg.trim();
  return t || null;
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
      const lvpr =
        fromUrl && isLikelyLivepeerPlaybackId(fromUrl) ? normalizePlaybackIdForLivepeer(fromUrl) : null;
      return { kind: "hls", url: t, lvprPlaybackId: lvpr };
    }
    return { kind: "progressive", url: t };
  }
  const id = normalizePlaybackIdForLivepeer(t);
  if (!id) return null;
  const url = livepeerPublicHlsUrl(id);
  if (!url) return null;
  const lvpr = isLikelyLivepeerPlaybackId(id) ? id : null;
  return { kind: "hls", url, lvprPlaybackId: lvpr };
}
