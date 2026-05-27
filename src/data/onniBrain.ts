import { OP_LOBBY_HINTS, OP_ROUTES, OP_STREAMERS } from "@/data/opAssistantKnowledge";

import { APP_APK_DOWNLOAD_URL } from "@/config/appDownload";

export const ONNI_APK_URL = APP_APK_DOWNLOAD_URL;

export const ONNI_SUPPORT_EMAIL = "gerencia@onniverso.com";

export const ONNI_FAVORITE_STORAGE_KEY = "onniverso.onni.favoriteStreamerId";

/** Cómo habla Onni (alineado a cómo trabajamos contigo en el proyecto). */
export const ONNI_PERSONALITY = {
  tone: "Cercano, claro y directo. Tú. Sin formalidad excesiva. Frases cortas.",
  traits: [
    "Explica en pasos cuando algo es técnico (Mux, MP4 local, lobby).",
    "Si no sabe ejecutar algo, lo dice sin inventar.",
    "Puede usar: listo, dale, mira, tranquilo — sin pasarse.",
    "Recuerda que OnniVerso es VR, salas, conciertos y experiencias inmersivas.",
    "No abre páginas de internet externas; solo ayuda dentro de OnniVerso.",
  ],
} as const;

export function getOnniIntroduction(): string {
  return [
    "¡Hola! Soy Onni, tu copiloto en OnniVerso.",
    "Te ayudo por texto con lobby, salas, conciertos, MP4 local, menú y dudas.",
    'Escribe aquí, por ejemplo: «llévame al lobby», «¿dónde estoy?» o «ayuda».',
  ].join("\n");
}

type FaqEntry = {
  id: string;
  patterns: RegExp[];
  answer: string;
};

export const ONNI_FAQ: FaqEntry[] = [
  {
    id: "quien-eres",
    patterns: [/\b(quien eres|que eres|que es onni|quien es onni)\b/],
    answer:
      "Soy Onni: el asistente de texto de OnniVerso. Te ubico en la app, respondo dudas y ejecuta comandos dentro del sitio (lobby, salas, menú…). No soy Google ni abro la web por fuera.",
  },
  {
    id: "como-voz",
    patterns: [/\b(como (te )?activo|usar) (la )?voz\b/, /\bcomo hablar contigo\b/, /\bpalabra onni\b/],
    answer:
      "Por ahora trabajo solo por texto en el chat (la voz la mejoraremos después). Escribe tu pedido: «llévame al lobby», «reproductor mp4», «abre el menú».",
  },
  {
    id: "mux-negro",
    patterns: [
      /\b(pantalla negra|sin video|no se ve|no hay video)\b/,
      /\b(mux|playback id|sin transmision)\b/,
    ],
    answer:
      "Si la sala en vivo se ve negra, casi siempre es porque nadie está transmitiendo por Mux en este momento. No es el reproductor MP4 de tu carpeta. Prueba Conciertos Live o vuelve más tarde; el emisor debe iniciar desde la sala emisor.",
  },
  {
    id: "mp4-vs-live",
    patterns: [
      /\b(diferencia|diferencias)\b.*\b(mp4|local|vivo|live)\b/,
      /\b(mp4|local)\b.*\b(concierto|vivo|live)\b/,
    ],
    answer:
      "MP4/local = archivos tuyos en el dispositivo (reproductor de galería). Vivo/Live = salas con stream (Mux/Agora). Si quieres tu película o carpeta: di «reproductor mp4». Si quieres artistas en vivo: «conciertos».",
  },
  {
    id: "que-es-onniverso",
    patterns: [/\b(que es onniverso|que es este sitio|que es esta pagina)\b/],
    answer:
      "OnniVerso es la plataforma inmersiva de Empresa Tecnológica de Colombia: Mi Mundo, lobbies 3D, Conciertos Live, aula virtual, podcasts, teatro, tienda y comunidad. Tú entras, eliges experiencia y navegas en 360 o salas en vivo.",
  },
  {
    id: "app-android",
    patterns: [/\b(app|apk|android|celular|movil|descargar)\b/],
    answer: `También hay app Android. En el menú superior suele estar el enlace de descarga, o pide «abre la app» y te paso el enlace: ${ONNI_APK_URL}`,
  },
  {
    id: "soporte",
    patterns: [/\b(soporte|ayuda tecnica|problema|no funciona|bug)\b/],
    answer: `Para soporte humano: página Contacto en la app o escribe a ${ONNI_SUPPORT_EMAIL}. Yo te guío con lo básico; lo complejo lo ve el equipo.`,
  },
  {
    id: "gemini-ia",
    patterns: [/\b(gemini|chatgpt|openai|ia externa)\b/],
    answer:
      "Por ahora yo funciono con reglas y conocimiento de OnniVerso (rápido y sin costo). Más adelante se puede conectar una IA externa; hoy no la uso.",
  },
  {
    id: "favorito",
    patterns: [/\b(favorito|favorita|mi artista)\b/],
    answer:
      'Di: «mi favorito es Karol» (o el artista que quieras). Luego «llévame a mi favorito» y te mando a esa sala.',
  },
];

type PathGuide = {
  test: (path: string) => boolean;
  title: string;
  tips: string[];
  commands: string[];
};

const PATH_GUIDES: PathGuide[] = [
  {
    test: (p) => p === "/" || p.startsWith("/inicio"),
    title: "Inicio / Mi Mundo",
    tips: ["Aquí está tu perfil VR y acceso rápido a experiencias.", "Abre el menú (☰) para ver todas las secciones."],
    commands: ["lobby", "conciertos", "reproductor mp4", "aula", "tienda"],
  },
  {
    test: (p) => p.startsWith("/nuestras-salas"),
    title: "Conciertos Live",
    tips: [
      "Tarjetas de creadores y salas. Toca una para entrar si hay stream.",
      "Si no hay vivo, la sala puede verse vacía o con mensaje de Mux.",
    ],
    commands: ["video de Karol", "lobby", "menú"],
  },
  {
    test: (p) => p.startsWith("/sala/espectador"),
    title: "Sala en vivo (espectador)",
    tips: [
      "Estás viendo una sala con reproductor Mux.",
      "Pantalla negra = el emisor aún no conectó la transmisión.",
    ],
    commands: ["salir a conciertos", "reproductor mp4", "lobby", "¿dónde estoy?"],
  },
  {
    test: (p) => p.startsWith("/lobby-inmersivo"),
    title: "Lobby inmersivo",
    tips: ["Sala 3D con pantallas en las paredes.", "Puedes enfocar pantalla 1, 2 o 3 y usar giroscopio."],
    commands: [...OP_LOBBY_HINTS],
  },
  {
    test: (p) => p.startsWith("/reproductor-galeria"),
    title: "Reproductor local MP3/MP4",
    tips: [
      "Elige una carpeta de tu dispositivo.",
      "Esto NO es Conciertos Live: son tus archivos locales.",
    ],
    commands: ["conciertos", "lobby", "menú"],
  },
  {
    test: (p) => p.startsWith("/aula-virtual"),
    title: "Aula Virtual 3D",
    tips: ["Lobby educativo caminable.", "En menú también está la tarjeta del aula en Galería 3D."],
    commands: ["lobby", "galería", "inicio"],
  },
  {
    test: (p) => p.startsWith("/comunidad"),
    title: "Comunidad / Chat",
    tips: ["Mensajes y amigos de la comunidad OnniVerso."],
    commands: ["inicio", "conciertos", "menú"],
  },
  {
    test: (p) => p.startsWith("/tienda"),
    title: "Tienda",
    tips: ["Productos y pagos de la plataforma."],
    commands: ["inicio", "menú"],
  },
];

export function matchOnniFaq(text: string): string | null {
  for (const faq of ONNI_FAQ) {
    if (faq.patterns.some((re) => re.test(text))) return faq.answer;
  }
  return null;
}

export function getWhereAmI(path: string): string {
  const guide = PATH_GUIDES.find((g) => g.test(path));
  const route = OP_ROUTES.find((r) => path === r.path || path.startsWith(r.path + "/"));

  if (path.startsWith("/sala/espectador/")) {
    const channel = decodeURIComponent(path.split("/").pop() ?? "");
    const artist = OP_STREAMERS.find((s) => s.espectadorPath.includes(encodeURIComponent(channel)));
    return sayOnni(
      `Estás en una sala en vivo${artist ? ` de ${artist.name}` : ""} (canal ${channel}). Si ves pantalla negra, el emisor no ha iniciado Mux todavía.`,
    );
  }

  if (guide) {
    return sayOnni(
      `Estás en: ${guide.title}.\n${guide.tips.join(" ")}\nAquí puedes decir: ${guide.commands.slice(0, 4).join(", ")}.`,
    );
  }

  if (route) {
    return sayOnni(`Estás en: ${route.label}. ${route.description}`);
  }

  return sayOnni(`Estás en la ruta ${path}. Di "ayuda" para ver qué puedes hacer aquí.`);
}

export function getContextGuide(path: string): string {
  const guide = PATH_GUIDES.find((g) => g.test(path));
  if (!guide) {
    return sayOnni(getOnniFullHelp(path));
  }
  return sayOnni(
    [
      `En ${guide.title}:`,
      ...guide.tips.map((t) => `• ${t}`),
      "",
      "Prueba decir:",
      ...guide.commands.map((c) => `• "${c}"`),
    ].join("\n"),
  );
}

export function getOnniFullHelp(path: string): string {
  const sections = [
    "Puedo llevarte por OnniVerso (lobby, conciertos, aula, tienda, comunidad…).",
    "MP4/MP3 local → reproductor de galería. Vivo → conciertos o «video de [artista]».",
    "Pregúntame: ¿dónde estoy?, ¿qué es esto?, favorito, app Android, soporte.",
    "Escribe en el chat de Onni (voz desactivada por ahora).",
    "No abro sitios externos de internet; solo la app OnniVerso.",
  ];
  if (path.startsWith("/lobby-inmersivo")) {
    sections.push(`En lobby: ${OP_LOBBY_HINTS.join(", ")}.`);
  }
  return sections.join("\n");
}

export function getPlatformOverview(): string {
  const sections = OP_ROUTES.filter((r) => !["privacidad", "terminos"].includes(r.id))
    .slice(0, 14)
    .map((r) => `• ${r.label}: ${r.description}`);
  return sayOnni(
    ["OnniVerso en pocas palabras:", ...sections, "", "Di el nombre de la sección y te llevo, por ejemplo: «lobby» o «conciertos»."].join(
      "\n",
    ),
  );
}

export function listArtistsSample(limit = 10): string {
  const names = OP_STREAMERS.slice(0, limit).map((s) => s.name);
  return sayOnni(
    `Algunos artistas en la app: ${names.join(", ")}${OP_STREAMERS.length > limit ? "…" : ""}. Di «video de [nombre]» para entrar a su sala.`,
  );
}

export function getLiveHint(): string {
  return sayOnni(
    "Para ver quién está en vivo, ve a Conciertos Live y busca tarjetas con indicador EN VIVO. Si una sala está negra, el stream aún no empezó. ¿Te llevo a conciertos?",
  );
}

export function sayOnni(message: string): string {
  return message.trim();
}

export function getFavoriteStreamerId(): string | null {
  try {
    return localStorage.getItem(ONNI_FAVORITE_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setFavoriteStreamerId(id: string) {
  try {
    localStorage.setItem(ONNI_FAVORITE_STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
}

export function resolveFavoriteStreamerFromText(text: string): (typeof OP_STREAMERS)[0] | null {
  let best: { item: (typeof OP_STREAMERS)[0]; alias: string } | null = null;
  for (const item of OP_STREAMERS) {
    for (const alias of item.aliases) {
      const a = alias.trim();
      if (a.length < 3) continue;
      const re = a.includes(" ") ? null : new RegExp(`\\b${a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      const matches = re ? re.test(text) : text.includes(a);
      if (!matches) continue;
      if (!best || a.length > best.alias.length) best = { item, alias: a };
    }
  }
  return best?.item ?? null;
}
