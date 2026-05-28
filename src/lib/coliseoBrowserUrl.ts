import { COLOSSEO_HOME_URL } from "@/data/coliseoScene";

/** Convierte texto de la barra de direcciones en URL navegable. */
export function normalizeColiseoBrowserUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return COLOSSEO_HOME_URL;

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      return new URL(trimmed).href;
    } catch {
      return COLOSSEO_HOME_URL;
    }
  }

  if (!trimmed.includes(" ")) {
    const hostish = trimmed.includes(".") || trimmed.startsWith("localhost");
    const youtubeShorthand = /^(www\.)?youtube\.com\/?$/i.test(trimmed) || /^youtube$/i.test(trimmed);
    if (hostish || youtubeShorthand) {
      try {
        const href = youtubeShorthand ? "https://www.youtube.com/" : new URL(`https://${trimmed}`).href;
        return href;
      } catch {
        return COLOSSEO_HOME_URL;
      }
    }
  }

  return `https://www.youtube.com/results?search_query=${encodeURIComponent(trimmed)}`;
}
