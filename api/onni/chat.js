/**
 * POST /api/onni/chat
 * Body: { message: string, contextPath?: string }
 * Orden: OpenAI (ChatGPT) → Gemini.
 * Secrets en Vercel: OPENAI_API_KEY, opcional GEMINI_API_KEY.
 */

import { runOnniChat } from "./chatCore.js";

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
    const result = await runOnniChat(req.body ?? {}, process.env);
    return res.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    const status = typeof error.statusCode === "number" ? error.statusCode : 502;
    return res.status(status).json({ ok: false, error: message });
  }
}
