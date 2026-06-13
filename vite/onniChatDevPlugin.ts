import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import { runOnniChat } from "../api/onni/chatCore.js";

function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res: ServerResponse, status: number, payload: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

/** En `npm run dev`, sirve POST /api/onni/chat (ChatGPT u Ollama local según .env.local). */
export function onniChatDevPlugin(env: Record<string, string>): Plugin {
  return {
    name: "onni-chat-dev",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split("?")[0];
        if (url !== "/api/onni/chat") return next();

        if (req.method === "OPTIONS") {
          res.statusCode = 204;
          res.end();
          return;
        }

        if (req.method !== "POST") {
          sendJson(res, 405, { ok: false, error: "Método no permitido" });
          return;
        }

        try {
          const body = await readJsonBody(req);
          if (url === "/api/onni/chat") {
            const result = await runOnniChat(body as { message?: string; contextPath?: string }, env);
            sendJson(res, 200, result);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : "Error inesperado";
          const status =
            error && typeof error === "object" && "statusCode" in error
              ? Number((error as { statusCode?: number }).statusCode) || 502
              : 502;
          sendJson(res, status, { ok: false, error: message });
        }
      });
    },
  };
}
