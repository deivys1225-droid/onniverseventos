type Listener = (stream: MediaStream | null) => void;

let currentStream: MediaStream | null = null;
const listeners = new Set<Listener>();

export function setLivePreviewStream(stream: MediaStream | null) {
  currentStream = stream;
  listeners.forEach((listener) => listener(currentStream));
}

export function getLivePreviewStream(): MediaStream | null {
  return currentStream;
}

export function subscribeLivePreview(listener: Listener): () => void {
  listeners.add(listener);
  listener(currentStream);
  return () => {
    listeners.delete(listener);
  };
}

export function clearAndStopLivePreviewStream() {
  currentStream?.getTracks().forEach((track) => track.stop());
  setLivePreviewStream(null);
}
