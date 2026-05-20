/**
 * GET /api/mux/stream-status?liveStreamId=…&playbackId=…
 * Consulta estado del live en Mux (idle / active).
 */
import Mux from "@mux/mux-node";

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function getMuxClient() {
  const tokenId = process.env.MUX_TOKEN_ID?.trim();
  const tokenSecret = process.env.MUX_TOKEN_SECRET?.trim();
  if (!tokenId || !tokenSecret) {
    throw new Error("Faltan MUX_TOKEN_ID y MUX_TOKEN_SECRET.");
  }
  return new Mux({ tokenId, tokenSecret });
}

function normalizeMuxStatus(raw) {
  const status = String(raw ?? "idle").trim().toLowerCase();
  const active = status === "active";
  return { status, active };
}

async function resolveLiveStream(mux, { liveStreamId, playbackId }) {
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
      /* fallback below */
    }
  }

  return null;
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Método no permitido" });
  }

  const liveStreamId = String(req.query?.liveStreamId ?? req.query?.id ?? "").trim();
  const playbackId = String(req.query?.playbackId ?? req.query?.playback_id ?? "").trim();

  if (!liveStreamId && !playbackId) {
    return res.status(400).json({ ok: false, error: "Falta liveStreamId o playbackId" });
  }

  try {
    const mux = getMuxClient();
    const liveStream = await resolveLiveStream(mux, { liveStreamId, playbackId });

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
