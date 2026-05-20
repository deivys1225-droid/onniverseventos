/**
 * Emisor Mux desde el navegador (solo cliente, carga diferida).
 *
 * Nota: `@mux/mux-broadcast-react` no está en el proyecto; el emisor usa
 * MediaRecorder → mux-api (WebSocket) → ffmpeg → RTMP.
 */
export { MuxBroadcastClient as MuxBroadcast } from "@/components/streaming/MuxBroadcastClient";
export type { MuxBroadcastPanelProps as MuxBroadcastProps } from "@/components/streaming/MuxBroadcastPanel";
