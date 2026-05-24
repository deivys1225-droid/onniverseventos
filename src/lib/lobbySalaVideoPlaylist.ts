import { SALA_MP4_URL_BY_ID } from "@/data/salaVideoUrls";
import { podcastStreamers } from "@/data/podcastStreamers";
import { shuffleArray } from "@/lib/shuffleArray";

export type LobbySalaVideoItem = {
  id: string;
  name: string;
  url: string;
};

export function getLobbySalaVideoPlaylist(): LobbySalaVideoItem[] {
  const nameById = new Map(podcastStreamers.map((s) => [s.id, s.name]));
  const list = Object.entries(SALA_MP4_URL_BY_ID).map(([id, url]) => ({
    id,
    name: nameById.get(id) ?? id.replace(/-/g, " "),
    url,
  }));
  return shuffleArray(list);
}
