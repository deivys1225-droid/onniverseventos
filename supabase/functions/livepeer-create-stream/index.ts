import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type CreateStreamBody = {
  name?: string;
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

  return new Response(rawText, {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
