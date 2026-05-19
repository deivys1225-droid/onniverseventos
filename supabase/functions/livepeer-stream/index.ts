import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const LIVEPEER_API_URL = "https://livepeer.studio/api/stream";
const LIVEPEER_RTMP_INGEST_BASE = "rtmp://rtmp.livepeer.com/live";
const LIVEPEER_HLS_CDN_BASE = "https://livepeercdn.studio/hls";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-livepeer-webhook-secret",
};

type CreateStreamRequest = {
  action?: "create" | "status";
  name?: string;
  /** UUID del emisor: permite marcar is_live al detectar RTMP activo (action status). */
  userId?: string;
  livepeerStreamId?: string;
  profiles?: Array<{
    name: string;
    bitrate: number;
    fps: number;
    width: number;
    height: number;
  }>;
};

type LivepeerStreamApi = {
  id?: string;
  streamKey?: string;
  playbackId?: string;
  rtmpIngestUrl?: string;
  isActive?: boolean;
  lastSeen?: number | null;
  message?: string;
};

const DEFAULT_PROFILES = [
  { name: "720p", bitrate: 2000000, fps: 30, width: 1280, height: 720 },
  { name: "480p", bitrate: 1000000, fps: 30, width: 854, height: 480 },
];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function buildPlaybackUrl(playbackId: string): string {
  const id = playbackId.trim();
  return `${LIVEPEER_HLS_CDN_BASE}/${id}/index.m3u8`;
}

function buildRtmpPushUrl(streamKey: string): string {
  const key = streamKey.trim();
  return `${LIVEPEER_RTMP_INGEST_BASE}/${key}`;
}

function normalizeRtmpIngestBase(value: string | undefined): string {
  const base = (value ?? LIVEPEER_RTMP_INGEST_BASE).trim().replace(/\/$/, "");
  return base || LIVEPEER_RTMP_INGEST_BASE;
}

function livepeerHeaders(apiKey: string): HeadersInit {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

async function fetchLivepeerStream(apiKey: string, streamId: string): Promise<LivepeerStreamApi> {
  const res = await fetch(`${LIVEPEER_API_URL}/${encodeURIComponent(streamId.trim())}`, {
    method: "GET",
    headers: livepeerHeaders(apiKey),
  });
  const data = (await res.json()) as LivepeerStreamApi;
  if (!res.ok) {
    throw new Error(data.message ?? `Livepeer status error (${res.status})`);
  }
  return data;
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
  userId?: string;
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

  let query = admin.from("active_streams").update({
    is_live: options.isLive,
    updated_at: now,
  }).eq("livepeer_stream_id", streamId);

  if (options.userId?.trim()) {
    query = query.eq("user_id", options.userId.trim());
  }

  const { data, error } = await query.select("user_id");
  if (error) {
    console.error("active_streams sync failed:", error.message);
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

async function handleCreate(apiKey: string, payload: CreateStreamRequest) {
  const requestBody = {
    name: payload.name?.trim() || "Transmision_Onniverso",
    profiles:
      Array.isArray(payload.profiles) && payload.profiles.length > 0
        ? payload.profiles
        : DEFAULT_PROFILES,
  };

  const livepeerRes = await fetch(LIVEPEER_API_URL, {
    method: "POST",
    headers: livepeerHeaders(apiKey),
    body: JSON.stringify(requestBody),
  });

  const livepeerJson = (await livepeerRes.json()) as LivepeerStreamApi;
  if (!livepeerRes.ok) {
    const message = livepeerJson.message ?? `Livepeer API error (${livepeerRes.status})`;
    return json({ ok: false, error: message }, livepeerRes.status);
  }

  const streamKey = String(livepeerJson.streamKey ?? "").trim();
  const playbackId = String(livepeerJson.playbackId ?? "").trim();
  const livepeerStreamId = String(livepeerJson.id ?? "").trim();

  if (!streamKey || !playbackId || !livepeerStreamId) {
    return json(
      { ok: false, error: "Livepeer no devolvió streamKey, playbackId o id del stream" },
      502,
    );
  }

  const rtmpIngestUrl = normalizeRtmpIngestBase(livepeerJson.rtmpIngestUrl);
  const playbackUrl = buildPlaybackUrl(playbackId);
  const rtmpPushUrl = buildRtmpPushUrl(streamKey);

  return json({
    ok: true,
    action: "create",
    livepeerStreamId,
    streamKey,
    playbackId,
    playbackUrl,
    rtmpIngestUrl,
    rtmpPushUrl,
    ingestUrl: rtmpPushUrl,
    playback: {
      hls: playbackUrl,
      playbackId,
    },
    rtmp: {
      ingestBase: rtmpIngestUrl,
      streamKey,
      pushUrl: rtmpPushUrl,
    },
  });
}

async function handleStatus(apiKey: string, payload: CreateStreamRequest) {
  const livepeerStreamId = String(payload.livepeerStreamId ?? "").trim();
  if (!livepeerStreamId) {
    return json({ ok: false, error: "Falta livepeerStreamId para consultar estado RTMP" }, 400);
  }

  const stream = await fetchLivepeerStream(apiKey, livepeerStreamId);
  const streamKey = String(stream.streamKey ?? "").trim();
  const playbackId = String(stream.playbackId ?? "").trim();
  const playbackUrl = playbackId ? buildPlaybackUrl(playbackId) : null;
  const isActive = stream.isActive === true;

  let synced = false;
  if (payload.userId?.trim()) {
    const result = await syncStreamLiveState({
      livepeerStreamId,
      userId: payload.userId.trim(),
      isLive: isActive,
    });
    synced = result.updated;
  }

  return json({
    ok: true,
    action: "status",
    livepeerStreamId,
    streamKey,
    playbackId,
    playbackUrl,
    rtmpPushUrl: streamKey ? buildRtmpPushUrl(streamKey) : null,
    isActive,
    isLive: isActive,
    lastSeen: stream.lastSeen ?? null,
    synced,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ ok: false, error: "Method not allowed" }, 405);
  }

  try {
    const apiKey = Deno.env.get("LIVEPEER_API_KEY")?.trim() ?? "";
    if (!apiKey) {
      return json({ ok: false, error: "Missing LIVEPEER_API_KEY in Supabase Edge secrets" }, 500);
    }

    const payload = (await req.json()) as CreateStreamRequest;
    const action = payload.action === "status" ? "status" : "create";

    if (action === "status") {
      return await handleStatus(apiKey, payload);
    }
    return await handleCreate(apiKey, payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return json({ ok: false, error: message }, 500);
  }
});
