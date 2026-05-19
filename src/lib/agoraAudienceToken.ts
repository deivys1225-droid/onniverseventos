import { supabase, supabasePublicUrl, supabasePublishableKey } from "@/integrations/supabase/client";
import { agoraChannelSlugForTokenRequest, buildAgoraChannel } from "@/lib/agoraRooms";

const ENV_APP_ID = (import.meta.env.NEXT_PUBLIC_AGORA_APP_ID as string | undefined)?.trim() ?? "";
const ENV_AUDIENCE_TOKEN =
  (import.meta.env.NEXT_PUBLIC_AGORA_AUDIENCE_TOKEN as string | undefined)?.trim() ??
  (import.meta.env.NEXT_PUBLIC_AGORA_TOKEN as string | undefined)?.trim() ??
  "";

export type AgoraAudienceSession = {
  appId: string;
  channelName: string;
  audienceToken: string;
};

async function invokeAgoraTokenEdge(channelSlug: string): Promise<Record<string, unknown>> {
  const { data: invokedData, error: fnError } = await supabase.functions.invoke("agora-token", {
    body: { channelName: channelSlug, uid: 0 },
  });

  if (!fnError && invokedData) {
    return invokedData as Record<string, unknown>;
  }

  const response = await fetch(`${supabasePublicUrl}/functions/v1/agora-token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: supabasePublishableKey,
      Authorization: `Bearer ${supabasePublishableKey}`,
    },
    body: JSON.stringify({ channelName: channelSlug, uid: 0 }),
  });
  const responseJson = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    const backendError = String(responseJson.error ?? "");
    throw new Error(backendError || fnError?.message || "No se pudo generar el token de Agora.");
  }
  return responseJson;
}

/**
 * App ID + canal + token de audiencia alineados (mismo canal con el que se firmó el token).
 */
export async function fetchAgoraAudienceSession(channelOrSlug: string): Promise<AgoraAudienceSession> {
  const channelSlug = agoraChannelSlugForTokenRequest(channelOrSlug);
  if (!channelSlug) {
    if (!ENV_APP_ID || !ENV_AUDIENCE_TOKEN) {
      throw new Error("Canal de Agora no válido.");
    }
    return {
      appId: ENV_APP_ID,
      channelName: buildAgoraChannel(channelOrSlug),
      audienceToken: ENV_AUDIENCE_TOKEN,
    };
  }

  const data = await invokeAgoraTokenEdge(channelSlug);

  const appId = String(data.appId ?? "").trim() || ENV_APP_ID;
  const channelName = String(data.channelName ?? "").trim() || buildAgoraChannel(channelSlug);
  const audienceToken = String(data.audienceToken ?? "").trim() || ENV_AUDIENCE_TOKEN;

  if (!appId) {
    throw new Error("Falta App ID de Agora (Edge o NEXT_PUBLIC_AGORA_APP_ID).");
  }
  if (!audienceToken) {
    throw new Error("No se recibió token de audiencia. Revisa agora-token en Supabase.");
  }

  return { appId, channelName, audienceToken };
}

/** Solo token (compat). Preferir {@link fetchAgoraAudienceSession}. */
export async function fetchAgoraAudienceToken(channelName: string): Promise<string> {
  const session = await fetchAgoraAudienceSession(channelName);
  return session.audienceToken;
}
