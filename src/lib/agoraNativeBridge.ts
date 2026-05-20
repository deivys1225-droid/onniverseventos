/** Separador del payload que Android parsea: appId|canal|token (o canal|token). */
export const AGORA_NATIVE_BRIDGE_SEP = "|";

/** Payload Agora (solo WebRTC emisor/web si aplica; ya no se usa en puente Android live). */
export function buildAgoraNativeBridgePayload(
  channel: string,
  token: string,
  appId: string,
): string {
  const ch = channel.trim();
  const tk = token.trim();
  const id = appId.trim();
  if (id) {
    return `${id}${AGORA_NATIVE_BRIDGE_SEP}${ch}${AGORA_NATIVE_BRIDGE_SEP}${tk}`;
  }
  return `${ch}${AGORA_NATIVE_BRIDGE_SEP}${tk}`;
}

/** Sesión de audiencia Agora unida al canal (no VOD). */
export function isAgoraAudienceSessionActive(options: {
  joined: boolean;
  useVodMode: boolean;
  channelName: string;
}): boolean {
  if (options.useVodMode) return false;
  if (!options.joined) return false;
  return options.channelName.trim().length > 0;
}
