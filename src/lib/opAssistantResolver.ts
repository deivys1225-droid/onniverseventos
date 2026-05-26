import {
  getOpAssistantHelpText,
  OP_LOBBY_HINTS,
  OP_ROUTES,
  OP_STREAMERS,
  OP_TEATRO_ROOMS,
  type OpRouteEntry,
} from "@/data/opAssistantKnowledge";
import type { OpCommand } from "@/lib/opCommandBus";

export type OpResolveResult = {
  command?: OpCommand;
  navigateTo?: string;
  answer: string;
};

const NAV_VERBS =
  /\b(llevame|lleva|llevar|ir|ve|vamos|entra|entrar|abre|abrir|muestrame|mostrar|quiero ver|ponme en|ir a|voy a)\b/g;

function normalize(input: string) {
  return input
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{L}\p{N}\s#/-]/gu, " ");
}

function stripNavVerbs(text: string) {
  return text.replace(NAV_VERBS, " ").replace(/\s+/g, " ").trim();
}

function wantsHelp(text: string) {
  return (
    /\b(ayuda|help)\b/.test(text) ||
    /\bque puedes\b/.test(text) ||
    /\bque sabes\b/.test(text) ||
    /\bcomandos\b/.test(text) ||
    /\blista\b/.test(text)
  );
}

function matchMenu(text: string): OpResolveResult | null {
  if (!/\b(menu|menu de navegacion)\b/.test(text)) return null;
  if (/\b(abr|abre|abrir|despliega|mostrar)\b/.test(text)) {
    return { command: { type: "ui.menu.open" }, answer: "Listo: abrí el menú de navegación." };
  }
  if (/\b(cierra|cerrar|oculta|esconde)\b/.test(text)) {
    return { command: { type: "ui.menu.close" }, answer: "Listo: cerré el menú." };
  }
  return { command: { type: "ui.menu.toggle" }, answer: "Listo: alterné el menú." };
}

function matchLobby(text: string, onLobbyPage: boolean): OpResolveResult | null {
  const lobbyContext = onLobbyPage || /\b(lobby|pantalla|gyro|giroscopio|giro)\b/.test(text);
  if (!lobbyContext) return null;

  if (/\b(pantalla|screen)\b/.test(text)) {
    if (/\b(uno|1|primera)\b/.test(text)) {
      return { command: { type: "lobby.focusScreen", screen: 1 }, answer: "Listo: pantalla 1 enfocada." };
    }
    if (/\b(dos|2|segunda)\b/.test(text)) {
      return { command: { type: "lobby.focusScreen", screen: 2 }, answer: "Listo: pantalla 2 enfocada." };
    }
    if (/\b(tres|3|tercera)\b/.test(text)) {
      return { command: { type: "lobby.focusScreen", screen: 3 }, answer: "Listo: pantalla 3 enfocada." };
    }
    if (/\b(salir|cerrar|quitar|atras)\b/.test(text)) {
      return { command: { type: "lobby.unfocusScreen" }, answer: "Listo: salí de la pantalla." };
    }
  }

  if (/\b(gyro|giroscopio|giro)\b/.test(text) || /\bgirame\b/.test(text)) {
    if (/\b(activar|enciende|prende|habilita|on)\b/.test(text)) {
      return { command: { type: "lobby.gyro.enable" }, answer: "Listo: giroscopio activado." };
    }
    if (/\b(desactivar|apaga|deshabilita|off)\b/.test(text)) {
      return { command: { type: "lobby.gyro.disable" }, answer: "Listo: giroscopio desactivado." };
    }
    if (/\b(recentrar|centrar|recenter|endereza)\b/.test(text)) {
      return { command: { type: "lobby.gyro.recenter" }, answer: "Listo: vista recentrada." };
    }
    return { command: { type: "lobby.gyro.toggle" }, answer: "Listo: alterné el giroscopio." };
  }

  return null;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const SHORT_STREAMER_ALIASES = new Set(["mj", "karol"]);

/** Nombres genéricos de sala/país — no abren espectador sin “de {artista}”. */
const GENERIC_STREAMER_ALIASES = new Set([
  "colombia",
  "mexico",
  "peru",
  "usa",
  "puerto rico",
  "reggaeton live",
  "trap live",
  "tejano live",
  "473 music",
  "f1 er",
  "everest 360",
  "gopro 360",
  "vr 360",
  "escenario neural",
  "regional mexicano",
  "er",
  "live",
]);

function isGenericVideoIntent(text: string): boolean {
  return (
    /\b(mp4|mp3|local|reproductor|carpeta|archivos)\b/.test(text) ||
    /\b(video local|videos locales)\b/.test(text) ||
    (/\b(video|videos)\b/.test(text) &&
      !/\b(de|del)\s+[a-z0-9]/i.test(text) &&
      !/\b(karol|shakira|bad bunny|j balvin|luisito|franco|michael|bichota|cuantica)\b/i.test(text))
  );
}

function hasNamedStreamerIntent(text: string, alias: string): boolean {
  const a = alias.trim();
  if (GENERIC_STREAMER_ALIASES.has(a)) {
    return new RegExp(`\\bde\\s+${escapeRegExp(a)}\\b`, "i").test(text);
  }
  if (a.includes(" ")) return true;
  if (SHORT_STREAMER_ALIASES.has(a)) return true;
  if (a.length >= 4) return true;
  return false;
}

function matchExitEspectador(text: string, currentPath: string): OpResolveResult | null {
  if (!currentPath.startsWith("/sala/espectador/")) return null;
  if (!/\b(salir|sal|volver|atras|ir a|llevame|lleva)\b/.test(text)) return null;
  if (/\b(sala|espectador|vivo|live)\b/.test(text) || isGenericVideoIntent(text)) {
    const conciertos = OP_ROUTES.find((r) => r.id === "conciertos");
    if (conciertos) {
      return {
        navigateTo: conciertos.path,
        answer: "Salgo de esta sala y te llevo a Conciertos Live para elegir otra.",
      };
    }
  }
  return null;
}

/** Evita falsos positivos (ej. "er" dentro de otra palabra). */
function aliasMatchesText(text: string, alias: string): boolean {
  const a = alias.trim();
  if (a.length < 3 && !SHORT_STREAMER_ALIASES.has(a)) return false;
  if (a.includes(" ")) return text.includes(a);
  return new RegExp(`\\b${escapeRegExp(a)}\\b`, "i").test(text);
}

function findLongestAliasMatch<T extends { aliases: string[] }>(
  text: string,
  items: T[],
): { item: T; alias: string } | null {
  let best: { item: T; alias: string } | null = null;
  for (const item of items) {
    for (const alias of item.aliases) {
      const a = alias.trim();
      if (!aliasMatchesText(text, a)) continue;
      if (!best || a.length > best.alias.length) {
        best = { item, alias: a };
      }
    }
  }
  return best;
}

/** Reproductor de carpeta local MP3/MP4 (menú: REPRODUCTOR LOCAL). */
function matchLocalReproductor(text: string): OpResolveResult | null {
  const route = OP_ROUTES.find((r) => r.id === "reproductor");
  if (!route) return null;

  const explicitLocal =
    /\b(mp4|mp3)\b/.test(text) ||
    /\b(video local|videos locales|archivos mp4|archivo mp4)\b/.test(text) ||
    /\b(local|locales|mi carpeta|carpeta|archivo|archivos|dispositivo|galeria reproductor|reproductor galeria)\b/.test(
      text,
    ) ||
    /\b(reproductor|player)\b/.test(text);

  const hit = findLongestAliasMatch(text, [route]);
  if (!hit && !explicitLocal) return null;

  if (/\b(concierto|conciertos|live|en vivo|espectador|sala de|artista)\b/.test(text) && !/\b(local|mp4|mp3|reproductor|carpeta)\b/.test(text)) {
    return null;
  }

  if (hit || explicitLocal) {
    return {
      navigateTo: route.path,
      answer: "Te llevo al Reproductor local: elige una carpeta con MP3 o MP4 y reprodúcela.",
    };
  }

  return null;
}

/** "Abre un video" sin artista → Conciertos Live, no una sala al azar. */
function matchGenericVideoToConciertos(text: string): OpResolveResult | null {
  if (/\b(mp4|mp3|local|locales|reproductor|carpeta|archivos)\b/.test(text)) return null;

  const wantsVideo = /\b(video|videos)\b/.test(text);
  if (!wantsVideo) return null;

  const hasNavIntent =
    /\b(abre|abrir|ver|muestra|mostrar|quiero ver|pon|ponme|llevame|lleva|entra|entrar)\b/.test(text) ||
    /\b(un|el|los|las)\s+(video|videos)\b/.test(text);

  if (!hasNavIntent) return null;

  const streamerHit = findLongestAliasMatch(text, OP_STREAMERS);
  if (streamerHit) return null;

  const conciertos = OP_ROUTES.find((r) => r.id === "conciertos");
  if (!conciertos) return null;

  return {
    navigateTo: conciertos.path,
    answer: "Te llevo a Conciertos Live para elegir una sala o video en vivo.",
  };
}

function matchStreamer(text: string): OpResolveResult | null {
  const hit = findLongestAliasMatch(text, OP_STREAMERS);
  if (!hit || !hasNamedStreamerIntent(text, hit.alias)) return null;

  const wantsPodcast = /\b(podcast|lounge|esferico|esfera)\b/.test(text);
  const wantsTeatro = /\b(teatro|standup|stand up|comedia)\b/.test(text);
  const wantsVideo =
    /\b(video|videos|vivo|live|stream|sala|concierto|espectador|mirar|escuchar)\b/.test(text) ||
    /\b(entra|entrar|abre|abrir|ver)\b/.test(text);
  const namesArtistOnly =
    !wantsVideo && !wantsPodcast && !wantsTeatro && hasNamedStreamerIntent(text, hit.alias);

  const { item } = hit;
  const teatro = OP_TEATRO_ROOMS.find((t) => t.id === item.id);

  if (wantsTeatro && teatro) {
    return {
      navigateTo: teatro.path,
      answer: `Te llevo al teatro: ${teatro.title}.`,
    };
  }

  if (wantsPodcast) {
    return {
      navigateTo: item.podcastPath,
      answer: `Te llevo al podcast / sala de ${item.name}.`,
    };
  }

  if (wantsVideo || namesArtistOnly) {
    return {
      navigateTo: item.espectadorPath,
      answer: `Te llevo a la sala en vivo de ${item.name} (${item.immersiveSalaName}).`,
    };
  }

  return null;
}

/** Si ya estás en espectador y pides video genérico, no reentrar a la misma sala. */
function avoidEspectadorLoop(result: OpResolveResult, text: string, currentPath: string): OpResolveResult {
  if (!currentPath.startsWith("/sala/espectador/")) return result;
  if (!result.navigateTo?.startsWith("/sala/espectador/")) return result;
  if (!isGenericVideoIntent(text)) return result;

  const local = matchLocalReproductor(text);
  if (local) return local;

  const conciertos = matchGenericVideoToConciertos(text);
  if (conciertos) return conciertos;

  const route = OP_ROUTES.find((r) => r.id === "conciertos");
  return {
    navigateTo: route?.path ?? "/nuestras-salas",
    answer:
      "Esa frase es para ver videos en general. Te llevo a Conciertos Live (no a la misma sala de Karol). Para MP4 local di “reproductor mp4”.",
  };
}

function matchTeatro(text: string): OpResolveResult | null {
  const hit = findLongestAliasMatch(text, OP_TEATRO_ROOMS);
  if (!hit) return null;
  if (!/\b(teatro|stand|comedia|sala)\b/.test(text) && !hit.alias.includes(" ")) {
    const streamerHit = OP_STREAMERS.some((s) => s.id === hit.item.id && text.includes(hit.alias));
    if (streamerHit) return null;
  }
  return {
    navigateTo: hit.item.path,
    answer: `Te llevo al teatro: ${hit.item.title}.`,
  };
}

function matchRoute(text: string): OpResolveResult | null {
  const core = stripNavVerbs(text) || text;
  const hit = findLongestAliasMatch(core, OP_ROUTES);
  if (!hit) return null;
  const route = hit.item as OpRouteEntry;
  return {
    navigateTo: route.path,
    answer: `Te llevo a ${route.label}.`,
  };
}

function fallback(text: string): OpResolveResult {
  const mentionsLocal =
    /\b(mp4|mp3|local|reproductor|carpeta|archivo)\b/.test(text) ||
    /\b(video local|mis videos)\b/.test(text);
  if (mentionsLocal) {
    const route = OP_ROUTES.find((r) => r.id === "reproductor");
    if (route) {
      return {
        navigateTo: route.path,
        answer:
          "Creo que buscas el Reproductor local (MP3/MP4): eliges una carpeta en tu dispositivo y reproduces archivos. Te llevo allí.",
      };
    }
  }

  const suggestions = OP_ROUTES.slice(0, 6).map((r) => r.aliases[0]).join(", ");
  return {
    answer: `No encontré esa acción. Prueba: ${suggestions}, “reproductor mp4”, o “entra al video de Karol”. Escribe “ayuda” para ver más.`,
  };
}

export function resolveOpCommand(textRaw: string, currentPath: string): OpResolveResult {
  const text = normalize(textRaw);
  if (!text) {
    return { answer: "Escribe qué quieres hacer, por ejemplo: “llévame al lobby” o “entra al video de Karol”." };
  }

  if (wantsHelp(text)) {
    const lobbyExtra = currentPath.startsWith("/lobby-inmersivo")
      ? `\n\nEn este lobby: ${OP_LOBBY_HINTS.join(", ")}.`
      : "";
    return { answer: `${getOpAssistantHelpText()}${lobbyExtra}` };
  }

  const menu = matchMenu(text);
  if (menu) return menu;

  const exitSala = matchExitEspectador(text, currentPath);
  if (exitSala) return exitSala;

  const lobby = matchLobby(text, currentPath.startsWith("/lobby-inmersivo"));
  if (lobby) return lobby;

  const localPlayer = matchLocalReproductor(text);
  if (localPlayer) return avoidEspectadorLoop(localPlayer, text, currentPath);

  const genericVideo = matchGenericVideoToConciertos(text);
  if (genericVideo) return avoidEspectadorLoop(genericVideo, text, currentPath);

  const streamer = matchStreamer(text);
  if (streamer) return avoidEspectadorLoop(streamer, text, currentPath);

  const teatro = matchTeatro(text);
  if (teatro) return teatro;

  const route = matchRoute(text);
  if (route) return avoidEspectadorLoop(route, text, currentPath);

  return fallback(text);
}

/** Ejemplos dinámicos según la página actual. */
export function getOpAssistantHint(currentPath: string): string {
  if (currentPath.startsWith("/lobby-inmersivo")) {
    return "Lobby: “pantalla 1”, “giroscopio”, “recentrar”, “inicio”, “Karol”.";
  }
  if (currentPath.startsWith("/sala/espectador")) {
    return "Estás en una sala en vivo. Prueba: “salir a conciertos”, “reproductor mp4”, “lobby”.";
  }
  return "Ej: “conciertos”, “reproductor mp4”, “abre un video”, “lobby”, “ayuda”.";
}
