const AGORA_CHANNEL_PREFIX = "al-universo-";

/** Normaliza slug de sala sin duplicar el prefijo `al-universo-`. */
export function buildAgoraChannel(roomId: string): string {
  const normalized = roomId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-");
  if (!normalized) return `${AGORA_CHANNEL_PREFIX}main`;
  if (normalized.startsWith(AGORA_CHANNEL_PREFIX)) return normalized;
  return `${AGORA_CHANNEL_PREFIX}${normalized}`;
}

/** Slug para pedir token (Edge agora-token añade el prefijo). */
export function agoraChannelSlugForTokenRequest(channelOrSlug: string): string {
  const normalized = channelOrSlug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-");
  if (!normalized) return "main";
  if (normalized.startsWith(AGORA_CHANNEL_PREFIX)) {
    return normalized.slice(AGORA_CHANNEL_PREFIX.length) || "main";
  }
  return normalized;
}

