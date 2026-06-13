import { ONNI_PERSONALITY } from "@/data/onniBrain";
import { supabase, supabasePublicUrl, supabasePublishableKey } from "@/integrations/supabase/client";

export type OnniGeminiRequest = {
  message: string;
  contextPath: string;
};

export type OnniGeminiResponse = {
  answer: string;
  model?: string;
  provider?: string;
};

export type OnniGeminiResult = {
  answer: string | null;
  error?: string;
};

const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

export function buildOnniGeminiSystemPrompt(contextPath: string): string {
  return [
    "Eres Onni, la asistente de OnniVerso. Tu motor es Google Gemini.",
    "Si preguntan qué IA usas, responde SIEMPRE: «Sí, uso Google Gemini».",
    "NUNCA digas que solo usas reglas fijas sin IA.",
    `El usuario está en la ruta: ${contextPath || "/"}.`,
    "OnniVerso es una plataforma de experiencias inmersivas; no enumeres secciones salvo que pregunten explícitamente qué hay o dónde ir.",
    "No tienes resultados en vivo de partidos deportivos ni noticias del día.",
    ONNI_PERSONALITY.tone,
    "Responde en español, breve (1–2 frases). No inventes URLs.",
    "NUNCA listes lobby, conciertos, tienda, Coliseo, aulas ni opciones de menú en saludos o respuestas genéricas.",
    "NO cierres invitando a elegir una sección ni con «dime cuál te interesa». Responde solo lo preguntado.",
  ].join(" ");
}

/** Quita el cierre típico con sugerencias de comandos que no queremos por voz. */
export function stripOnniCommandFooter(text: string): string {
  let out = text.trim();
  const cutPatterns = [
    /\n\s*si necesitas explorar[\s\S]*$/i,
    /\n\s*recuerda que tambien puedes[\s\S]*$/i,
    /\n\s*recuerda que también puedes[\s\S]*$/i,
    /\n\s*[*•-]\s*\*?\*?(lobby|conciertos|ayuda)[\s\S]*$/i,
    /\n\s*(para navegar|comandos como|tambien puedes usar)[\s\S]*$/i,
    /\ben onniverso (tenemos|ofrece|cuenta con)[\s\S]*$/i,
    /[\s\S]*\bdime cu[aá]l te interesa\b[\s\S]*$/i,
  ];
  for (const pattern of cutPatterns) {
    out = out.replace(pattern, "").trim();
  }
  if (!out || /\b(lobby 3d|conciertos en vivo|coliseo 360|aulas virtuales)\b/i.test(out)) {
    return "¡Hola! Soy Onni, tu copiloto en OnniVerso.";
  }
  return out;
}

async function invokeOnniVercelChat(body: OnniGeminiRequest): Promise<OnniGeminiResponse> {
  const response = await fetch("/api/onni/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await response.json()) as OnniGeminiResponse & { ok?: boolean; error?: string };
  if (!response.ok || json.ok === false) {
    throw new Error(json.error || `Onni chat API error (${response.status})`);
  }
  const answer = String(json.answer ?? "").trim();
  if (!answer) throw new Error("La API de Onni devolvió una respuesta vacía.");
  return { answer, model: json.model, provider: json.provider };
}

async function invokeOnniGeminiEdge(body: OnniGeminiRequest): Promise<OnniGeminiResponse> {
  const { data: invokedData, error: fnError } = await supabase.functions.invoke("onni-gemini", {
    body,
  });

  if (!fnError && invokedData && typeof invokedData === "object") {
    const answer = String((invokedData as { answer?: string }).answer ?? "").trim();
    if (answer) {
      return {
        answer,
        model: (invokedData as { model?: string }).model,
        provider: (invokedData as { provider?: string }).provider,
      };
    }
    const backendError = String((invokedData as { error?: string }).error ?? "").trim();
    if (backendError) throw new Error(backendError);
  }

  const response = await fetch(`${supabasePublicUrl}/functions/v1/onni-gemini`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: supabasePublishableKey,
      Authorization: `Bearer ${supabasePublishableKey}`,
    },
    body: JSON.stringify(body),
  });

  const responseJson = (await response.json()) as OnniGeminiResponse & { error?: string };
  if (!response.ok) {
    throw new Error(responseJson.error || fnError?.message || "No se pudo consultar Gemini.");
  }
  const answer = String(responseJson.answer ?? "").trim();
  if (!answer) throw new Error("Gemini devolvió una respuesta vacía.");
  return { answer, model: responseJson.model, provider: responseJson.provider };
}

/** Solo desarrollo local si VITE_GEMINI_API_KEY está en .env.local. */
async function askOnniGeminiDevDirect(body: OnniGeminiRequest, apiKey: string): Promise<OnniGeminiResponse> {
  const model =
    (import.meta.env.VITE_GEMINI_MODEL as string | undefined)?.trim() || DEFAULT_GEMINI_MODEL;
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: buildOnniGeminiSystemPrompt(body.contextPath) }] },
        contents: [{ role: "user", parts: [{ text: body.message }] }],
        generationConfig: { maxOutputTokens: 512, temperature: 0.65 },
      }),
    },
  );
  const json = (await response.json()) as {
    error?: { message?: string };
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  if (!response.ok) {
    throw new Error(json.error?.message || `Gemini error (${response.status})`);
  }
  const answer =
    json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim() ?? "";
  if (!answer) throw new Error("Gemini devolvió una respuesta vacía.");
  return { answer, model, provider: "gemini" };
}

function friendlyOnniChatError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("missing gemini_api_key") || lower.includes("falta gemini_api_key")) {
    return "Falta GEMINI_API_KEY en el servidor. En Vercel márcala también en Production y redeploy. En Supabase: Edge Functions → Secrets.";
  }
  if (lower.includes("api_key_invalid") || lower.includes("api key not valid")) {
    return "La clave de Gemini no es válida. Revísala en aistudio.google.com/apikey y actualiza Vercel/Supabase.";
  }
  if (lower.includes("resourceexhausted") || lower.includes("quota")) {
    return "Gemini rechazó la petición por límite de cuota. Revisa tu plan en Google AI Studio.";
  }
  if (lower.includes("onni chat api error (404)") || lower.includes("404")) {
    return "No encontré /api/onni/chat en el servidor. Redeploy en Vercel tras configurar GEMINI_API_KEY en Production.";
  }
  return message.trim() || "No se pudo consultar Gemini.";
}

/**
 * Consulta IA para Onni vía Google Gemini.
 * Producción: /api/onni/chat (Vercel) o Edge Function onni-gemini (Supabase).
 */
export async function askOnniGemini(body: OnniGeminiRequest): Promise<OnniGeminiResult> {
  const message = body.message.trim();
  if (!message) return { answer: null };

  const providers: Array<() => Promise<OnniGeminiResponse>> = [
    () => invokeOnniVercelChat(body),
    () => invokeOnniGeminiEdge(body),
  ];

  if (import.meta.env.DEV) {
    const geminiKey = (import.meta.env.VITE_GEMINI_API_KEY as string | undefined)?.trim();
    if (geminiKey) {
      providers.push(() => askOnniGeminiDevDirect(body, geminiKey));
    }
  }

  let lastError = "";
  for (const attempt of providers) {
    try {
      const result = await attempt();
      return { answer: stripOnniCommandFooter(result.answer) };
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      console.warn("[Onni AI]", error);
    }
  }

  return { answer: null, error: friendlyOnniChatError(lastError) };
}

export function isOnniNavigationResult(result: {
  navigateTo?: string;
  navigateBack?: boolean;
  command?: unknown;
}): boolean {
  return Boolean(result.navigateTo || result.navigateBack || result.command);
}
