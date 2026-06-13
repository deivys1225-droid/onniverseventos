const GEMINI_MODEL = "gemini-2.5-flash";
const OPENAI_MODEL = "gpt-4o-mini";
const DEFAULT_OLLAMA_HOST = "http://127.0.0.1:11434";
const DEFAULT_OLLAMA_MODEL = "llama3.2:3b";

export function buildOnniChatSystemPrompt(contextPath, provider = "gemini") {
  const aiLine =
    provider === "ollama"
      ? "Si preguntan qué IA usas, responde: «Corro localmente con Ollama (Llama 3.2) en tu equipo»."
      : provider === "openai"
        ? "Si preguntan qué IA usas, responde: «Sí, uso ChatGPT (OpenAI)»."
        : "Si preguntan qué IA usas, responde SIEMPRE: «Sí, uso Google Gemini».";

  const intro =
    provider === "ollama"
      ? "Eres Onni, la asistente de OnniVerso. Respondes con un modelo local (Ollama / Llama 3.2) en el PC del usuario."
      : provider === "openai"
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

function cleanAnswer(raw) {
  let answer = String(raw ?? "").trim();
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

function extractGeminiText(json) {
  const parts = json?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts
    .map((part) => (typeof part?.text === "string" ? part.text : ""))
    .join("")
    .trim();
}

async function askGemini(message, contextPath, apiKey, model = GEMINI_MODEL) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: buildOnniChatSystemPrompt(contextPath, "gemini") }] },
        contents: [{ role: "user", parts: [{ text: message }] }],
        generationConfig: { maxOutputTokens: 512, temperature: 0.65 },
      }),
    },
  );

  const json = await response.json();
  if (!response.ok) {
    const errMsg = json?.error?.message || `Gemini error (${response.status})`;
    throw new Error(String(errMsg));
  }

  const text = extractGeminiText(json);
  if (!text) throw new Error("Gemini devolvió una respuesta vacía.");
  return { answer: cleanAnswer(text), model, provider: "gemini" };
}

async function askOpenAI(message, contextPath, apiKey, model = OPENAI_MODEL) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.65,
      max_tokens: 512,
      messages: [
        { role: "system", content: buildOnniChatSystemPrompt(contextPath, "openai") },
        { role: "user", content: message },
      ],
    }),
  });

  const json = await response.json();
  if (!response.ok) {
    const errMsg =
      json?.error?.message || json?.error?.code || `OpenAI error (${response.status})`;
    throw new Error(String(errMsg));
  }

  const text = json?.choices?.[0]?.message?.content?.trim() ?? "";
  if (!text) throw new Error("OpenAI devolvió una respuesta vacía.");
  return { answer: cleanAnswer(text), model, provider: "openai" };
}

async function askOllama(message, contextPath, host, model = DEFAULT_OLLAMA_MODEL) {
  const baseUrl = String(host || DEFAULT_OLLAMA_HOST).replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      stream: false,
      messages: [
        { role: "system", content: buildOnniChatSystemPrompt(contextPath, "ollama") },
        { role: "user", content: message },
      ],
      options: { temperature: 0.65, num_predict: 512 },
    }),
  });

  const json = await response.json();
  if (!response.ok) {
    const errMsg = json?.error || `Ollama error (${response.status})`;
    throw new Error(String(errMsg));
  }

  const text = json?.message?.content?.trim() ?? "";
  if (!text) throw new Error("Ollama devolvió una respuesta vacía. ¿Está corriendo ollama serve?");
  return { answer: cleanAnswer(text), model, provider: "ollama" };
}

function isTruthyEnv(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase() === "true";
}

/** @param {{ message?: string, contextPath?: string }} body @param {Record<string, string | undefined>} env */
export async function runOnniChat(body, env = {}) {
  const message = String(body.message ?? "").trim();
  if (!message) {
    const error = new Error("Falta message");
    error.statusCode = 400;
    throw error;
  }

  const contextPath = String(body.contextPath ?? "/").trim() || "/";
  const ollamaEnabled = isTruthyEnv(env.OLLAMA_ENABLED) || isTruthyEnv(env.VITE_OLLAMA_ENABLED);
  const ollamaOnly = isTruthyEnv(env.OLLAMA_ONLY) || isTruthyEnv(env.VITE_OLLAMA_ONLY);
  const ollamaHost =
    env.OLLAMA_HOST?.trim() || env.VITE_OLLAMA_HOST?.trim() || DEFAULT_OLLAMA_HOST;
  const ollamaModel =
    env.OLLAMA_MODEL?.trim() || env.VITE_OLLAMA_MODEL?.trim() || DEFAULT_OLLAMA_MODEL;
  const geminiKey = env.GEMINI_API_KEY?.trim() || env.VITE_GEMINI_API_KEY?.trim();
  const geminiModel = env.GEMINI_MODEL?.trim() || env.VITE_GEMINI_MODEL?.trim() || GEMINI_MODEL;
  const openaiKey = env.OPENAI_API_KEY?.trim() || env.VITE_OPENAI_API_KEY?.trim();
  const openaiModel = env.OPENAI_MODEL?.trim() || env.VITE_OPENAI_MODEL?.trim() || OPENAI_MODEL;

  if (ollamaEnabled) {
    try {
      return { ok: true, ...(await askOllama(message, contextPath, ollamaHost, ollamaModel)) };
    } catch (ollamaError) {
      if (!geminiKey && !openaiKey) throw ollamaError;
      if (ollamaOnly) {
        console.warn("[Onni AI] Ollama-only activo, pero hay claves cloud. Usando Gemini/OpenAI como respaldo.");
      }
    }
  }

  if (geminiKey) {
    try {
      return { ok: true, ...(await askGemini(message, contextPath, geminiKey, geminiModel)) };
    } catch (geminiError) {
      if (!openaiKey) throw geminiError;
      console.warn("[Onni AI] Gemini falló, probando OpenAI:", geminiError);
    }
  }

  if (openaiKey) {
    return { ok: true, ...(await askOpenAI(message, contextPath, openaiKey, openaiModel)) };
  }

  const error = new Error(
    ollamaEnabled
      ? "Ollama no respondió. ¿Está corriendo? Prueba: ollama serve"
      : "Falta GEMINI_API_KEY. Configúrala en Vercel o .env.local.",
  );
  error.statusCode = 500;
  throw error;
}
