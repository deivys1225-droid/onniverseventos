/**
 * Cliente Mux Video (singleton).
 * Credenciales: https://dashboard.mux.com/settings/access-tokens
 */
import Mux from "@mux/mux-node";

let muxInstance = null;

export function getMuxClient() {
  const tokenId = process.env.MUX_TOKEN_ID?.trim();
  const tokenSecret = process.env.MUX_TOKEN_SECRET?.trim();

  if (!tokenId || !tokenSecret) {
    throw new Error(
      "Faltan MUX_TOKEN_ID y MUX_TOKEN_SECRET en mux-api/.env (copia desde .env.example).",
    );
  }

  if (!muxInstance) {
    muxInstance = new Mux({ tokenId, tokenSecret });
  }

  return muxInstance;
}

/** URL HLS pública estándar de Mux para un playback_id. */
export function muxPlaybackHlsUrl(playbackId) {
  const id = String(playbackId ?? "").trim();
  if (!id) return null;
  return `https://stream.mux.com/${id}.m3u8`;
}

/** RTMP(S) de ingest global de Mux. */
export const MUX_RTMP_INGEST_BASE = "rtmps://global-live.mux.com:443/app";
