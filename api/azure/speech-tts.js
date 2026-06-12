/**
 * POST /api/azure/speech-tts
 * Proxy TTS — clave Azure solo en servidor (Vercel env).
 * Body: { "text": "..." }
 */
const DEFAULT_VOICE = "es-CO-SalomeNeural";
const MAX_CHARS = 2800;

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function escapeXml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function getAzureConfig() {
  const key = process.env.AZURE_SPEECH_KEY?.trim();
  const region = process.env.AZURE_SPEECH_REGION?.trim() || "brazilsouth";
  const voice = process.env.AZURE_SPEECH_VOICE?.trim() || DEFAULT_VOICE;
  if (!key) {
    throw new Error("Falta AZURE_SPEECH_KEY en Vercel.");
  }
  return { key, region, voice };
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
    const raw =
      typeof req.body?.text === "string"
        ? req.body.text
        : typeof req.body === "string"
          ? req.body
          : "";
    const text = raw.replace(/\s+/g, " ").trim().slice(0, MAX_CHARS);
    if (!text) {
      return res.status(400).json({ ok: false, error: "Texto vacío" });
    }

    const { key, region, voice } = getAzureConfig();
    const ssml = `<speak version="1.0" xml:lang="es-CO"><voice name="${voice}">${escapeXml(text)}</voice></speak>`;
    const endpoint = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;

    const azureRes = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": key,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "audio-24khz-96kbitrate-mono-mp3",
        "User-Agent": "OnniVers-TTS",
      },
      body: ssml,
    });

    if (!azureRes.ok) {
      const detail = await azureRes.text().catch(() => "");
      return res.status(502).json({
        ok: false,
        error: "Azure TTS falló",
        status: azureRes.status,
        detail: detail.slice(0, 200),
      });
    }

    const audio = Buffer.from(await azureRes.arrayBuffer());
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).send(audio);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error interno";
    return res.status(500).json({ ok: false, error: message });
  }
}
