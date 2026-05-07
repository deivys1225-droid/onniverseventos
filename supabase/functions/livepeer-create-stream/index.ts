import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type CreateBody = { title?: string };

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

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) {
    return new Response(JSON.stringify({ error: "Invalid session" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const livepeerKey = Deno.env.get("LIVEPEER_API_KEY");
  if (!livepeerKey?.trim()) {
    return new Response(JSON.stringify({ error: "LIVEPEER_API_KEY no configurado en Supabase (Edge Functions → Secrets)." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let bodyText: CreateBody = {};
  try {
    bodyText = (await req.json()) as CreateBody;
  } catch {
    bodyText = {};
  }

  const name =
    typeof bodyText.title === "string" && bodyText.title.trim().length > 0
      ? bodyText.title.trim().slice(0, 120)
      : "vivevr-live";

  const lpRes = await fetch("https://livepeer.studio/api/stream", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${livepeerKey.trim()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name }),
  });

  const raw = await lpRes.text();
  if (!lpRes.ok) {
    let details = raw.slice(0, 400).trim();
    try {
      const j = JSON.parse(raw) as { error?: string; message?: string };
      if (typeof j.error === "string" && j.error) details = j.error;
      else if (typeof j.message === "string" && j.message) details = j.message;
    } catch {
      /* texto plano */
    }
    const hint =
      lpRes.status === 401 || lpRes.status === 403
        ? "API key de Livepeer inválida o revocada. Crea una nueva en https://livepeer.studio (Developers → API Keys) y guarda LIVEPEER_API_KEY en Supabase."
        : "Livepeer rechazó la petición. Revisa la API key y el proyecto.";
    return new Response(JSON.stringify({ error: hint, details }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let data: Record<string, unknown>;
  try {
    const root = JSON.parse(raw) as Record<string, unknown>;
    const nested = root.data;
    if (!root.streamKey && !root.stream_key && typeof nested === "object" && nested !== null) {
      data = nested as Record<string, unknown>;
    } else {
      data = root;
    }
  } catch {
    return new Response(JSON.stringify({ error: "Respuesta inválida de Livepeer" }), {
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
    return new Response(JSON.stringify({ error: "Livepeer no devolvió streamKey o playbackId", raw: data }), {
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
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
