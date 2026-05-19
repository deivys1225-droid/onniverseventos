import { RtcRole, RtcTokenBuilder } from "npm:agora-access-token@2.0.4";

type TokenRequest = {
  channelName?: string;
  uid?: number;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const AGORA_CHANNEL_PREFIX = "al-universo-";

function normalizeChannel(input: string): string {
  const normalized = input.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-");
  if (!normalized) return `${AGORA_CHANNEL_PREFIX}main`;
  if (normalized.startsWith(AGORA_CHANNEL_PREFIX)) return normalized;
  return `${AGORA_CHANNEL_PREFIX}${normalized}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const appId = Deno.env.get("AGORA_APP_ID")?.trim() ?? "";
    const appCertificate = Deno.env.get("AGORA_APP_CERTIFICATE")?.trim() ?? "";
    if (!appId || !appCertificate) {
      return json({ error: "Missing AGORA_APP_ID or AGORA_APP_CERTIFICATE" }, 500);
    }

    const payload = (await req.json()) as TokenRequest;
    const requestedChannel = payload.channelName?.trim() ?? "";
    if (requestedChannel.length < 3) {
      return json({ error: "channelName is required (min 3 chars)" }, 400);
    }

    const channelName = normalizeChannel(requestedChannel);
    const uid = Number.isFinite(payload.uid) ? Number(payload.uid) : 0;
    const now = Math.floor(Date.now() / 1000);
    const expireSeconds = 60 * 60 * 2;
    const privilegeExpiredTs = now + expireSeconds;

    const hostToken = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelName,
      uid,
      RtcRole.PUBLISHER,
      privilegeExpiredTs,
    );
    const audienceToken = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelName,
      uid,
      RtcRole.SUBSCRIBER,
      privilegeExpiredTs,
    );

    return json({
      appId,
      channelName,
      hostToken,
      audienceToken,
      expiresAt: privilegeExpiredTs,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return json({ error: message }, 500);
  }
});
