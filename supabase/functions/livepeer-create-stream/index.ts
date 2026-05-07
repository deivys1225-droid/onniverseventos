import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type CreateStreamBody = {
  name?: string;
  title?: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const livepeerApiKey = Deno.env.get("LIVEPEER_API_KEY")?.trim();
  if (!livepeerApiKey) {
    return new Response(JSON.stringify({ error: "LIVEPEER_API_KEY is not configured." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: CreateStreamBody = {};
  try {
    body = (await req.json()) as CreateStreamBody;
  } catch {
    body = {};
  }

  const streamName = typeof body.name === "string" && body.name.trim().length > 0
    ? body.name.trim().slice(0, 120)
    : typeof body.title === "string" && body.title.trim().length > 0
      ? body.title.trim().slice(0, 120)
      : "vivevr-live";

  const livepeerResponse = await fetch("https://livepeer.studio/api/stream", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${livepeerApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: streamName }),
  });

  const rawText = await livepeerResponse.text();
  if (!livepeerResponse.ok) {
    return new Response(JSON.stringify({ error: "Failed to create stream in Livepeer.", details: rawText }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let data: Record<string, unknown>;
  try {
    const root = JSON.parse(rawText) as Record<string, unknown>;
    const nested = root.data;
    if (!root.streamKey && !root.stream_key && typeof nested === "object" && nested !== null) {
      data = nested as Record<string, unknown>;
    } else {
      data = root;
    }
  } catch {
    return new Response(JSON.stringify({ error: "Invalid Livepeer response." }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const streamKey =
    typeof data.streamKey === "string" && data.streamKey
      ? data.streamKey
      : typeof data.stream_key === "string" && data.stream_key
        ? data.stream_key
        : null;

  const playbackId =
    typeof data.playbackId === "string" && data.playbackId
      ? data.playbackId
      : typeof data.playback_id === "string" && data.playback_id
        ? data.playback_id
        : typeof data.playbackId === "number"
          ? String(data.playbackId)
          : null;

  const id = typeof data.id === "string" && data.id ? data.id : null;

  if (!streamKey || !playbackId) {
    return new Response(JSON.stringify({ error: "Livepeer response missing streamKey or playbackId.", raw: data }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const playbackUrl = `https://livepeercdn.studio/hls/${playbackId}/index.m3u8`;
  const ingestRtmp = `rtmp://rtmp.livepeer.com/live/${streamKey}`;
  const whipUrl = `https://playback.livepeer.studio/webrtc/${streamKey}`;

  return new Response(
    JSON.stringify({
      streamId: id,
      streamKey,
      playbackId,
      playbackUrl,
      ingestRtmp,
      whipUrl,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
});
