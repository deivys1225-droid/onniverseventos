import { onniMicDeniedMessage, requestOnniMicrophoneAccess } from "@/lib/requestOnniMicrophone";
import { stopAzureVoice } from "@/lib/onniAzureTts";
const TARGET_SAMPLE_RATE = 16_000;
const MAX_RECORD_MS = 25_000;

type ActiveSession = {
  recorder: MediaRecorder;
  stream: MediaStream;
  chunks: Blob[];
  stopPromise: Promise<Blob>;
};

let activeSession: ActiveSession | null = null;

function pickRecorderMime(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"];
  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return null;
}

function resampleToRate(input: Float32Array, inputRate: number, outputRate: number): Float32Array {
  if (inputRate === outputRate) return input;
  const ratio = inputRate / outputRate;
  const length = Math.max(1, Math.round(input.length / ratio));
  const output = new Float32Array(length);
  for (let i = 0; i < length; i += 1) {
    const pos = i * ratio;
    const idx = Math.floor(pos);
    const frac = pos - idx;
    const a = input[idx] ?? 0;
    const b = input[idx + 1] ?? a;
    output[i] = a + (b - a) * frac;
  }
  return output;
}

function mixToMono(buffer: AudioBuffer): Float32Array {
  if (buffer.numberOfChannels === 1) return buffer.getChannelData(0).slice();
  const length = buffer.length;
  const mixed = new Float32Array(length);
  for (let ch = 0; ch < buffer.numberOfChannels; ch += 1) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i += 1) mixed[i] += data[i] / buffer.numberOfChannels;
  }
  return mixed;
}

function encodeWavPcm16(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i += 1) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeStr(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i += 1) {
    const s = Math.max(-1, Math.min(1, samples[i] ?? 0));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return new Blob([buffer], { type: "audio/wav" });
}

async function recordedBlobToWav(blob: Blob): Promise<Blob> {
  const arrayBuffer = await blob.arrayBuffer();
  const audioCtx = new AudioContext();
  try {
    const decoded = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
    const mono = mixToMono(decoded);
    const resampled = resampleToRate(mono, decoded.sampleRate, TARGET_SAMPLE_RATE);
    return encodeWavPcm16(resampled, TARGET_SAMPLE_RATE);
  } finally {
    await audioCtx.close();
  }
}

function clearActiveSession() {
  if (!activeSession) return;
  activeSession.stream.getTracks().forEach((t) => t.stop());
  activeSession = null;
}

export function isAzureMicSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    pickRecorderMime() !== null
  );
}

export function isAzureMicRecording(): boolean {
  return activeSession !== null;
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i] ?? 0);
  }
  return btoa(binary);
}

export async function startAzureMicRecording(
  maxRecordMs = MAX_RECORD_MS,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (activeSession) {
    return { ok: false, error: "El micrófono ya está activo." };
  }

  stopAzureVoice();

  const mime = pickRecorderMime();
  if (!mime) {
    return { ok: false, error: "Este dispositivo no puede grabar audio para Onni." };
  }

  const permission = await requestOnniMicrophoneAccess();
  if (permission === "denied") {
    return { ok: false, error: onniMicDeniedMessage() };
  }
  if (permission === "unsupported") {
    return { ok: false, error: "Micrófono no disponible en este dispositivo." };
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const chunks: Blob[] = [];
    const recorder = new MediaRecorder(stream, { mimeType: mime });

    const stopPromise = new Promise<Blob>((resolve, reject) => {
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onerror = () => reject(new Error("record_failed"));
      recorder.onstop = () => {
        resolve(new Blob(chunks, { type: mime }));
      };
    });

    recorder.start(250);
    activeSession = { recorder, stream, chunks, stopPromise };

    window.setTimeout(() => {
      if (activeSession?.recorder === recorder && recorder.state === "recording") {
        recorder.stop();
      }
    }, maxRecordMs);

    return { ok: true };
  } catch {
    clearActiveSession();
    return { ok: false, error: onniMicDeniedMessage() };
  }
}

export async function transcribeBlobWithAzure(blob: Blob): Promise<string> {
  if (!blob.size) return "";

  const wav = await recordedBlobToWav(blob);
  const audioBase64 = await blobToBase64(wav);
  const res = await fetch("/api/azure/speech-stt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ audioBase64 }),
  });

  const payload = (await res.json().catch(() => null)) as {
    ok?: boolean;
    text?: string;
    error?: string;
    message?: string;
  } | null;

  if (!res.ok || !payload?.ok) {
    throw new Error(payload?.error ?? payload?.message ?? "No pude transcribir tu voz.");
  }

  return String(payload.text ?? "").trim();
}

export async function stopAzureMicRecordingAndTranscribe(): Promise<string> {
  const session = activeSession;
  if (!session) return "";

  if (session.recorder.state === "recording") {
    session.recorder.stop();
  }

  let recorded: Blob;
  try {
    recorded = await session.stopPromise;
  } finally {
    clearActiveSession();
  }

  if (!recorded.size) return "";

  return transcribeBlobWithAzure(recorded);
}

export function cancelAzureMicRecording(): void {
  const session = activeSession;
  if (!session) return;
  if (session.recorder.state === "recording") {
    session.recorder.stop();
  }
  clearActiveSession();
}
