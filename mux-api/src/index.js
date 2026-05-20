/**
 * Servidor Node — Mux Video Live Streams + ingest WebSocket (navegador → RTMP).
 */
import { config as loadEnv } from "dotenv";
import http from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { WebSocketServer } from "ws";
import { liveStreamRouter } from "./routes/liveStream.js";
import { attachWsIngest } from "./wsIngest.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: join(__dirname, "..", ".env") });

const app = express();
const port = Number(process.env.PORT) || 8787;

app.use(express.json());

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
    wsIngest: "/api/mux/ws-ingest",
  });
});

app.use("/api/mux", liveStreamRouter);

app.use((_req, res) => {
  res.status(404).json({ ok: false, error: "Ruta no encontrada" });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });
attachWsIngest(wss);

server.on("upgrade", (req, socket, head) => {
  const path = req.url?.split("?")[0] ?? "";
  if (path === "/api/mux/ws-ingest") {
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
    return;
  }
  socket.destroy();
});

server.listen(port, () => {
  console.log(`Mux API → http://localhost:${port}`);
  console.log(`  POST http://localhost:${port}/api/mux/create-stream`);
  console.log(`  WS   ws://localhost:${port}/api/mux/ws-ingest?streamKey=…`);
});
