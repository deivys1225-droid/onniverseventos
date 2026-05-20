/** Ruta de la escena LIVE STREAM (reproductor HLS Mux en web; puente HLS en Android). */
export const LIVE_STREAM_PATH = "/live-stream";

/** Solo canal y título en la URL; el token lo pide el reproductor al pulsar Ver transmisión. */
export function buildLiveStreamPath(options: { channel: string; title?: string }): string {
  const channel = options.channel.trim();
  const params = new URLSearchParams();
  const title = (options.title ?? "").trim();
  if (title) params.set("title", title);
  const query = params.toString();
  return `${LIVE_STREAM_PATH}/${encodeURIComponent(channel)}${query ? `?${query}` : ""}`;
}
