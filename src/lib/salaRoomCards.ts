export type ActiveStreamRow = {
  is_live: boolean;
  title: string;
  stream_url: string;
  playback_url: string | null;
  playback_id?: string | null;
  privacy_mode: string;
  ticket_price: number | null;
  user_id: string;
  updated_at?: string;
};

export type RoomCard = {
  id: string;
  name: string;
  image: string;
  subtitle: string;
  description: string;
  status: string;
  liveStatus?: string;
  channel: string;
  isPremium: boolean;
  priceUsd: number;
  ownerUserId?: string;
  mp4Url?: string;
};

export function getRoomActiveStream(room: RoomCard, streams: ActiveStreamRow[]): ActiveStreamRow | null {
  if (room.ownerUserId) {
    const direct = streams.find((s) => s.is_live && s.user_id === room.ownerUserId);
    if (direct) return direct;
  }
  const roomId = room.id.toLowerCase();
  const roomName = room.name.toLowerCase();
  const channel = room.channel.toLowerCase();
  const matched = streams.find((s) => {
    if (!s.is_live) return false;
    const haystack = `${s.title} ${s.stream_url} ${s.playback_url ?? ""}`.toLowerCase();
    return haystack.includes(roomId) || haystack.includes(roomName) || haystack.includes(channel);
  });
  return matched ?? null;
}

export function isCommunityMemberOnline(ownerUserId: string, streams: ActiveStreamRow[]): boolean {
  return streams.some((s) => {
    if (!s.is_live || s.user_id !== ownerUserId) return false;
    const updatedAtMs = s.updated_at ? Date.parse(s.updated_at) : Number.NaN;
    if (!Number.isFinite(updatedAtMs)) return false;
    const ageMs = Date.now() - updatedAtMs;
    return ageMs >= 0 && ageMs <= 2 * 60 * 1000;
  });
}
