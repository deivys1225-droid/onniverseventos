/**
 * Emisor Mux desde el navegador.
 *
 * Nota: el paquete `@mux/mux-broadcast` no está publicado en npm (404).
 * Usamos el patrón recomendado por Mux: MediaRecorder → mux-api (WebSocket) → ffmpeg → RTMP.
 *
 * Uso: <MuxBroadcast streamKey={key} playbackId={id} broadcasting onStop={…} />
 */
export {
  MuxBroadcastPanel as MuxBroadcast,
  type MuxBroadcastPanelProps as MuxBroadcastProps,
} from "@/components/streaming/MuxBroadcastPanel";
