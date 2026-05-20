/**
 * Vercel serverless — crea live stream en Mux (misma respuesta que mux-api).
 * Variables en Vercel: MUX_TOKEN_ID, MUX_TOKEN_SECRET
 */
import Mux from "@mux/mux-node";

const MUX_RTMP_INGEST_BASE = "rtmps://global-live.mux.com:443/app";

/** playback_ids[0].id al crear el live stream (API Mux). */
function extractPlaybackIdFromLiveStream(liveStream) {
  const fromArray = liveStream?.playback_ids?.[0]?.id;
  if (fromArray) return String(fromArray).trim();
  if (liveStream?.playback_id) return String(liveStream.playback_id).trim();
  return "";
}

function muxPlaybackHlsUrl(playbackId) {
  const id = String(playbackId ?? "").trim();
  return id ? `https://stream.mux.com/${id}.m3u8` : null;
}

function getMuxClient() {
  const tokenId = process.env.MUX_TOKEN_ID?.trim();
  const tokenSecret = process.env.MUX_TOKEN_SECRET?.trim();
  if (!tokenId || !tokenSecret) {
    throw new Error("Faltan MUX_TOKEN_ID y MUX_TOKEN_SECRET en el proyecto de Vercel.");
  }
  return new Mux({ tokenId, tokenSecret });
}

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Método no permitido" });
  }

  try {
    const mux = getMuxClient();
    const title =
      typeof req.body?.title === "string" && req.body.title.trim()
        ? req.body.title.trim().slice(0, 255)
        : undefined;

    const liveStream = await mux.video.liveStreams.create({
      playback_policy: ["public"],
      latency_mode: "standard",
      new_asset_settings: { playback_policy: ["public"] },
      ...(title ? { passthrough: title } : {}),
    });

    const stream_key = String(liveStream.stream_key ?? "").trim();
    const playback_id = extractPlaybackIdFromLiveStream(liveStream);
    const playback_url = muxPlaybackHlsUrl(playback_id);

    if (!stream_key || !playback_id || !playback_url) {
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
      streamKey: stream_key,
      playbackId: playback_id,
      playbackUrl: playback_url,
      rtmp_ingest_url: MUX_RTMP_INGEST_BASE,
      rtmp_push_url: `${MUX_RTMP_INGEST_BASE}/${stream_key}`,
      rtmp_url: `${MUX_RTMP_INGEST_BASE}/${stream_key}`,
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
