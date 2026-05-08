export function buildAgoraChannel(roomId: string): string {
  const normalized = roomId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-");
  return `al-universo-${normalized || "main"}`;
}

