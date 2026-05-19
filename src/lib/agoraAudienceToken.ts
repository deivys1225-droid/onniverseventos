import { supabase, supabasePublicUrl, supabasePublishableKey } from "@/integrations/supabase/client";

const ENV_AUDIENCE_TOKEN =
  (import.meta.env.NEXT_PUBLIC_AGORA_AUDIENCE_TOKEN as string | undefined)?.trim() ??
  (import.meta.env.NEXT_PUBLIC_AGORA_TOKEN as string | undefined)?.trim() ??
  "";

/** Solicita token de audiencia Agora (Supabase Edge `agora-token`). */
export async function fetchAgoraAudienceToken(channelName: string): Promise<string> {
  const channel = channelName.trim();
  if (!channel) return ENV_AUDIENCE_TOKEN;

  let data: Record<string, unknown> | null = null;
  const { data: invokedData, error: fnError } = await supabase.functions.invoke("agora-token", {
    body: { channelName: channel, uid: 0 },
  });

  if (!fnError && invokedData) {
    data = invokedData as Record<string, unknown>;
  } else {
    const response = await fetch(`${supabasePublicUrl}/functions/v1/agora-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabasePublishableKey,
        Authorization: `Bearer ${supabasePublishableKey}`,
      },
      body: JSON.stringify({ channelName: channel, uid: 0 }),
    });
    const responseJson = (await response.json()) as Record<string, unknown>;
    if (!response.ok) {
      const backendError = String(responseJson.error ?? "");
      throw new Error(backendError || fnError?.message || "No se pudo generar el token de Agora.");
    }
    data = responseJson;
  }

  const audienceToken = (data?.audienceToken as string | undefined)?.trim();
  return audienceToken || ENV_AUDIENCE_TOKEN;
}
