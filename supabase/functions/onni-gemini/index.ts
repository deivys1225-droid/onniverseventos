type OnniChatRequest = {
  message?: string;
  contextPath?: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL")?.trim() || "gemini-2.5-flash";
const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL")?.trim() || "gpt-4o-mini";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function buildSystemPrompt(contextPath: string, provider: "gemini" | "openai" = "gemini"): string {
  const aiLine =
    provider === "openai"
      ? "Si preguntan qué IA usas, responde: «Sí, uso ChatGPT (OpenAI)»."
      : "Si preguntan qué IA usas, responde SIEMPRE: «Sí, uso Google Gemini».";

  const intro =
    provider === "openai"
      ? "Eres Onni, la asistente de OnniVerso. Tu motor es ChatGPT (OpenAI)."
      : "Eres Onni, la asistente de OnniVerso. Tu motor es Google Gemini.";

  return [
    intro,
    aiLine,
    "NUNCA digas que solo usas reglas fijas sin IA.",
    `El usuario está en la ruta: ${contextPath || "/"}.`,
    "OnniVerso es una plataforma de experiencias inmersivas; no enumeres secciones salvo que pregunten explícitamente qué hay o dónde ir.",
    "No tienes resultados en vivo de partidos deportivos ni noticias del día.",
    "Tono: cercano, claro, español, 1–2 frases. No inventes URLs.",
    "NUNCA listes lobby, conciertos, tienda, Coliseo, aulas ni opciones de menú en saludos o respuestas genéricas.",
    "NO cierres invitando a elegir una sección ni con «dime cuál te interesa». Responde solo lo preguntado.",
  ].join("\n");
}

function cleanAnswer(raw: string): string {
  let answer = raw.trim();
  answer = answer
    .replace(/\n\s*si necesitas explorar[\s\S]*$/i, "")
    .replace(/\n\s*recuerda que tambi[eé]n puedes[\s\S]*$/i, "")
    .replace(/\n\s*(para navegar|comandos como|tambien puedes usar)[\s\S]*$/i, "")
    .replace(/\ben onniverso (tenemos|ofrece|cuenta con)[\s\S]*$/i, "")
    .replace(/[\s\S]*\bdime cu[aá]l te interesa\b[\s\S]*$/i, "")
    .trim();
  if (!answer || /\b(lobby 3d|conciertos en vivo|coliseo 360|aulas virtuales)\b/i.test(answer)) {
    return "¡Hola! Soy Onni, tu copiloto en OnniVerso.";
  }
  return answer;
}

function extractGeminiText(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const candidates = (payload as { candidates?: unknown[] }).candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) return "";
  const parts = (candidates[0] as { content?: { parts?: unknown[] } })?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts
    .map((part) =>
      part && typeof part === "object" && typeof (part as { text?: string }).text === "string"
        ? (part as { text: string }).text
        : "",
    )
    .join("")
    .trim();
}

async function askGemini(message: string, contextPath: string, apiKey: string) {
  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: buildSystemPrompt(contextPath, "gemini") }],
        },
        contents: [{ role: "user", parts: [{ text: message }] }],
        generationConfig: { maxOutputTokens: 512, temperature: 0.65 },
      }),
    },
  );

  const geminiJson = await geminiRes.json();
  if (!geminiRes.ok) {
    const errMsg =
      (geminiJson as { error?: { message?: string } })?.error?.message ??
      `Gemini API error (${geminiRes.status})`;
    throw new Error(errMsg);
  }

  const rawAnswer = extractGeminiText(geminiJson);
  if (!rawAnswer) throw new Error("Gemini returned an empty response");
  return { answer: cleanAnswer(rawAnswer), model: GEMINI_MODEL, provider: "gemini" };
}

async function askOpenAI(message: string, contextPath: string, apiKey: string) {
  const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.65,
      max_tokens: 512,
      messages: [
        { role: "system", content: buildSystemPrompt(contextPath, "openai") },
        { role: "user", content: message },
      ],
    }),
  });

  const openaiJson = await openaiRes.json();
  if (!openaiRes.ok) {
    const errMsg =
      (openaiJson as { error?: { message?: string } })?.error?.message ??
      `OpenAI API error (${openaiRes.status})`;
    throw new Error(errMsg);
  }

  const rawAnswer = (openaiJson as { choices?: { message?: { content?: string } }[] })
    ?.choices?.[0]?.message?.content?.trim() ?? "";
  if (!rawAnswer) throw new Error("OpenAI returned an empty response");
  return { answer: cleanAnswer(rawAnswer), model: OPENAI_MODEL, provider: "openai" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const body = (await req.json()) as OnniChatRequest;
    const message = body.message?.trim() ?? "";
    if (!message) {
      return json({ error: "Missing message" }, 400);
    }

    const contextPath = body.contextPath?.trim() || "/";
    const geminiKey = Deno.env.get("GEMINI_API_KEY")?.trim() ?? "";
    const openaiKey = Deno.env.get("OPENAI_API_KEY")?.trim() ?? "";

    if (geminiKey) {
      try {
        const result = await askGemini(message, contextPath, geminiKey);
        return json(result);
      } catch (geminiError) {
        if (!openaiKey) {
          const messageText = geminiError instanceof Error ? geminiError.message : "Gemini error";
          return json({ error: messageText }, 502);
        }
      }
    }

    if (openaiKey) {
      try {
        const result = await askOpenAI(message, contextPath, openaiKey);
        return json(result);
      } catch (openaiError) {
        const messageText = openaiError instanceof Error ? openaiError.message : "OpenAI error";
        return json({ error: messageText }, 502);
      }
    }

    return json({ error: "Missing GEMINI_API_KEY in Supabase Edge secrets" }, 500);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return json({ error: message }, 500);
  }
});
