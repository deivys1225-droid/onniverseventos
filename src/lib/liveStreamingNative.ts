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
  const result = await LiveStreaming.startLiveStreaming({ streamKey: cleanKey });
  return result.started === true;
}
