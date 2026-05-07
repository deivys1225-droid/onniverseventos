import { supabase, supabasePublicUrl, supabasePublishableKey } from "@/integrations/supabase/client";

export type LivepeerCreateStreamResponse = {
  streamId?: string | null;
  streamKey: string;
  playbackId: string;
  playbackUrl: string;
  ingestRtmp: string;
  whipUrl: string;
  transmitUrl?: string;
};

function livepeerEdgeUrl(): string {
  return `${supabasePublicUrl.replace(/\/+$/, "")}/functions/v1/livepeer-create-stream`;
}

export async function createLivepeerStreamViaEdge(title: string): Promise<LivepeerCreateStreamResponse> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    throw new Error("Debes iniciar sesión.");
  }

  const accessToken = sessionData.session.access_token;
  const endpoint = livepeerEdgeUrl();

  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabasePublishableKey,
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ title }),
    });
  } catch {
    throw new Error(
      `No hay conexión con Supabase (${endpoint}). Comprueba datos/WiFi. Si cambiaste de proyecto, unifica VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY en Vercel.`,
    );
  }

  const raw = await res.text();
  let parsed: Record<string, unknown> | null = null;
  if (raw) {
    try {
      const j = JSON.parse(raw) as unknown;
      parsed = typeof j === "object" && j !== null ? (j as Record<string, unknown>) : null;
    } catch {
      parsed = null;
    }
  }

  const msg = (() => {
    if (!parsed) return raw.slice(0, 320).trim();
    if (typeof parsed.message === "string" && parsed.message.trim()) return parsed.message.trim();
    if (typeof parsed.error === "string" && parsed.error.trim()) {
      const d = parsed.details;
      const extra = typeof d === "string" && d.trim() ? ` — ${d.trim().slice(0, 180)}` : "";
      return `${parsed.error.trim()}${extra}`;
    }
    return raw.slice(0, 320).trim();
  })();

  if (!res.ok) {
    if (res.status === 404 || /not found/i.test(msg)) {
      throw new Error(
        `La función livepeer-create-stream no está desplegada. En tu carpeta del proyecto: supabase functions deploy livepeer-create-stream`,
      );
    }
    throw new Error(msg || `Error ${res.status} al crear el stream.`);
  }

  if (!parsed) {
    throw new Error("Respuesta inválida del servidor.");
  }

  const errMsg = typeof parsed.error === "string" ? parsed.error : null;
  if (errMsg) {
    throw new Error(errMsg);
  }

  const streamKey = parsed.streamKey;
  const playbackId = parsed.playbackId;
  const playbackUrl = parsed.playbackUrl;
  const ingestRtmp = parsed.ingestRtmp;
  const whipUrl = parsed.whipUrl;
  const transmitUrl = parsed.transmitUrl;

  if (
    typeof streamKey !== "string" ||
    typeof playbackId !== "string" ||
    typeof playbackUrl !== "string" ||
    typeof ingestRtmp !== "string" ||
    typeof whipUrl !== "string"
  ) {
    throw new Error("Respuesta incompleta de Livepeer.");
  }

  const streamId = parsed.streamId;
  return {
    streamId: typeof streamId === "string" ? streamId : typeof streamId === "number" ? String(streamId) : null,
    streamKey,
    playbackId,
    playbackUrl,
    ingestRtmp,
    whipUrl,
    transmitUrl: typeof transmitUrl === "string" ? transmitUrl : undefined,
  };
}
