/**
 * POST /api/azure/speech-stt
 * Body: audio WAV 16 kHz mono (binary).
 * Query: ?language=es-CO
 */
const MAX_BYTES = 5 * 1024 * 1024;

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function getAzureConfig() {
  const key = process.env.AZURE_SPEECH_KEY?.trim();
  const region = process.env.AZURE_SPEECH_REGION?.trim() || "brazilsouth";
  const language = process.env.AZURE_SPEECH_STT_LANGUAGE?.trim() || "es-CO";
  if (!key) {
    throw new Error("Falta AZURE_SPEECH_KEY en Vercel.");
  }
  return { key, region, language };
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
    const body = req.body ?? {};
    let audioBuffer;

    if (typeof body.audioBase64 === "string" && body.audioBase64.trim()) {
      audioBuffer = Buffer.from(body.audioBase64.trim(), "base64");
    } else if (Buffer.isBuffer(body)) {
      audioBuffer = body;
    } else if (body instanceof ArrayBuffer) {
      audioBuffer = Buffer.from(body);
    } else {
      return res.status(400).json({ ok: false, error: "Envía { audioBase64 } con audio WAV" });
    }

    if (!audioBuffer?.length) {
      return res.status(400).json({ ok: false, error: "Audio vacío" });
    }
    if (audioBuffer.length > MAX_BYTES) {
      return res.status(413).json({ ok: false, error: "Audio demasiado largo" });
    }

    const { key, region, language } = getAzureConfig();
    const lang =
      typeof req.query?.language === "string" && req.query.language.trim()
        ? req.query.language.trim()
        : language;

    const url = `https://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=${encodeURIComponent(lang)}&format=display`;

    const azureRes = await fetch(url, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": key,
        "Content-Type": "audio/wav; codecs=audio/pcm; samplerate=16000",
        Accept: "application/json;text/xml",
        "User-Agent": "OnniVers-STT",
      },
      body: audioBuffer,
    });

    const rawText = await azureRes.text();
    if (!azureRes.ok) {
      return res.status(502).json({
        ok: false,
        error: "Azure STT falló",
        status: azureRes.status,
        detail: rawText.slice(0, 200),
      });
    }

    let payload;
    try {
      payload = JSON.parse(rawText);
    } catch {
      return res.status(502).json({ ok: false, error: "Respuesta Azure inválida" });
    }

    const status = String(payload.RecognitionStatus ?? "").toLowerCase();
    const text = String(payload.DisplayText ?? payload.Text ?? "").trim();

    if (status && status !== "success") {
      return res.status(200).json({
        ok: true,
        text: "",
        status,
        message: status === "nomatch" ? "No se entendió el audio" : status,
      });
    }

    return res.status(200).json({ ok: true, text, status: status || "success" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error interno";
    return res.status(500).json({ ok: false, error: message });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "8mb",
    },
  },
};
