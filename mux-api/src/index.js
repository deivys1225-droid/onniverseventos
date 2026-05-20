/**
 * Servidor Node de evaluación — Mux Video Live Streams
 *
 * No modifica ni depende de Supabase. Sirve solo para probar Mux como alternativa a Livepeer.
 *
 * Uso:
 *   cd mux-api
 *   cp .env.example .env   # pegar MUX_TOKEN_ID y MUX_TOKEN_SECRET
 *   npm install
 *   npm run dev
 *
 *   curl -X POST http://localhost:8787/api/mux/create-stream \
 *     -H "Content-Type: application/json" \
 *     -d '{"title":"Transmision_Onniverso"}'
 */
import { config as loadEnv } from "dotenv";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { liveStreamRouter } from "./routes/liveStream.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: join(__dirname, "..", ".env") });

const app = express();
const port = Number(process.env.PORT) || 8787;

app.use(express.json());

/** CORS básico para que el frontend (Vite / producción) pueda llamar a este API en evaluación. */
app.use((_req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
});
app.options("*", (_req, res) => res.sendStatus(204));

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "mux-api",
    muxConfigured: Boolean(process.env.MUX_TOKEN_ID?.trim() && process.env.MUX_TOKEN_SECRET?.trim()),
  });
});

app.use("/api/mux", liveStreamRouter);

app.use((_req, res) => {
  res.status(404).json({ ok: false, error: "Ruta no encontrada" });
});

app.listen(port, () => {
  console.log(`Mux API (evaluación) → http://localhost:${port}`);
  console.log(`  POST http://localhost:${port}/api/mux/create-stream`);
});
