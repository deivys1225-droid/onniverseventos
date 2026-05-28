export const COLOSSEO_BROWSER_CHANNEL = "coliseo-browser";

export type ColiseoBrowserParentMessage =
  | { channel: typeof COLOSSEO_BROWSER_CHANNEL; type: "navigate"; url: string }
  | { channel: typeof COLOSSEO_BROWSER_CHANNEL; type: "back" }
  | { channel: typeof COLOSSEO_BROWSER_CHANNEL; type: "forward" }
  | { channel: typeof COLOSSEO_BROWSER_CHANNEL; type: "reload" }
  | { channel: typeof COLOSSEO_BROWSER_CHANNEL; type: "open-layer"; url?: string }
  | { channel: typeof COLOSSEO_BROWSER_CHANNEL; type: "close-top" };

export type ColiseoBrowserShellMessage = {
  channel: typeof COLOSSEO_BROWSER_CHANNEL;
  type: "stack-changed";
  depth: number;
  url: string;
  canGoBack: boolean;
  canGoForward: boolean;
};

export function postToColiseoBrowserShell(
  target: Window | null | undefined,
  message: ColiseoBrowserParentMessage,
) {
  target?.postMessage(message, "*");
}

export function isColiseoBrowserShellMessage(data: unknown): data is ColiseoBrowserShellMessage {
  if (!data || typeof data !== "object") return false;
  const msg = data as ColiseoBrowserShellMessage;
  return msg.channel === COLOSSEO_BROWSER_CHANNEL && msg.type === "stack-changed";
}
