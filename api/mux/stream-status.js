/**
 * GET /api/mux/stream-status?liveStreamId=…
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

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Método no permitido" });
  }

  const liveStreamId = String(req.query?.liveStreamId ?? req.query?.id ?? "").trim();
  if (!liveStreamId) {
    return res.status(400).json({ ok: false, error: "Falta liveStreamId" });
  }

  try {
    const mux = getMuxClient();
    const liveStream = await mux.video.liveStreams.retrieve(liveStreamId);
    const status = String(liveStream.status ?? "idle");
    const active = status === "active";

    return res.status(200).json({
      ok: true,
      live_stream_id: liveStreamId,
      status,
      active,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al consultar Mux.";
    return res.status(500).json({ ok: false, error: message });
  }
}
