import { registerPlugin } from "@capacitor/core";

type StartLiveStreamingOptions = {
  streamKey: string;
};

type StartLiveStreamingResult = {
  started: boolean;
};

interface LiveStreamingPlugin {
  startLiveStreaming(options: StartLiveStreamingOptions): Promise<StartLiveStreamingResult>;
}

const LiveStreaming = registerPlugin<LiveStreamingPlugin>("LiveStreaming");

export async function startNativeLiveStreaming(streamKey: string): Promise<boolean> {
  const cleanKey = streamKey.trim();
  if (!cleanKey) {
    throw new Error("streamKey es requerido");
  }
  try {
    const result = await LiveStreaming.startLiveStreaming({ streamKey: cleanKey });
    return result.started === true;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // Caso típico cuando el WebView cargó contenido remoto sin inyectar el bridge de Capacitor (o el plugin no está registrado).
    throw new Error(
      msg && msg.length < 220
        ? `No se pudo abrir la cámara nativa. Puente Capacitor/Plugin no disponible: ${msg}`
        : "No se pudo abrir la cámara nativa. Puente Capacitor/Plugin no disponible.",
    );
  }
}
