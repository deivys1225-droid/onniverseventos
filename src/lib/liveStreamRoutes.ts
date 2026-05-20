/** Ruta de la escena LIVE STREAM (reproductor HLS Mux en web; puente HLS en Android). */
export const LIVE_STREAM_PATH = "/live-stream";

/** Canal (playback_id o user_id), título y opcional playbackId Mux en la URL. */
export function buildLiveStreamPath(options: {
  channel: string;
  title?: string;
  playbackId?: string;
}): string {
  const channel = options.channel.trim();
  const params = new URLSearchParams();
  const title = (options.title ?? "").trim();
  if (title) params.set("title", title);
  const playbackId = (options.playbackId ?? "").trim();
  if (playbackId) params.set("playbackId", playbackId);
  const query = params.toString();
  return `${LIVE_STREAM_PATH}/${encodeURIComponent(channel)}${query ? `?${query}` : ""}`;
}
