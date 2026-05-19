const LIVEPEER_API_URL = "https://livepeer.studio/api/stream";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_PROFILES = [
  { name: "720p", bitrate: 2000000, fps: 30, width: 1280, height: 720 },
  { name: "480p", bitrate: 1000000, fps: 30, width: 854, height: 480 },
];

type CreateStreamRequest = {
  name?: string;
  profiles?: Array<{
    name: string;
    bitrate: number;
    fps: number;
    width: number;
    height: number;
  }>;
};

type LivepeerStreamResponse = {
  id?: string;
  streamKey?: string;
  playbackId?: string;
  rtmpIngestUrl?: string;
  playbackUrl?: string;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function buildPlaybackUrl(playbackId: string): string {
  const id = playbackId.trim();
  return `https://livepeercdn.studio/hls/${id}/index.m3u8`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const apiKey = Deno.env.get("LIVEPEER_API_KEY")?.trim() ?? "";
    if (!apiKey) {
      return json({ error: "Missing LIVEPEER_API_KEY in Supabase Edge secrets" }, 500);
    }

    const payload = (await req.json()) as CreateStreamRequest;
    const requestBody = {
      name: payload.name?.trim() || "Transmision_Onniverso",
      profiles: Array.isArray(payload.profiles) && payload.profiles.length > 0
        ? payload.profiles
        : DEFAULT_PROFILES,
    };

    const livepeerRes = await fetch(LIVEPEER_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const livepeerJson = (await livepeerRes.json()) as LivepeerStreamResponse & { message?: string };
    if (!livepeerRes.ok) {
      const message = livepeerJson.message ?? `Livepeer API error (${livepeerRes.status})`;
      return json({ error: message }, livepeerRes.status);
    }

    const streamKey = String(livepeerJson.streamKey ?? "").trim();
    const playbackId = String(livepeerJson.playbackId ?? "").trim();
    if (!streamKey || !playbackId) {
      return json({ error: "Livepeer no devolvió streamKey o playbackId" }, 502);
    }

    const rtmpIngestUrl = String(livepeerJson.rtmpIngestUrl ?? "rtmp://rtmp.livepeer.com/live").trim();
    const playbackUrl = buildPlaybackUrl(playbackId);

    return json({
      id: livepeerJson.id ?? null,
      streamKey,
      playbackId,
      playbackUrl,
      rtmpIngestUrl,
      ingestUrl: `${rtmpIngestUrl.replace(/\/$/, "")}/${streamKey}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return json({ error: message }, 500);
  }
});
