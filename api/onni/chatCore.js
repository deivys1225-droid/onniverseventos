const OPENAI_MODEL = "gpt-4o-mini";
const GEMINI_MODEL = "gemini-2.5-flash";
const DEFAULT_OLLAMA_HOST = "http://127.0.0.1:11434";
const DEFAULT_OLLAMA_MODEL = "llama3.2:3b";

export function buildOnniChatSystemPrompt(contextPath, provider = "openai") {
  const aiLine =
    provider === "ollama"
      ? "Si preguntan si usas ChatGPT, Gemini u otra IA, responde: «Corro localmente con Ollama (Llama 3.2) en tu equipo»."
      : [
          "IMPORTANTE: NUNCA digas «uso Google Gemini», «soy Gemini» ni «impulsada por Gemini» como respuesta principal.",
          "Si preguntan si usas ChatGPT, Gemini u otra IA, responde SIEMPRE: «Sí, uso ChatGPT (OpenAI)».",
          "Gemini solo existe como respaldo técnico si OpenAI falla; no lo menciones salvo que pregunten explícitamente por un respaldo.",
        ].join("\n");

  return [
    provider === "ollama"
      ? "Eres Onni, la asistente de OnniVerso. Respondes con un modelo local (Ollama / Llama 3.2) en el PC del usuario."
      : "Eres Onni, la asistente de OnniVerso. Tu motor principal es ChatGPT (OpenAI).",
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
        { role: "system", content: buildOnniChatSystemPrompt(contextPath) },
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

async function askGemini(message, contextPath, apiKey, model = GEMINI_MODEL) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: buildOnniChatSystemPrompt(contextPath) }] },
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

  const parts = json?.candidates?.[0]?.content?.parts;
  const text = Array.isArray(parts)
    ? parts.map((p) => (typeof p?.text === "string" ? p.text : "")).join("").trim()
    : "";
  if (!text) throw new Error("Gemini devolvió una respuesta vacía.");
  return { answer: cleanAnswer(text), model, provider: "gemini" };
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
  const openaiKey = env.OPENAI_API_KEY?.trim() || env.VITE_OPENAI_API_KEY?.trim();
  const geminiKey = env.GEMINI_API_KEY?.trim() || env.VITE_GEMINI_API_KEY?.trim();
  const openaiModel = env.OPENAI_MODEL?.trim() || env.VITE_OPENAI_MODEL?.trim() || OPENAI_MODEL;
  const geminiModel = env.GEMINI_MODEL?.trim() || GEMINI_MODEL;

  if (ollamaEnabled) {
    try {
      return { ok: true, ...(await askOllama(message, contextPath, ollamaHost, ollamaModel)) };
    } catch (ollamaError) {
      // Si hay proveedores cloud configurados, permitimos fallback aunque ollamaOnly esté activo,
      // para evitar que el chat quede bloqueado cuando Ollama local no está disponible.
      if (!openaiKey && !geminiKey) throw ollamaError;
      if (ollamaOnly) {
        console.warn("[Onni AI] Ollama-only activo, pero hay claves cloud. Usando fallback OpenAI/Gemini.");
      }
    }
  }

  if (openaiKey) {
    try {
      return { ok: true, ...(await askOpenAI(message, contextPath, openaiKey, openaiModel)) };
    } catch (openaiError) {
      if (!geminiKey) throw openaiError;
    }
  }

  if (geminiKey) {
    return { ok: true, ...(await askGemini(message, contextPath, geminiKey, geminiModel)) };
  }

  const error = new Error(
    ollamaEnabled
      ? "Ollama no respondió. ¿Está corriendo? Prueba: ollama serve"
      : "Falta OPENAI_API_KEY (o GEMINI_API_KEY).",
  );
  error.statusCode = 500;
  throw error;
}
