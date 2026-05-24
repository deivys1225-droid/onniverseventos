import { SALA_MP4_URL_BY_ID } from "@/data/salaVideoUrls";
import { shuffleArray } from "@/lib/shuffleArray";

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

/** Videos de la sala de eventos (Cloudinary), en orden aleatorio. */
export function getShuffledEventSalaVideos(): EventSalaVideo[] {
  const list = Object.entries(SALA_MP4_URL_BY_ID).map(([id, url]) => ({
    id,
    url,
    title: formatSalaTitle(id),
  }));
  return shuffleArray(list);
}
