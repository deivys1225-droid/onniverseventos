import { supabase, supabasePublicUrl, supabasePublishableKey } from "@/integrations/supabase/client";

export type LivepeerStreamSession = {
  id: string | null;
  streamKey: string;
  playbackId: string;
  playbackUrl: string;
  rtmpIngestUrl: string;
  ingestUrl: string;
};

async function invokeLivepeerStreamEdge(name?: string): Promise<Record<string, unknown>> {
  const body = { name: name?.trim() || "Transmision_Onniverso" };

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
  if (!response.ok) {
    const backendError = String(responseJson.error ?? "");
    throw new Error(backendError || fnError?.message || "No se pudo crear el stream en Livepeer.");
  }
  return responseJson;
}

/** Crea stream en Livepeer Studio (servidor) y devuelve streamKey + playback HLS. */
export async function createLivepeerStream(name?: string): Promise<LivepeerStreamSession> {
  const data = await invokeLivepeerStreamEdge(name);

  const streamKey = String(data.streamKey ?? "").trim();
  const playbackId = String(data.playbackId ?? "").trim();
  const playbackUrl = String(data.playbackUrl ?? "").trim();
  const rtmpIngestUrl = String(data.rtmpIngestUrl ?? "rtmp://rtmp.livepeer.com/live").trim();
  const ingestUrl = String(data.ingestUrl ?? "").trim();

  if (!streamKey || !playbackId || !playbackUrl) {
    throw new Error("Respuesta incompleta de Livepeer (streamKey, playbackId o playbackUrl).");
  }

  return {
    id: data.id ? String(data.id) : null,
    streamKey,
    playbackId,
    playbackUrl,
    rtmpIngestUrl,
    ingestUrl: ingestUrl || `${rtmpIngestUrl.replace(/\/$/, "")}/${streamKey}`,
  };
}
