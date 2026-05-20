/**
 * WebSocket ingest: recibe chunks WebM del navegador y publica a Mux vía ffmpeg (RTMP).
 * Patrón recomendado por Mux para "go live from browser".
 */
import { spawn } from "node:child_process";
import { URL } from "node:url";
import ffmpegStatic from "ffmpeg-static";

const MUX_RTMP_BASE = "rtmps://global-live.mux.com:443/app";

function ffmpegArgs(streamKey) {
  return [
    "-hide_banner",
    "-loglevel",
    "error",
    "-fflags",
    "nobuffer",
    "-i",
    "pipe:0",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-tune",
    "zerolatency",
    "-pix_fmt",
    "yuv420p",
    "-g",
    "50",
    "-maxrate",
    "2500k",
    "-bufsize",
    "5000k",
    "-c:a",
    "aac",
    "-ar",
    "44100",
    "-b:a",
    "128k",
    "-f",
    "flv",
    `${MUX_RTMP_BASE}/${streamKey}`,
  ];
}

export function attachWsIngest(wss) {
  wss.on("connection", (ws, req) => {
    let streamKey = "";
    try {
      const url = new URL(req.url ?? "", "http://localhost");
      streamKey = (url.searchParams.get("streamKey") ?? url.searchParams.get("stream_key") ?? "").trim();
    } catch {
      ws.close(1008, "URL inválida");
      return;
    }

    if (!streamKey) {
      ws.close(1008, "Falta streamKey");
      return;
    }

    const ffmpegBin = typeof ffmpegStatic === "string" ? ffmpegStatic : "ffmpeg";
    const ffmpeg = spawn(ffmpegBin, ffmpegArgs(streamKey), {
      stdio: ["pipe", "ignore", "pipe"],
    });

    let stderr = "";
    ffmpeg.stderr?.on("data", (chunk) => {
      stderr = `${stderr}${chunk}`.slice(-800);
    });

    ffmpeg.on("error", (err) => {
      console.error("[ws-ingest] ffmpeg no disponible:", err.message);
      ws.close(1011, "ffmpeg no instalado en el servidor");
    });

    ffmpeg.on("close", (code) => {
      if (code !== 0 && code !== null) {
        console.error("[ws-ingest] ffmpeg exit", code, stderr);
      }
      if (ws.readyState === ws.OPEN) {
        ws.close(1011, "ffmpeg finalizó");
      }
    });

    ws.on("message", (data) => {
      if (!Buffer.isBuffer(data) || data.length === 0) return;
      if (ffmpeg.stdin.writable) {
        ffmpeg.stdin.write(data);
      }
    });

    ws.on("close", () => {
      try {
        ffmpeg.stdin.end();
      } catch {
        /* ignore */
      }
      ffmpeg.kill("SIGINT");
    });

    ws.send(JSON.stringify({ ok: true, event: "ready", message: "Ingest WebSocket listo" }));
    console.log(`[ws-ingest] Publicando a Mux stream_key=${streamKey.slice(0, 8)}…`);
  });
}
