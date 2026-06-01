export type ClassResourceType = "video" | "pdf" | "glb";

export type ClassResourceItem = {
  id: string;
  title: string;
  type: ClassResourceType;
  url: string;
};

export function createClassResourceId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function emptyClassResource(type: ClassResourceType = "video"): ClassResourceItem {
  return {
    id: createClassResourceId(),
    title: "",
    type,
    url: "",
  };
}

function normalizeResourceType(raw: unknown): ClassResourceType | null {
  if (raw === "video" || raw === "pdf" || raw === "glb") return raw;
  return null;
}

function normalizeResourceTitle(raw: unknown, type: ClassResourceType): string {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (value) return value;
  if (type === "video") return "Video";
  if (type === "pdf") return "PDF";
  return "Modelo GLB";
}

function normalizeResourceUrl(raw: unknown): string {
  return typeof raw === "string" ? raw.trim() : "";
}

export function normalizeClassResources(value: unknown): ClassResourceItem[] {
  if (!Array.isArray(value)) return [];
  const out: ClassResourceItem[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const candidate = item as Record<string, unknown>;
    const type = normalizeResourceType(candidate.type);
    if (!type) continue;
    const url = normalizeResourceUrl(candidate.url);
    if (!url) continue;
    out.push({
      id: typeof candidate.id === "string" && candidate.id.trim() ? candidate.id.trim() : createClassResourceId(),
      title: normalizeResourceTitle(candidate.title, type),
      type,
      url,
    });
  }
  return out;
}

export function legacyResourcesFromFields(fields: {
  mp4_url?: string | null;
  pdf_url?: string | null;
  glb_url?: string | null;
}): ClassResourceItem[] {
  const mp4 = fields.mp4_url?.trim() ?? "";
  const pdf = fields.pdf_url?.trim() ?? "";
  const glb = fields.glb_url?.trim() ?? "";
  const out: ClassResourceItem[] = [];
  if (mp4) out.push({ id: createClassResourceId(), title: "Video principal", type: "video", url: mp4 });
  if (pdf) out.push({ id: createClassResourceId(), title: "PDF principal", type: "pdf", url: pdf });
  if (glb) out.push({ id: createClassResourceId(), title: "Modelo principal", type: "glb", url: glb });
  return out;
}

export function pickPrimaryByType(resources: ClassResourceItem[], type: ClassResourceType): string | null {
  const item = resources.find((resource) => resource.type === type && resource.url.trim());
  return item?.url?.trim() || null;
}

export function extractYoutubeVideoId(rawUrl: string): string | null {
  const value = rawUrl.trim();
  if (!value) return null;
  try {
    const parsed = new URL(value);
    const host = parsed.hostname.replace(/^www\./i, "").toLowerCase();
    if (host === "youtu.be") {
      const id = parsed.pathname.split("/").filter(Boolean)[0] ?? "";
      return id || null;
    }
    if (host === "youtube.com" || host === "m.youtube.com") {
      if (parsed.pathname.startsWith("/embed/")) {
        const id = parsed.pathname.split("/")[2] ?? "";
        return id || null;
      }
      const queryId = parsed.searchParams.get("v") ?? "";
      if (queryId) return queryId;
    }
  } catch {
    return null;
  }
  return null;
}

export function toYoutubeEmbedUrl(rawUrl: string): string | null {
  const videoId = extractYoutubeVideoId(rawUrl);
  if (!videoId) return null;
  return `https://www.youtube.com/embed/${videoId}?rel=0`;
}
