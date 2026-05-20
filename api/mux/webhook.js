/**
 * POST /api/mux/webhook — eventos Mux (video.live_stream.active / idle).
 * Configura en Mux Dashboard → Settings → Webhooks → URL de este endpoint.
 * El panel del emisor usa polling; este webhook confirma señal en el servidor.
 */
import crypto from "node:crypto";

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, mux-signature");
}

function verifyMuxSignature(rawBody, signatureHeader, secret) {
  if (!secret || !signatureHeader) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const provided = signatureHeader.replace(/^v1=/, "").trim();
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Método no permitido" });
  }

  const secret = process.env.MUX_WEBHOOK_SIGNING_SECRET?.trim();
  const rawBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body ?? {});
  const signature = req.headers["mux-signature"];

  if (secret && !verifyMuxSignature(rawBody, signature, secret)) {
    return res.status(401).json({ ok: false, error: "Firma Mux inválida" });
  }

  let payload;
  try {
    payload = typeof req.body === "object" && req.body !== null ? req.body : JSON.parse(rawBody);
  } catch {
    return res.status(400).json({ ok: false, error: "JSON inválido" });
  }

  const eventType = String(payload?.type ?? "");
  const liveStreamId = String(payload?.data?.id ?? payload?.object?.id ?? "").trim();
  const isActive = eventType === "video.live_stream.active";
  const isIdle = eventType === "video.live_stream.idle";

  console.log("[mux/webhook]", { eventType, liveStreamId, isActive, isIdle });

  return res.status(200).json({
    ok: true,
    received: eventType,
    live_stream_id: liveStreamId || null,
    active: isActive,
    idle: isIdle,
  });
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "1mb",
    },
  },
};
