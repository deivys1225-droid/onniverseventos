/**
 * Normaliza el playback_id de Mux: solo ID en texto plano (nunca URL .m3u8 ni stream_key UUID).
 */

const MUX_PLAYBACK_ID_PLAIN = /^[A-Za-z0-9]{20,80}$/;

/** Extrae playback_id desde URL HLS de Mux. */
export function muxPlaybackIdFromHlsUrl(url: string | null | undefined): string | null {
  const value = (url ?? "").trim();
  if (!value) return null;
  const match = value.match(/stream\.mux\.com\/([A-Za-z0-9]+)(?:\.m3u8)?/i);
  return match?.[1]?.trim() ?? null;
}

/**
 * Devuelve un playback_id válido para <MuxPlayer playbackId={…} /> o null si no es usable.
 */
export function sanitizeMuxPlaybackId(raw: string | null | undefined): string | null {
  const value = (raw ?? "").trim();
  if (!value) return null;

  const fromMuxUrl = muxPlaybackIdFromHlsUrl(value);
  if (fromMuxUrl) return fromMuxUrl;

  if (value.startsWith("youtube:")) return null;
  if (/^https?:\/\//i.test(value) || /^rtmps?:\/\//i.test(value)) return null;
  if (value.includes(".m3u8")) return null;

  // stream_key de Mux suele ser UUID con guiones — no es playback_id
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    return null;
  }

  if (MUX_PLAYBACK_ID_PLAIN.test(value)) return value;

  return null;
}

/** Lee playback_ids[0].id de la respuesta JSON del backend Mux. */
export function extractPlaybackIdFromMuxApiPayload(data: Record<string, unknown>): string | null {
  const nested = data.playback_ids;
  if (Array.isArray(nested)) {
    for (const item of nested) {
      if (item && typeof item === "object" && "id" in item) {
        const sanitized = sanitizeMuxPlaybackId(String((item as { id?: unknown }).id ?? ""));
        if (sanitized) return sanitized;
      }
    }
  }

  return sanitizeMuxPlaybackId(String(data.playback_id ?? data.playbackId ?? ""));
}
