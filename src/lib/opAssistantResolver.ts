import { OP_LOBBY_HINTS, OP_ROUTES, OP_STREAMERS, OP_TEATRO_ROOMS, type OpRouteEntry } from "@/data/opAssistantKnowledge";
import {
  getContextGuide,
  getFavoriteStreamerId,
  getLiveHint,
  getOnniFullHelp,
  getOnniIntroduction,
  getPlatformOverview,
  getWhereAmI,
  listArtistsSample,
  matchOnniFaq,
  ONNI_APK_URL,
  ONNI_SUPPORT_EMAIL,
  resolveFavoriteStreamerFromText,
  sayOnni,
  setFavoriteStreamerId,
} from "@/data/onniBrain";
import type { OpCommand } from "@/lib/opCommandBus";

export type OpResolveResult = {
  command?: OpCommand;
  navigateTo?: string;
  navigateBack?: boolean;
  answer: string;
};

export type OpResolveSession = {
  lastAnswer?: string;
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

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const SHORT_STREAMER_ALIASES = new Set(["mj", "karol"]);

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
    /\b(mp4|mp3|local|reproductor|roproductor|preproductor|carpeta|archivos)\b/.test(text) ||
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

function isInfoQuery(text: string): boolean {
  return (
    /\b(donde estoy|en que pagina|que es esto|que es esta|explicame|explica|ensename|ensename|guia|tutorial)\b/.test(
      text,
    ) ||
    /\b(que puedo hacer aqui|que hago aqui|como funciona esto)\b/.test(text) ||
    /\b(quien eres|que eres|que es onni|que es onniverso)\b/.test(text) ||
    /\b(quien esta en vivo|hay alguien en vivo|esta en vivo)\b/.test(text) ||
    /\b(lista|listar|nombres)\b.*\b(artista|creador|salas)\b/.test(text) ||
    /\b(cancela|cancelar|para|detente|repite|repitelo|otra vez)\b/.test(text) ||
    /\b(gracias|hola|buenas|como estas)\b/.test(text) ||
    /\b(app|apk|soporte|contacto|mux|pantalla negra|diferencia)\b/.test(text)
  );
}

function matchSocial(text: string): OpResolveResult | null {
  if (/\b(gracias|thank)\b/.test(text)) {
    return { answer: sayOnni("De nada. Aquí estoy si necesitas otra cosa en OnniVerso.") };
  }
  if (/\b(hola|buenas|hey|que tal)\b/.test(text) && !/\b(llevame|abre|entra)\b/.test(text)) {
    return { answer: sayOnni("¡Hola! ¿Qué hacemos en OnniVerso? Lobby, conciertos, MP4 local… tú mandas.") };
  }
  if (/\b(como estas|como vas)\b/.test(text)) {
    return { answer: sayOnni("Todo bien por aquí, listo para ayudarte. ¿A dónde vamos?") };
  }
  return null;
}

function matchSession(text: string, session: OpResolveSession): OpResolveResult | null {
  if (/\b(cancela|cancelar|para|detente|stop)\b/.test(text)) {
    return { answer: sayOnni("Listo, paro por aquí. Cuando quieras, dime otra cosa.") };
  }
  if (/\b(repite|repitelo|otra vez|di otra vez)\b/.test(text) && session.lastAnswer) {
    return { answer: session.lastAnswer };
  }
  return null;
}

function matchInfo(text: string, currentPath: string): OpResolveResult | null {
  if (/\b(donde estoy|en que pagina|en que ruta|donde estamos)\b/.test(text)) {
    return { answer: getWhereAmI(currentPath) };
  }

  if (/\b(que es esto|que es esta pantalla|que hago aqui|que puedo hacer aqui)\b/.test(text)) {
    return { answer: getContextGuide(currentPath) };
  }

  if (/\b(ensename|ensename|guia|tutorial|ayudame aqui)\b/.test(text)) {
    return { answer: getContextGuide(currentPath) };
  }

  if (/\b(que es onniverso|mapa del sitio|secciones de la web)\b/.test(text)) {
    return { answer: getPlatformOverview() };
  }

  if (/\b(onniverso|onnivers|onni vers|onni-verso|onnivver|onivvers)\b/.test(text) && /\b(que es|quien es|que hace|para que sirve)\b/.test(text)) {
    return { answer: getPlatformOverview() };
  }

  if (/\b(quien esta en vivo|hay en vivo|alguien en vivo|esta transmitiendo)\b/.test(text)) {
    const live = getLiveHint();
    if (/\b(llevame|lleva|abre|ir)\b/.test(text)) {
      return { navigateTo: "/nuestras-salas", answer: live };
    }
    return { answer: live };
  }

  if (/\b(lista|listar|nombres|cuales)\b.*\b(artista|creador|salas)\b/.test(text)) {
    return { answer: listArtistsSample(12) };
  }

  const faq = matchOnniFaq(text);
  if (faq) return { answer: faq };

  if (/\b(app|apk|descargar app)\b/.test(text) && !/\b(no|sin)\b/.test(text)) {
    return {
      answer: sayOnni(`La app Android está aquí: ${ONNI_APK_URL} — también suele estar en el menú superior.`),
    };
  }

  if (/\b(contacto|soporte|correo)\b/.test(text) && /\b(ir|llevame|abre)\b/.test(text)) {
    return {
      navigateTo: "/contacto",
      answer: sayOnni(`Te llevo a Contacto. También puedes escribir a ${ONNI_SUPPORT_EMAIL}.`),
    };
  }

  return null;
}

function matchFavorite(text: string): OpResolveResult | null {
  if (/\b(mi favorito|favorito es|guarda favorito)\b/.test(text)) {
    const artist = resolveFavoriteStreamerFromText(text);
    if (artist) {
      setFavoriteStreamerId(artist.id);
      return {
        answer: sayOnni(`Listo, guardé a ${artist.name} como tu favorito. Di «llévame a mi favorito» cuando quieras.`),
      };
    }
  }

  if (/\b(mi favorito|a mi favorito|favorito)\b/.test(text) && /\b(llevame|lleva|abre|entra|ir|ve)\b/.test(text)) {
    const id = getFavoriteStreamerId();
    const artist = id ? OP_STREAMERS.find((s) => s.id === id) : null;
    if (artist) {
      return {
        navigateTo: artist.espectadorPath,
        answer: sayOnni(`Te llevo a tu favorito: ${artist.name}.`),
      };
    }
    return { answer: sayOnni('Aún no tienes favorito. Di por ejemplo: «mi favorito es Karol».') };
  }

  return null;
}

function matchBack(text: string): OpResolveResult | null {
  if (/\b(atras|volver|regresa|pagina anterior|ir atras)\b/.test(text)) {
    return { navigateBack: true, answer: sayOnni("Listo, vuelvo a la página anterior.") };
  }
  return null;
}

function matchHomeSocial(text: string): OpResolveResult | null {
  const asksOpen =
    /\b(abre|abrir|llevame|lleva|ir|entra|entrar|ve|vamos|muestrame|mostrar|quiero ver)\b/.test(text) ||
    /\b(youtube|facebook|instagram|tiktok|tik tok|google|mercado play|mercadolibre|whatsapp|onnivers|onni vers)\b/.test(
      text,
    );
  if (!asksOpen) return null;

  if (/\b(youtube|you tube)\b/.test(text)) {
    return { navigateTo: "home-social:youtube", answer: sayOnni("Abro YouTube igual que el icono del inicio.") };
  }
  if (/\b(facebook)\b/.test(text)) {
    return { navigateTo: "home-social:facebook", answer: sayOnni("Abro Facebook igual que el icono del inicio.") };
  }
  if (/\b(instagram)\b/.test(text)) {
    return { navigateTo: "home-social:instagram", answer: sayOnni("Abro Instagram igual que el icono del inicio.") };
  }
  if (/\b(tiktok|tik tok)\b/.test(text)) {
    return { navigateTo: "home-social:tiktok", answer: sayOnni("Abro TikTok igual que el icono del inicio.") };
  }
  if (/\b(google)\b/.test(text)) {
    return { navigateTo: "home-social:google", answer: sayOnni("Abro Google igual que el icono del inicio.") };
  }
  if (/\b(mercado play|mercadolibre)\b/.test(text)) {
    return {
      navigateTo: "home-social:mercadolibre",
      answer: sayOnni("Abro Mercado Play igual que el icono del inicio."),
    };
  }
  if (/\b(whatsapp)\b/.test(text)) {
    return { navigateTo: "home-social:whatsapp", answer: sayOnni("Abro WhatsApp igual que el icono del inicio.") };
  }
  if (/\b(onnivers|onni vers|onniverso)\b/.test(text) && /\b(abr|abre|abrir|ir|entra|lleva|llevame)\b/.test(text)) {
    return { navigateTo: "home-social:onnivers", answer: sayOnni("Abro OnniVers igual que el icono del inicio.") };
  }

  return null;
}

function matchHelp(text: string, currentPath: string): OpResolveResult | null {
  if (
    !/\b(ayuda|help|comandos|que puedes|que sabes|lista)\b/.test(text) &&
    !/\b(que sabes hacer)\b/.test(text)
  ) {
    return null;
  }
  return { answer: getOnniFullHelp(currentPath) };
}

function matchMenu(text: string): OpResolveResult | null {
  if (!/\b(menu|menu de navegacion)\b/.test(text)) return null;
  if (/\b(abr|abre|abrir|despliega|mostrar)\b/.test(text)) {
    return { command: { type: "ui.menu.open" }, answer: sayOnni("Listo, abrí el menú.") };
  }
  if (/\b(cierra|cerrar|oculta|esconde)\b/.test(text)) {
    return { command: { type: "ui.menu.close" }, answer: sayOnni("Listo, cerré el menú.") };
  }
  return { command: { type: "ui.menu.toggle" }, answer: sayOnni("Listo, alterné el menú.") };
}

function matchLobby(text: string, onLobbyPage: boolean): OpResolveResult | null {
  const lobbyContext = onLobbyPage || /\b(lobby|pantalla|gyro|giroscopio|giro)\b/.test(text);
  if (!lobbyContext) return null;

  if (/\b(pantalla|screen)\b/.test(text)) {
    if (/\b(dos|2|segunda)\b/.test(text)) {
      return { command: { type: "lobby.focusScreen", screen: 2 }, answer: sayOnni("Listo, pantalla 2.") };
    }
    if (/\b(tres|3|tercera)\b/.test(text)) {
      return { command: { type: "lobby.focusScreen", screen: 3 }, answer: sayOnni("Listo, pantalla 3.") };
    }
    if (/\b(cuatro|4|cuarta)\b/.test(text)) {
      return { command: { type: "lobby.focusScreen", screen: 4 }, answer: sayOnni("Listo, pantalla 4.") };
    }
    if (/\b(salir|cerrar|quitar|atras)\b/.test(text)) {
      return { command: { type: "lobby.unfocusScreen" }, answer: sayOnni("Listo, salí de la pantalla.") };
    }
  }

  if (/\b(gyro|giroscopio|giro)\b/.test(text) || /\bgirame\b/.test(text)) {
    if (/\b(activar|enciende|prende|habilita|on)\b/.test(text)) {
      return { command: { type: "lobby.gyro.enable" }, answer: sayOnni("Giroscopio activado.") };
    }
    if (/\b(desactivar|apaga|deshabilita|off)\b/.test(text)) {
      return { command: { type: "lobby.gyro.disable" }, answer: sayOnni("Giroscopio desactivado.") };
    }
    if (/\b(recentrar|centrar|recenter|endereza)\b/.test(text)) {
      return { command: { type: "lobby.gyro.recenter" }, answer: sayOnni("Vista recentrada.") };
    }
    return { command: { type: "lobby.gyro.toggle" }, answer: sayOnni("Alterné el giroscopio.") };
  }

  return null;
}

function matchExitEspectador(text: string, currentPath: string): OpResolveResult | null {
  if (!currentPath.startsWith("/sala/espectador/")) return null;
  if (!/\b(salir|sal|volver|atras|ir a|llevame|lleva)\b/.test(text)) return null;
  if (/\b(sala|espectador|vivo|live)\b/.test(text) || isGenericVideoIntent(text)) {
    const conciertos = OP_ROUTES.find((r) => r.id === "conciertos");
    if (conciertos) {
      return {
        navigateTo: conciertos.path,
        answer: sayOnni("Salimos de esta sala y vamos a Conciertos Live."),
      };
    }
  }
  return null;
}

function matchLocalReproductor(text: string): OpResolveResult | null {
  const route = OP_ROUTES.find((r) => r.id === "reproductor");
  if (!route) return null;

  const explicitLocal =
    /\b(mp4|mp3)\b/.test(text) ||
    /\b(video local|videos locales|archivos mp4|archivo mp4)\b/.test(text) ||
    /\b(local|locales|mi carpeta|carpeta|archivo|archivos|dispositivo|galeria reproductor|reproductor galeria)\b/.test(
      text,
    ) ||
    /\b(reproductor|roproductor|preproductor|player)\b/.test(text);

  const hit = findLongestAliasMatch(text, [route]);
  if (!hit && !explicitLocal) return null;

  if (/\b(concierto|conciertos|live|en vivo|espectador|sala de|artista)\b/.test(text) && !/\b(local|mp4|mp3|reproductor|carpeta)\b/.test(text)) {
    return null;
  }

  if (hit || explicitLocal) {
    return {
      navigateTo: route.path,
      answer: sayOnni("Te llevo al Reproductor local: elige carpeta con MP3 o MP4."),
    };
  }

  return null;
}

function matchGenericVideoToConciertos(text: string): OpResolveResult | null {
  if (/\b(mp4|mp3|local|locales|reproductor|carpeta|archivos)\b/.test(text)) return null;

  const wantsVideo = /\b(video|videos)\b/.test(text);
  if (!wantsVideo) return null;

  const hasNavIntent =
    /\b(abre|abrir|ver|muestra|mostrar|quiero ver|pon|ponme|llevame|lleva|entra|entrar)\b/.test(text) ||
    /\b(un|el|los|las)\s+(video|videos)\b/.test(text);

  if (!hasNavIntent) return null;
  if (findLongestAliasMatch(text, OP_STREAMERS)) return null;

  const conciertos = OP_ROUTES.find((r) => r.id === "conciertos");
  if (!conciertos) return null;

  return {
    navigateTo: conciertos.path,
    answer: sayOnni("Te llevo a Conciertos Live para elegir sala o video en vivo."),
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
    return { navigateTo: teatro.path, answer: sayOnni(`Te llevo al teatro: ${teatro.title}.`) };
  }

  if (wantsPodcast) {
    return {
      navigateTo: item.podcastPath,
      answer: sayOnni(`Te llevo al podcast de ${item.name}.`),
    };
  }

  if (wantsVideo || namesArtistOnly) {
    return {
      navigateTo: item.espectadorPath,
      answer: sayOnni(`Te llevo a la sala de ${item.name} (${item.immersiveSalaName}).`),
    };
  }

  return null;
}

function matchTeatro(text: string): OpResolveResult | null {
  const hit = findLongestAliasMatch(text, OP_TEATRO_ROOMS);
  if (!hit) return null;
  if (!/\b(teatro|stand|comedia|sala)\b/.test(text) && !hit.alias.includes(" ")) {
    const streamerHit = OP_STREAMERS.some((s) => s.id === hit.item.id && text.includes(hit.alias));
    if (streamerHit) return null;
  }
  return { navigateTo: hit.item.path, answer: sayOnni(`Te llevo al teatro: ${hit.item.title}.`) };
}

function matchRoute(text: string): OpResolveResult | null {
  const core = stripNavVerbs(text) || text;
  const hit = findLongestAliasMatch(core, OP_ROUTES);
  if (!hit) return null;
  const route = hit.item as OpRouteEntry;
  return { navigateTo: route.path, answer: sayOnni(`Te llevo a ${route.label}.`) };
}

function matchQuickActions(text: string): OpResolveResult | null {
  return null;
}

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
    answer: sayOnni(
      "Eso suena a video en general — te mando a Conciertos Live. Para MP4 de tu carpeta di «reproductor mp4».",
    ),
  };
}

function fallback(text: string): OpResolveResult {
  if (/\b(mp4|mp3|local|reproductor|roproductor|preproductor|carpeta)\b/.test(text)) {
    const route = OP_ROUTES.find((r) => r.id === "reproductor");
    if (route) {
      return {
        navigateTo: route.path,
        answer: sayOnni("Creo que quieres el Reproductor local (MP3/MP4 de tu carpeta). Te llevo."),
      };
    }
  }

  return {
    answer: sayOnni(
      'No pillé eso. Prueba: «¿dónde estoy?», «reproductor mp4», «conciertos», «lobby» o «ayuda».',
    ),
  };
}

export function resolveOpCommand(
  textRaw: string,
  currentPath: string,
  session: OpResolveSession = {},
): OpResolveResult {
  const text = normalize(textRaw);
  if (!text) {
    return {
      answer: sayOnni('Escribe aquí. Ejemplo: «¿dónde estoy?» o «llévame al lobby».'),
    };
  }

  const social = matchSocial(text);
  if (social) return social;

  const sessionCmd = matchSession(text, session);
  if (sessionCmd) return sessionCmd;

  const back = matchBack(text);
  if (back) return back;

  const info = matchInfo(text, currentPath);
  if (info) return info;

  const favorite = matchFavorite(text);
  if (favorite) return favorite;

  const help = matchHelp(text, currentPath);
  if (help) return help;

  const menu = matchMenu(text);
  if (menu) return menu;

  const homeSocial = matchHomeSocial(text);
  if (homeSocial) return homeSocial;

  const exitSala = matchExitEspectador(text, currentPath);
  if (exitSala) return exitSala;

  const lobby = matchLobby(text, currentPath.startsWith("/lobby-inmersivo"));
  if (lobby) return lobby;

  if (isInfoQuery(text)) {
    const faq = matchOnniFaq(text);
    if (faq) return { answer: faq };
    return { answer: getContextGuide(currentPath) };
  }

  const localPlayer = matchLocalReproductor(text);
  if (localPlayer) return avoidEspectadorLoop(localPlayer, text, currentPath);

  const genericVideo = matchGenericVideoToConciertos(text);
  if (genericVideo) return avoidEspectadorLoop(genericVideo, text, currentPath);

  const quick = matchQuickActions(text);
  if (quick) return avoidEspectadorLoop(quick, text, currentPath);

  const streamer = matchStreamer(text);
  if (streamer) return avoidEspectadorLoop(streamer, text, currentPath);

  const teatro = matchTeatro(text);
  if (teatro) return teatro;

  const route = matchRoute(text);
  if (route) return avoidEspectadorLoop(route, text, currentPath);

  return fallback(text);
}

export function getOpAssistantHint(currentPath: string): string {
  if (currentPath.startsWith("/lobby-inmersivo")) {
    return 'Di: "pantalla 1", "giroscopio", "¿dónde estoy?", "lobby".';
  }
  if (currentPath.startsWith("/sala/espectador")) {
    return 'Di: "salir a conciertos", "reproductor mp4", "¿qué es esto?".';
  }
  return 'Di: "conciertos", "¿dónde estoy?", "ayuda", "lobby".';
}

export { getOnniIntroduction };
