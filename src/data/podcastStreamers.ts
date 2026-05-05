import { SALA_MP4_URL_BY_ID } from "@/data/salaVideoUrls";

export type StreamStatus = "live" | "offline";
export type StreamType = "platform" | "youtube";

export interface StreamerProfile {
  id: string;
  name: string;
  avatar: string;
  /** Panorama equirectangular único por sala (Lobby 360). */
  panoramaImage: string;
  /** Nombre del entorno inmersivo (ej. Sala Cuántica). */
  immersiveSalaName: string;
  status: StreamStatus;
  streamType?: StreamType;
  youtubeVideoId?: string;
  /** Video de muestra en la sala si no hay YouTube en vivo */
  fallbackVideoId?: string;
  /** MP4 principal (Cloudinary) para pantalla / 360 en la sala inmersiva */
  salaVideoUrl?: string;
  loungeTitle: string;
  loungeDescription: string;
  ticketGrada: number;
  ticketVip: number;
  featuredGames: string[];
}

export const podcastStreamers: StreamerProfile[] = [
  {
    id: "nova-byte",
    name: "Karol G",
    avatar: "/karolg-avatar.png",
    immersiveSalaName: "Sala Cuántica",
    panoramaImage:
      "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=4096&q=85",
    status: "live",
    streamType: "platform",
    fallbackVideoId: "M7lc1UVf-VE",
    salaVideoUrl: SALA_MP4_URL_BY_ID["nova-byte"],
    loungeTitle: "Quantum Lounge",
    loungeDescription:
      "Debates premium con invitados globales y audio espacial exclusivo.",
    ticketGrada: 4.99,
    ticketVip: 14.99,
    featuredGames: ["Ajedrez Blitz VR", "TCG Arena Podcast", "Drop Zone Battle"],
  },
  {
    id: "axon-king",
    name: "Silvestre Dangond",
    avatar: "/silvestre-dangon-avatar.png",
    immersiveSalaName: "Escenario Neural",
    panoramaImage:
      "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=4096&q=85",
    status: "live",
    streamType: "youtube",
    youtubeVideoId: "dQw4w9WgXcQ",
    salaVideoUrl: SALA_MP4_URL_BY_ID["axon-king"],
    loungeTitle: "Neural Stage",
    loungeDescription:
      "Conversaciones tech, gaming competitivo y comunidad en tiempo real.",
    ticketGrada: 3.99,
    ticketVip: 12.99,
    featuredGames: ["Card Clash", "Chess Royale", "Battle Room Squad"],
  },
  {
    id: "franco-escamilla",
    name: "Franco Escamilla",
    avatar: "/franco-escamilla-avatar.png",
    immersiveSalaName: "México",
    panoramaImage:
      "https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?auto=format&fit=crop&w=4096&q=85",
    status: "live",
    streamType: "platform",
    fallbackVideoId: "ScMzIvxBSi4",
    salaVideoUrl: SALA_MP4_URL_BY_ID["franco-escamilla"],
    loungeTitle: "Monólogo Premium",
    loungeDescription:
      "Stand-up, humor y comunidad en vivo desde La posada del humor.",
    ticketGrada: 2.99,
    ticketVip: 9.99,
    featuredGames: ["Stand-up VR", "Meet & Greet", "Fan Q&A"],
  },
  {
    id: "j-balvin",
    name: "J Balvin",
    avatar: "/j-balvin-avatar.png",
    immersiveSalaName: "Reggaeton Live",
    panoramaImage:
      "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=4096&q=85",
    status: "live",
    streamType: "platform",
    fallbackVideoId: "aqz-KE-bpKQ",
    salaVideoUrl: SALA_MP4_URL_BY_ID["j-balvin"],
    loungeTitle: "Escenario principal",
    loungeDescription:
      "Show en vivo, visuales y comunidad al ritmo del reggaeton.",
    ticketGrada: 5.99,
    ticketVip: 19.99,
    featuredGames: ["Live Set VR", "Fan Zone", "After Party"],
  },
  {
    id: "shakira",
    name: "Shakira",
    avatar: "/shakira-avatar.png",
    immersiveSalaName: "Colombia",
    panoramaImage:
      "https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?auto=format&fit=crop&w=4096&q=85",
    status: "live",
    streamType: "platform",
    salaVideoUrl: SALA_MP4_URL_BY_ID.shakira,
    loungeTitle: "Estudio en vivo",
    loungeDescription:
      "Show musical, visuales inmersivos y comunidad de fans en directo.",
    ticketGrada: 3.99,
    ticketVip: 11.99,
    featuredGames: ["Live Lounge", "Q&A Fans", "After Party"],
  },
  {
    id: "santa-fe-klan",
    name: "Santa Fe Klan",
    avatar: "/santa-fe-klan-avatar.png",
    immersiveSalaName: "473 Music",
    panoramaImage:
      "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=4096&q=85",
    status: "live",
    streamType: "platform",
    salaVideoUrl: SALA_MP4_URL_BY_ID["santa-fe-klan"],
    loungeTitle: "Escandaloso",
    loungeDescription:
      "Rap mexicano, sesiones en estudio y comunidad en directo.",
    ticketGrada: 3.99,
    ticketVip: 11.99,
    featuredGames: ["Live Session", "Fan Zone", "Studio VR"],
  },
  {
    id: "anuel-aa",
    name: "Anuel AA",
    avatar: "/anuel-aa-avatar.png",
    immersiveSalaName: "Trap Live",
    panoramaImage:
      "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=4096&q=85",
    status: "live",
    streamType: "platform",
    salaVideoUrl: SALA_MP4_URL_BY_ID["anuel-aa"],
    loungeTitle: "Escenario urbano",
    loungeDescription:
      "Trap y reggaeton en vivo con la comunidad en tiempo real.",
    ticketGrada: 3.49,
    ticketVip: 10.99,
    featuredGames: ["Live Set", "Fan Zone", "After Party"],
  },
  {
    id: "alofoke",
    name: "Alofoke",
    avatar: "/alofoke-avatar.png",
    immersiveSalaName: "República Dominicana",
    panoramaImage:
      "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=4096&q=85",
    status: "live",
    streamType: "platform",
    salaVideoUrl: SALA_MP4_URL_BY_ID.alofoke,
    loungeTitle: "Entrevistas en vivo",
    loungeDescription:
      "Charlas, urbano y cultura con invitados desde el estudio.",
    ticketGrada: 4.49,
    ticketVip: 12.49,
    featuredGames: ["Live Interview", "Fan Chat", "After Show"],
  },
  {
    id: "westcol",
    name: "Westcol",
    avatar: "/westcol-avatar.png",
    immersiveSalaName: "Colombia",
    panoramaImage:
      "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=4096&q=85",
    status: "live",
    streamType: "platform",
    salaVideoUrl: SALA_MP4_URL_BY_ID.westcol,
    loungeTitle: "Streaming en vivo",
    loungeDescription:
      "Contenido urbano, comunidad y eventos con Westcol en directo.",
    ticketGrada: 4.99,
    ticketVip: 13.99,
    featuredGames: ["Live Stream", "Fan Zone", "Meet & Greet"],
  },
  {
    id: "selena-quintanilla",
    name: "Selena Quintanilla",
    avatar: "/selena-quintanilla-avatar.png",
    immersiveSalaName: "Tejano Live",
    panoramaImage:
      "https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?auto=format&fit=crop&w=4096&q=85",
    status: "live",
    streamType: "platform",
    salaVideoUrl: SALA_MP4_URL_BY_ID["selena-quintanilla"],
    loungeTitle: "Clásicos en vivo",
    loungeDescription:
      "Música tejana, comunidad y tributo en directo con los fans.",
    ticketGrada: 2.99,
    ticketVip: 9.99,
    featuredGames: ["Live Hits", "Fan Zone", "Tribute Night"],
  },
  {
    id: "arcangel",
    name: "Arcángel",
    avatar: "/arcangel-avatar.png",
    immersiveSalaName: "Puerto Rico",
    panoramaImage:
      "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=4096&q=85",
    status: "live",
    streamType: "platform",
    salaVideoUrl: SALA_MP4_URL_BY_ID.arcangel,
    loungeTitle: "Trap & reggaeton",
    loungeDescription:
      "Urbano, trap y comunidad en directo con La Maravilla.",
    ticketGrada: 3.99,
    ticketVip: 11.99,
    featuredGames: ["Live Set", "Fan Zone", "After Party"],
  },
  {
    id: "bad-bunny",
    name: "Bad Bunny",
    avatar: "/bad-bunny-avatar.png",
    immersiveSalaName: "Puerto Rico",
    panoramaImage:
      "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=4096&q=85",
    status: "live",
    streamType: "platform",
    fallbackVideoId: "ScMzIvxBSi4",
    salaVideoUrl: SALA_MP4_URL_BY_ID["bad-bunny"],
    loungeTitle: "Un verano sin ti",
    loungeDescription:
      "Trap, reggaeton y comunidad global en vivo con el conejo malo.",
    ticketGrada: 3.99,
    ticketVip: 11.99,
    featuredGames: ["Live Set", "Fan Zone", "After Party"],
  },
  {
    id: "beele",
    name: "Beéle",
    avatar: "/beele-avatar.png",
    immersiveSalaName: "Colombia",
    panoramaImage:
      "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=4096&q=85",
    status: "live",
    streamType: "platform",
    salaVideoUrl: SALA_MP4_URL_BY_ID.beele,
    loungeTitle: "En vivo",
    loungeDescription:
      "Urbano y pop latino con la comunidad en directo.",
    ticketGrada: 4.29,
    ticketVip: 12.29,
    featuredGames: ["Live Session", "Fan Zone", "After Party"],
  },
  {
    id: "xavi",
    name: "Xavi",
    avatar: "/xavi-avatar.png",
    immersiveSalaName: "Regional mexicano",
    panoramaImage:
      "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=4096&q=85",
    status: "live",
    streamType: "platform",
    fallbackVideoId: "ScMzIvxBSi4",
    salaVideoUrl: SALA_MP4_URL_BY_ID.xavi,
    loungeTitle: "Corridos en vivo",
    loungeDescription:
      "Corridos tumbados y comunidad en tiempo real.",
    ticketGrada: 4.49,
    ticketVip: 12.49,
    featuredGames: ["Live Session", "Fan Zone", "Fan Chat"],
  },
  {
    id: "daddy-yankee",
    name: "Daddy Yankee",
    avatar: "/daddy-yankee-avatar.png",
    immersiveSalaName: "Puerto Rico",
    panoramaImage:
      "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=4096&q=85",
    status: "live",
    streamType: "platform",
    fallbackVideoId: "ScMzIvxBSi4",
    salaVideoUrl: SALA_MP4_URL_BY_ID["daddy-yankee"],
    loungeTitle: "Big Boss Lounge",
    loungeDescription:
      "Reggaeton clasico, hits urbanos y comunidad en directo al ritmo del Big Boss.",
    ticketGrada: 5.49,
    ticketVip: 15.99,
    featuredGames: ["Hits VR", "Fan Zone", "After Party"],
  },
];

export function resolvePodcastVideoId(s: StreamerProfile): string {
  if (s.streamType === "youtube" && s.youtubeVideoId) return s.youtubeVideoId;
  if (s.fallbackVideoId) return s.fallbackVideoId;
  return s.youtubeVideoId ?? "M7lc1UVf-VE";
}
