import { GALERIA_AULA_CARD_HASH, GALERIA_AULA_SECTION_PATH } from "@/lib/aulaVirtual";
import { buildAgoraChannel } from "@/lib/agoraRooms";
import { podcastStreamers } from "@/data/podcastStreamers";

/** Destino navegable del sitio (rutas fijas). */
export type OpRouteEntry = {
  id: string;
  path: string;
  label: string;
  description: string;
  aliases: string[];
  /** Si true, la ruta exige sesión (PrivateRoute). */
  requiresAuth?: boolean;
};

/** Artista / sala en Conciertos Live o Podcast. */
export type OpStreamerEntry = {
  id: string;
  name: string;
  immersiveSalaName: string;
  aliases: string[];
  espectadorPath: string;
  podcastPath: string;
};

export type OpLobbyScreen = 1 | 2 | 3;

/** Rutas públicas y privadas registradas en App.tsx + menú navbar. */
export const OP_ROUTES: OpRouteEntry[] = [
  {
    id: "entrar",
    path: "/entrar",
    label: "Entrar",
    description: "Pantalla de bienvenida para acceso y registro.",
    aliases: ["entrar", "login", "iniciar sesion", "acceder", "welcome"],
  },
  {
    id: "registro",
    path: "/registro",
    label: "Registro",
    description: "Formulario para crear cuenta.",
    aliases: ["registro", "registrarme", "crear cuenta", "signup", "inscribirme"],
  },
  {
    id: "auth",
    path: "/auth",
    label: "Autenticación",
    description: "Pantalla de autenticación alternativa.",
    aliases: ["auth", "autenticacion", "autenticar"],
  },
  {
    id: "actualizar-contrasena",
    path: "/actualizar-contrasena",
    label: "Actualizar contraseña",
    description: "Pantalla para cambiar contraseña.",
    aliases: ["actualizar contrasena", "cambiar contrasena", "reset password"],
  },
  {
    id: "inicio",
    path: "/",
    label: "Inicio (Mi Mundo)",
    description: "Pantalla principal con perfil VR tras iniciar sesión.",
    aliases: ["inicio", "home", "principal", "mi mundo", "mimundo", "perfil vr"],
    requiresAuth: true,
  },
  {
    id: "landing",
    path: "/inicio-2",
    label: "OnniVerso (landing)",
    description: "Página pública de presentación con hero y SEO.",
    aliases: ["onniverso", "landing", "presentacion", "pagina principal publica"],
  },
  {
    id: "conciertos",
    path: "/nuestras-salas",
    label: "Conciertos Live",
    description: "Cuadrícula de salas de creadores en vivo.",
    aliases: [
      "conciertos",
      "concierto",
      "conciertos live",
      "nuestras salas",
      "salas",
      "live",
      "creadores",
      "video",
      "videos",
      "ver video",
      "ver videos",
      "abrir video",
      "abrir videos",
      "abre video",
      "abre videos",
    ],
    requiresAuth: true,
  },
  {
    id: "conciertos-config",
    path: "/conciertos-live/config",
    label: "Configurar concierto",
    description: "Configuración de sala premium / stream.",
    aliases: ["configurar concierto", "config concierto", "premium conciertos"],
    requiresAuth: true,
  },
  {
    id: "conciertos-emitir",
    path: "/conciertos-live/emitir",
    label: "Emitir concierto",
    description: "Panel para emitir en Conciertos Live.",
    aliases: ["emitir concierto", "emitir live", "transmitir concierto"],
    requiresAuth: true,
  },
  {
    id: "comunidad",
    path: "/comunidad",
    label: "Comunidad / Chat",
    description: "Red social y mensajes entre usuarios.",
    aliases: ["comunidad", "chat", "mensajes", "amigos", "social"],
    requiresAuth: true,
  },
  {
    id: "galeria-3d",
    path: GALERIA_AULA_SECTION_PATH,
    label: "Galería 3D",
    description: "Modelos 3D y tarjeta del Aula Virtual.",
    aliases: ["galeria", "galeria 3d", "3d", "modelos 3d", "galeria tres d"],
    requiresAuth: true,
  },
  {
    id: "galeria-aula-card",
    path: `${GALERIA_AULA_SECTION_PATH}#${GALERIA_AULA_CARD_HASH}`,
    label: "Aula Virtual (tarjeta en galería)",
    description: "Sección del menú que lleva a la tarjeta Aula en Galería 3D.",
    aliases: ["aula tarjeta", "tarjeta aula", "aula en galeria", "seccion aula"],
    requiresAuth: true,
  },
  {
    id: "aula-lobby",
    path: "/aula-virtual",
    label: "Aula Virtual (lobby 3D)",
    description: "Lobby caminable del aula con decoración educativa.",
    aliases: [
      "aula virtual",
      "aula 3d",
      "aula inmersiva",
      "aula caminable",
      "entrar al aula",
      "aula",
      "clase virtual",
      "educacion inmersiva",
    ],
    requiresAuth: true,
  },
  {
    id: "lobby-inmersivo",
    path: "/lobby-inmersivo",
    label: "Lobby inmersivo",
    description: "Sala neon 3D con pantallas en las paredes.",
    aliases: ["lobby", "lobby inmersivo", "neon room", "sala neon", "lobby 3d"],
    requiresAuth: true,
  },
  {
    id: "lobby-global",
    path: "/mi-mundo/lobby-global",
    label: "Lobby global",
    description: "Feed de vídeos YouTube en escena inmersiva.",
    aliases: ["lobby global", "mi mundo lobby", "feed lobby"],
    requiresAuth: true,
  },
  {
    id: "coliseo",
    path: "/coliseo",
    label: "Coliseo Romano 360°",
    description: "Esfera inmersiva con panorama del Coliseo y YouTube en pantalla flotante.",
    aliases: ["coliseo", "coliceo", "coliseo romano", "coliceo romano", "anfiteatro", "sala coliseo"],
    requiresAuth: true,
  },
  {
    id: "reproductor",
    path: "/reproductor-galeria",
    label: "Reproductor de galería (MP3/MP4 local)",
    description:
      "Reproductor local: eliges una carpeta en tu dispositivo y reproduces MP3 o MP4 (play, pausa, siguiente). No es Conciertos Live ni salas en vivo.",
    aliases: [
      "reproductor",
      "reproductor local",
      "reproductor de galeria",
      "reproductor galeria",
      "reproductor de video local",
      "reproductor mp4",
      "reproductor mp3",
      "galeria reproductor",
      "video local",
      "videos locales",
      "video local mp4",
      "mp4 local",
      "mp3 local",
      "archivo local",
      "archivos locales",
      "archivos mp4",
      "carpeta local",
      "carpeta mp4",
      "multimedia local",
      "reproducir mp4",
      "reproducir mp3",
      "abrir mp4",
      "abrir video local",
      "poner mp4",
      "mis videos",
      "mis mp4",
      "mp4",
      "mp3",
      "reproductor multimedia",
      "reproductor de archivos",
      "elegir carpeta",
      "carpeta de videos",
      "carpeta de musica",
      "reproducir local",
      "player mp4",
    ],
    requiresAuth: true,
  },
  {
    id: "tienda",
    path: "/tienda",
    label: "Tienda",
    description: "Productos y pagos.",
    aliases: ["tienda", "shop", "comprar", "productos"],
    requiresAuth: true,
  },
  {
    id: "eventos",
    path: "/eventos",
    label: "Eventos",
    description: "Listado de eventos.",
    aliases: ["eventos", "evento", "agenda"],
  },
  {
    id: "educacion",
    path: "/educacion",
    label: "Educación",
    description: "Sección educativa.",
    aliases: ["educacion", "educativo", "aprender", "cursos"],
    requiresAuth: true,
  },
  {
    id: "red-social-inmersiva",
    path: "/red-social-inmersiva",
    label: "Red social inmersiva",
    description: "Experiencia social inmersiva.",
    aliases: ["red social inmersiva", "red inmersiva", "social inmersivo"],
  },
  {
    id: "podcast-hub",
    path: "/podcast-hub",
    label: "Podcast Hub",
    description: "Listado de podcasts / salas esféricas.",
    aliases: ["podcast", "podcasts", "podcast hub", "hub podcast"],
    requiresAuth: true,
  },
  {
    id: "teatro-hub",
    path: "/teatro-hub",
    label: "Teatro Hub",
    description: "Stand-up y teatro en vivo.",
    aliases: ["teatro", "stand up", "standup", "teatro hub", "comedia"],
    requiresAuth: true,
  },
  {
    id: "pc",
    path: "/pc",
    label: "Escena PC",
    description: "Escena de escritorio / PC.",
    aliases: ["pc", "escena pc", "escritorio"],
    requiresAuth: true,
  },
  {
    id: "sala-emisor",
    path: "/sala/emisor",
    label: "Sala emisor",
    description: "Vista para quien transmite.",
    aliases: ["emisor", "sala emisor", "transmitir", "broadcast emisor"],
    requiresAuth: true,
  },
  {
    id: "live-stream",
    path: "/live-stream",
    label: "Live stream (Mux)",
    description: "Reproductor de transmisión Mux.",
    aliases: ["live stream", "mux", "transmision mux", "cine cam", "stream cam", "cam live", "realidad mixta"],
    requiresAuth: true,
  },
  {
    id: "quienes-somos",
    path: "/quienes-somos",
    label: "Quiénes somos",
    description: "Información de la empresa.",
    aliases: ["quienes somos", "nosotros", "empresa", "sobre nosotros"],
  },
  {
    id: "contacto",
    path: "/contacto",
    label: "Contacto",
    description: "Formulario e información de contacto.",
    aliases: ["contacto", "contactanos", "escribenos", "soporte"],
  },
  {
    id: "privacidad",
    path: "/privacidad",
    label: "Privacidad",
    description: "Política de privacidad.",
    aliases: ["privacidad", "politica privacidad", "datos personales"],
  },
  {
    id: "terminos",
    path: "/terminos",
    label: "Términos",
    description: "Términos y condiciones.",
    aliases: ["terminos", "condiciones", "legal", "terminos y condiciones"],
  },
];

/** Salas de teatro (TeatroHub). */
export const OP_TEATRO_ROOMS: { id: string; title: string; aliases: string[]; path: string }[] = [
  {
    id: "franco-escamilla",
    title: "Franco Escamilla",
    aliases: ["franco", "franco escamilla", "escamilla"],
    path: "/teatro/franco-escamilla",
  },
  {
    id: "hablando-huevadas",
    title: "Hablando Huevadas",
    aliases: ["hablando huevadas", "huevadas", "peru standup"],
    path: "/teatro/hablando-huevadas",
  },
  {
    id: "xavi",
    title: "Xavi",
    aliases: ["xavi", "corridos"],
    path: "/teatro/xavi",
  },
  {
    id: "michael-jackson",
    title: "Michael Jackson",
    aliases: ["michael jackson", "mj", "jackson", "rey del pop"],
    path: "/teatro/michael-jackson",
  },
];

function streamerAliases(name: string, id: string, immersiveSalaName: string): string[] {
  const sala = immersiveSalaName.trim().toLowerCase();
  const base = [name.toLowerCase(), id.replace(/-/g, " ")];
  if (sala.length >= 4) base.push(sala);
  if (name === "Karol G") base.push("karol", "karol g", "bichota");
  if (id === "nova-byte") base.push("nova byte", "sala cuantica", "cuantica");
  if (name.includes("Michael")) base.push("michael", "mj");
  return [...new Set(base.map((s) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "")))];
}

/** Artistas / salas derivados de podcastStreamers + salas fijas de NuestrasSalas. */
export const OP_STREAMERS: OpStreamerEntry[] = [
  ...podcastStreamers.map((s) => ({
    id: s.id,
    name: s.name,
    immersiveSalaName: s.immersiveSalaName,
    aliases: streamerAliases(s.name, s.id, s.immersiveSalaName),
    espectadorPath: `/sala/espectador/${encodeURIComponent(buildAgoraChannel(s.id))}`,
    podcastPath: `/podcast/${s.id}`,
  })),
  {
    id: "hablando-huevadas",
    name: "Hablando Huevadas",
    immersiveSalaName: "Peru",
    aliases: ["hablando huevadas", "huevadas"],
    espectadorPath: `/sala/espectador/${encodeURIComponent(buildAgoraChannel("hablando-huevadas"))}`,
    podcastPath: "/teatro/hablando-huevadas",
  },
  {
    id: "michael-jackson",
    name: "Michael Jackson",
    immersiveSalaName: "USA",
    aliases: ["michael jackson", "mj", "jackson"],
    espectadorPath: `/sala/espectador/${encodeURIComponent(buildAgoraChannel("michael-jackson"))}`,
    podcastPath: "/teatro/michael-jackson",
  },
];

/** Comandos del lobby (sin cambiar de ruta). */
export const OP_LOBBY_HINTS = [
  "pantalla 1 / pantalla 2 / pantalla 3",
  "salir de pantalla",
  "activar o desactivar giroscopio",
  "recentrar vista",
] as const;

/** Resumen corto para “¿qué puedes hacer?”. */
export function getOpAssistantHelpText(): string {
  const sections = [
    "Navegación: inicio, conciertos, aula, lobby, tienda, comunidad, galería 3D, podcast, teatro…",
    "Redes desde inicio: “abre YouTube/Facebook/Instagram/TikTok/Google” (igual que el icono).",
    "Videos en vivo: “abre un video” → Conciertos Live; “video de Karol” → sala del artista.",
    "MP4/MP3 local: “reproductor local”, “abre mp4”, “video local” → Reproductor de galería.",
    "Menú: “abre el menú”, “cierra el menú”.",
    "En lobby inmersivo: “pantalla 1”, “giroscopio”, “recentrar”.",
  ];
  return sections.join("\n");
}
