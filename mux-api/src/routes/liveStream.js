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

function normalizeMuxStatus(raw) {
  const status = String(raw ?? "idle").trim().toLowerCase();
  return { status, active: status === "active" };
}

async function resolveLiveStreamByQuery(mux, { liveStreamId, playbackId }) {
  const id = String(liveStreamId ?? "").trim();
  const pb = String(playbackId ?? "").trim();

  if (id) {
    return mux.video.liveStreams.retrieve(id);
  }

  if (pb) {
    try {
      const playback = await mux.video.playbackIds.retrieve(pb);
      const objectType = playback?.object?.type;
      const objectId = playback?.object?.id;
      if (objectType === "live_stream" && objectId) {
        return mux.video.liveStreams.retrieve(objectId);
      }
    } catch {
      /* sin playback → 404 abajo */
    }
  }

  return null;
}

/** GET /api/mux/stream-status?liveStreamId=…&playbackId=… */
async function handleStreamStatus(req, res) {
  const liveStreamId = String(req.query?.liveStreamId ?? req.query?.id ?? "").trim();
  const playbackId = String(req.query?.playbackId ?? req.query?.playback_id ?? "").trim();

  if (!liveStreamId && !playbackId) {
    return res.status(400).json({ ok: false, error: "Falta liveStreamId o playbackId" });
  }

  try {
    const mux = getMuxClient();
    const liveStream = await resolveLiveStreamByQuery(mux, { liveStreamId, playbackId });

    if (!liveStream) {
      return res.status(404).json({ ok: false, error: "Live stream no encontrado en Mux" });
    }

    const { status, active } = normalizeMuxStatus(liveStream.status);

    return res.status(200).json({
      ok: true,
      live_stream_id: liveStream.id ?? liveStreamId ?? null,
      playback_id: playbackId || null,
      status,
      active,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al consultar Mux.";
    return res.status(500).json({ ok: false, error: message });
  }
}

liveStreamRouter.get("/stream-status", handleStreamStatus);
liveStreamRouter.post("/create-stream", handleCreateStream);
/** @deprecated Usar /create-stream */
liveStreamRouter.post("/live-stream", handleCreateStream);
