import { SOCIAL_LINKS } from "@/components/SocialFooterIcons";

export type HomeSocialIconId =
  | "youtube"
  | "facebook"
  | "instagram"
  | "tiktok"
  | "google"
  | "netflix"
  | "whatsapp";

export type HomeSocialRedesMode = "redes" | "redesCam";

export type HomeSocialIconConfig = {
  id: HomeSocialIconId;
  label: string;
  redesUrl: string;
  redesCamUrl: string;
};

const STORAGE_KEY = "onniverso.homeSocialRedes.v1";

const WHATSAPP_DEFAULT = "https://wa.me/573117486855";

export const DEFAULT_HOME_SOCIAL_ICONS: HomeSocialIconConfig[] = [
  {
    id: "youtube",
    label: "YouTube",
    redesUrl: "https://www.youtube.com",
    redesCamUrl: "https://www.youtube.com",
  },
  {
    id: "facebook",
    label: "Facebook",
    redesUrl: SOCIAL_LINKS.facebook,
    redesCamUrl: SOCIAL_LINKS.facebook,
  },
  {
    id: "instagram",
    label: "Instagram",
    redesUrl: SOCIAL_LINKS.instagram,
    redesCamUrl: SOCIAL_LINKS.instagram,
  },
  {
    id: "tiktok",
    label: "TikTok",
    redesUrl: SOCIAL_LINKS.tiktok,
    redesCamUrl: SOCIAL_LINKS.tiktok,
  },
  {
    id: "google",
    label: "Google",
    redesUrl: "https://www.google.com",
    redesCamUrl: "https://www.google.com",
  },
  {
    id: "netflix",
    label: "Netflix",
    redesUrl: "https://www.netflix.com",
    redesCamUrl: "https://www.netflix.com",
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    redesUrl: WHATSAPP_DEFAULT,
    redesCamUrl: WHATSAPP_DEFAULT,
  },
];

function mergeWithDefaults(parsed: unknown): HomeSocialIconConfig[] {
  if (!Array.isArray(parsed)) return [...DEFAULT_HOME_SOCIAL_ICONS];

  return DEFAULT_HOME_SOCIAL_ICONS.map((def) => {
    const row = parsed.find((p) => p && typeof p === "object" && (p as HomeSocialIconConfig).id === def.id) as
      | Partial<HomeSocialIconConfig>
      | undefined;
    return {
      ...def,
      redesUrl: typeof row?.redesUrl === "string" && row.redesUrl.trim() ? row.redesUrl.trim() : def.redesUrl,
      redesCamUrl:
        typeof row?.redesCamUrl === "string" && row.redesCamUrl.trim() ? row.redesCamUrl.trim() : def.redesCamUrl,
    };
  });
}

export function loadHomeSocialRedesConfig(): HomeSocialIconConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...DEFAULT_HOME_SOCIAL_ICONS];
    return mergeWithDefaults(JSON.parse(raw));
  } catch {
    return [...DEFAULT_HOME_SOCIAL_ICONS];
  }
}

export function saveHomeSocialRedesConfig(icons: HomeSocialIconConfig[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(icons));
}

export function getHomeSocialUrl(icons: HomeSocialIconConfig[], id: HomeSocialIconId, mode: HomeSocialRedesMode) {
  const row = icons.find((i) => i.id === id);
  if (!row) return "";
  return mode === "redes" ? row.redesUrl : row.redesCamUrl;
}

export function updateHomeSocialUrl(
  icons: HomeSocialIconConfig[],
  id: HomeSocialIconId,
  mode: HomeSocialRedesMode,
  url: string,
): HomeSocialIconConfig[] {
  const key = mode === "redes" ? "redesUrl" : "redesCamUrl";
  return icons.map((row) => (row.id === id ? { ...row, [key]: url.trim() } : row));
}
