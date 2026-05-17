import { SALA_MP4_URL_BY_ID } from "@/data/salaVideoUrls";

export type EventSalaVideo = {
  id: string;
  url: string;
  title: string;
};

function formatSalaTitle(id: string): string {
  return id
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Videos de la sala de eventos (Cloudinary), en orden aleatorio. */
export function getShuffledEventSalaVideos(): EventSalaVideo[] {
  const list = Object.entries(SALA_MP4_URL_BY_ID).map(([id, url]) => ({
    id,
    url,
    title: formatSalaTitle(id),
  }));
  return shuffle(list);
}
