import { supabase, supabasePublicUrl, supabasePublishableKey } from "@/integrations/supabase/client";

export type LivepeerStreamSession = {
  id: string | null;
  livepeerStreamId: string;
  streamKey: string;
  playbackId: string;
  playbackUrl: string;
  rtmpIngestUrl: string;
  rtmpPushUrl: string;
  ingestUrl: string;
};

export type LivepeerStreamStatus = {
  isActive: boolean;
  isLive: boolean;
  lastSeen: number | null;
  synced: boolean;
  playbackUrl: string | null;
  rtmpPushUrl: string | null;
  streamKey: string | null;
};

async function invokeLivepeerStreamEdge(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { data: invokedData, error: fnError } = await supabase.functions.invoke("livepeer-stream", {
    body,
  });

  if (!fnError && invokedData) {
    return invokedData as Record<string, unknown>;
  }

  const response = await fetch(`${supabasePublicUrl}/functions/v1/livepeer-stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: supabasePublishableKey,
      Authorization: `Bearer ${supabasePublishableKey}`,
    },
    body: JSON.stringify(body),
  });

  const responseJson = (await response.json()) as Record<string, unknown>;
  if (!response.ok || responseJson.ok === false) {
    const backendError = String(responseJson.error ?? "");
    throw new Error(backendError || fnError?.message || "No se pudo contactar livepeer-stream.");
  }
  return responseJson;
}

/** Crea stream en Livepeer Studio: streamKey + playbackUrl HLS + URL RTMP para el celular. */
export async function createLivepeerStream(name?: string): Promise<LivepeerStreamSession> {
  const data = await invokeLivepeerStreamEdge({
    action: "create",
    name: name?.trim() || "Transmision_Onniverso",
  });

  const streamKey = String(data.streamKey ?? "").trim();
  const playbackId = String(data.playbackId ?? "").trim();
  const playbackUrl = String(data.playbackUrl ?? "").trim();
  const livepeerStreamId = String(data.livepeerStreamId ?? data.id ?? "").trim();
  const rtmpIngestUrl = String(data.rtmpIngestUrl ?? "rtmp://rtmp.livepeer.com/live").trim();
  const rtmpPushUrl = String(data.rtmpPushUrl ?? data.ingestUrl ?? "").trim();

  if (!streamKey || !playbackId || !playbackUrl || !livepeerStreamId) {
    throw new Error("Respuesta incompleta de Livepeer (streamKey, playbackId, playbackUrl o livepeerStreamId).");
  }

  const pushUrl =
    rtmpPushUrl || `${rtmpIngestUrl.replace(/\/$/, "")}/${streamKey}`;

  return {
    id: livepeerStreamId,
    livepeerStreamId,
    streamKey,
    playbackId,
    playbackUrl,
    rtmpIngestUrl: rtmpIngestUrl.replace(/\/$/, "") || "rtmp://rtmp.livepeer.com/live",
    rtmpPushUrl: pushUrl,
    ingestUrl: pushUrl,
  };
}

/**
 * Consulta Livepeer si el RTMP ya está activo y sincroniza active_streams (is_live).
 * Usar en móvil tras iniciar Larix/OBS con rtmpPushUrl.
 */
export async function pollLivepeerStreamStatus(options: {
  livepeerStreamId: string;
  userId: string;
}): Promise<LivepeerStreamStatus> {
  const data = await invokeLivepeerStreamEdge({
    action: "status",
    livepeerStreamId: options.livepeerStreamId.trim(),
    userId: options.userId.trim(),
  });

  return {
    isActive: data.isActive === true,
    isLive: data.isLive === true,
    lastSeen: typeof data.lastSeen === "number" ? data.lastSeen : null,
    synced: data.synced === true,
    playbackUrl: typeof data.playbackUrl === "string" ? data.playbackUrl : null,
    rtmpPushUrl: typeof data.rtmpPushUrl === "string" ? data.rtmpPushUrl : null,
    streamKey: typeof data.streamKey === "string" ? data.streamKey : null,
  };
}
