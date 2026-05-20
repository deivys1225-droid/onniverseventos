import { muxPlaybackIdFromHlsUrl, sanitizeMuxPlaybackId } from "@/lib/muxPlaybackId";

export { muxPlaybackIdFromHlsUrl, sanitizeMuxPlaybackId };

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

export type ActiveStreamPlaybackSource = {
  stream_url?: string | null;
  playback_url?: string | null;
  playback_id?: string | null;
};

const MUX_HLS_BASE = "https://stream.mux.com";

/** Convierte playback_id de Mux a manifiesto HLS (.m3u8). */
export function muxPlaybackIdToHlsUrl(playbackId: string | null | undefined): string | null {
  const id = (playbackId ?? "").trim();
  if (!id || id.startsWith("youtube:")) return null;
  if (isStreamPlaybackUrl(id)) return id;
  return `${MUX_HLS_BASE}/${id}.m3u8`;
}

/** playback_id de Mux para el reproductor oficial (prioriza columna playback_id). */
export function resolvePlaybackIdFromActiveStreamRow(
  row: ActiveStreamPlaybackSource | null | undefined,
): string | null {
  if (!row) return null;

  return (
    sanitizeMuxPlaybackId(row.playback_id) ??
    sanitizeMuxPlaybackId(row.playback_url) ??
    sanitizeMuxPlaybackId(row.stream_url) ??
    null
  );
}

/** @deprecated Usar {@link muxPlaybackIdToHlsUrl} */
export const livepeerPlaybackIdToHlsUrl = muxPlaybackIdToHlsUrl;

/**
 * Lee la URL HTTP(S)/RTMP del &lt;video&gt; que está reproduciendo (Agora inyecta video en el contenedor;
 * VOD usa src directo). Ignora blob: y MediaStream sin URL pull.
 */
export function extractHttpPlaybackUrlFromDom(root?: ParentNode | null): string | null {
  const scope = root ?? (typeof document !== "undefined" ? document : null);
  if (!scope) return null;

  const videos = scope.querySelectorAll("video");
  for (const video of videos) {
    const current = (video.currentSrc || video.getAttribute("src") || video.src || "").trim();
    if (isStreamPlaybackUrl(current)) return current;

    const sourceEl = video.querySelector("source[src]");
    if (sourceEl) {
      const sourceSrc = (sourceEl.getAttribute("src") ?? "").trim();
      if (isStreamPlaybackUrl(sourceSrc)) return sourceSrc;
    }
  }
  return null;
}

/** Extrae URL reproducible desde fila active_streams (Supabase). */
export function resolvePlaybackFromActiveStreamRow(
  row: ActiveStreamPlaybackSource | null | undefined,
): string | null {
  if (!row) return null;

  const playback = (row.playback_url ?? "").trim();
  if (isStreamPlaybackUrl(playback)) return playback;

  const stream = (row.stream_url ?? "").trim();
  if (isStreamPlaybackUrl(stream)) return stream;

  return muxPlaybackIdToHlsUrl(row.playback_id);
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

/**
 * Resuelve la URL pull que el espectador está viendo o que corresponde al live activo:
 * DOM (video en reproducción) → query (?stream=, mp4) → active_streams → canal si es URL.
 */
export function resolveLiveTransmissionUrl(options: {
  streamParam?: string | null;
  mp4Param?: string | null;
  channelParam?: string | null;
  activeStream?: ActiveStreamPlaybackSource | null;
  domRoot?: ParentNode | null;
  includeMp4Fallback?: boolean;
}): string | null {
  const fromDom = extractHttpPlaybackUrlFromDom(options.domRoot ?? null);
  if (fromDom) return fromDom;

  const fromQuery = resolveCurrentTransmissionUrl({
    streamParam: options.streamParam,
    mp4Param: options.mp4Param,
    includeMp4Fallback: options.includeMp4Fallback,
  });
  if (fromQuery) return fromQuery;

  const fromActive = resolvePlaybackFromActiveStreamRow(options.activeStream);
  if (fromActive) return fromActive;

  const channel = (options.channelParam ?? "").trim();
  if (isStreamPlaybackUrl(channel)) return channel;

  return null;
}

export function audienceStreamSessionKey(channelName: string): string {
  return `onniverso-stream-${channelName.trim()}`;
}
