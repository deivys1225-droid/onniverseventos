/**
 * Rutas Mux Live Stream
 *
 * POST /api/mux/create-stream  → principal (frontend)
 * POST /api/mux/live-stream    → alias (compatibilidad)
 *
 * Usa MUX_TOKEN_ID y MUX_TOKEN_SECRET desde mux-api/.env (ver getMuxClient).
 */
import { Router } from "express";
import { MUX_RTMP_INGEST_BASE, getMuxClient, muxPlaybackHlsUrl } from "../lib/muxClient.js";

export const liveStreamRouter = Router();

function extractPlaybackIdFromLiveStream(liveStream) {
  const fromArray = liveStream?.playback_ids?.[0]?.id;
  if (fromArray) return String(fromArray).trim();
  if (liveStream?.playback_id) return String(liveStream.playback_id).trim();
  return "";
}

/**
 * Crea un live stream en Mux y responde con stream_key + playback_id para el frontend.
 */
async function handleCreateStream(req, res) {
  try {
    const mux = getMuxClient();

    // https://www.mux.com/docs/api-reference/video/live-streams/create-live-stream
    const liveStream = await mux.video.liveStreams.create({
      playback_policy: ["public"],
      latency_mode: "standard",
      new_asset_settings: {
        playback_policy: ["public"],
      },
      ...(typeof req.body?.title === "string" && req.body.title.trim()
        ? { passthrough: req.body.title.trim().slice(0, 255) }
        : {}),
    });

    const stream_key = String(liveStream.stream_key ?? "").trim();
    const playback_id = extractPlaybackIdFromLiveStream(liveStream);
    const playback_url = muxPlaybackHlsUrl(playback_id);

    if (!stream_key || !playback_id) {
      return res.status(502).json({
        ok: false,
        error: "Mux no devolvió stream_key o playback_id.",
        raw: { id: liveStream.id, playback_ids: liveStream.playback_ids },
      });
    }

    return res.status(201).json({
      ok: true,
      live_stream_id: liveStream.id,
      stream_key,
      playback_id,
      playback_ids: liveStream.playback_ids,
      playback_url,
      // Alias camelCase por si el frontend ya los usa
      streamKey: stream_key,
      playbackId: playback_id,
      playbackUrl: playback_url,
      rtmp_ingest_url: MUX_RTMP_INGEST_BASE,
      rtmp_push_url: `${MUX_RTMP_INGEST_BASE}/${stream_key}`,
      status: liveStream.status,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al crear live stream en Mux.";
    const status = typeof error?.status === "number" ? error.status : 500;
    const muxMessages = error?.error?.error?.messages;
    const detail = Array.isArray(muxMessages) ? muxMessages.join(" ") : message;
    return res.status(status >= 400 && status < 600 ? status : 500).json({
      ok: false,
      error: detail,
    });
  }
}

liveStreamRouter.post("/create-stream", handleCreateStream);
/** @deprecated Usar /create-stream */
liveStreamRouter.post("/live-stream", handleCreateStream);
