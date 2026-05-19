import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, livepeer-signature, x-livepeer-webhook-secret",
};

type WebhookPayload = {
  event?: string;
  id?: string;
  stream?: { id?: string };
  streamId?: string;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function createServiceClient() {
  const url = Deno.env.get("SUPABASE_URL")?.trim() ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim() ?? "";
  if (!url || !serviceKey) {
    return null;
  }
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

async function syncStreamLiveState(options: {
  livepeerStreamId: string;
  isLive: boolean;
}): Promise<{ updated: boolean }> {
  const admin = createServiceClient();
  if (!admin) {
    return { updated: false };
  }

  const streamId = options.livepeerStreamId.trim();
  if (!streamId) {
    return { updated: false };
  }

  const liveStatus = options.isLive ? "En Línea" : "Offline";
  const now = new Date().toISOString();

  const { data, error } = await admin
    .from("active_streams")
    .update({
      is_live: options.isLive,
      updated_at: now,
    })
    .eq("livepeer_stream_id", streamId)
    .select("user_id");

  if (error) {
    console.error("webhook active_streams sync failed:", error.message);
    return { updated: false };
  }

  const userIds = [...new Set((data ?? []).map((row) => row.user_id as string))];
  if (userIds.length > 0) {
    await admin
      .from("profiles")
      .update({ live_status: liveStatus, updated_at: now })
      .in("id", userIds);
  }

  return { updated: (data ?? []).length > 0 };
}

function verifyWebhookSecret(req: Request): boolean {
  const expected = Deno.env.get("LIVEPEER_WEBHOOK_SECRET")?.trim() ?? "";
  if (!expected) {
    return true;
  }
  const headerSecret =
    req.headers.get("x-livepeer-webhook-secret")?.trim() ??
    req.headers.get("livepeer-signature")?.trim() ??
    "";
  const auth = req.headers.get("authorization")?.trim() ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  return headerSecret === expected || bearer === expected;
}

function resolveStreamId(payload: WebhookPayload): string {
  return String(payload.stream?.id ?? payload.streamId ?? payload.id ?? "").trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ ok: false, error: "Method not allowed" }, 405);
  }

  if (!verifyWebhookSecret(req)) {
    return json({ ok: false, error: "Invalid webhook secret" }, 401);
  }

  try {
    const payload = (await req.json()) as WebhookPayload;
    const event = String(payload.event ?? "").trim().toLowerCase();
    const livepeerStreamId = resolveStreamId(payload);

    if (!livepeerStreamId) {
      return json({ ok: false, error: "Missing stream id in webhook payload" }, 400);
    }

    if (event === "stream.started") {
      const result = await syncStreamLiveState({ livepeerStreamId, isLive: true });
      return json({
        ok: true,
        event,
        livepeerStreamId,
        isLive: true,
        synced: result.updated,
      });
    }

    if (event === "stream.idle") {
      const result = await syncStreamLiveState({ livepeerStreamId, isLive: false });
      return json({
        ok: true,
        event,
        livepeerStreamId,
        isLive: false,
        synced: result.updated,
      });
    }

    return json({ ok: true, event, livepeerStreamId, ignored: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return json({ ok: false, error: message }, 500);
  }
});
