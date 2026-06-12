let activeAudio: HTMLAudioElement | null = null;
let activeObjectUrl: string | null = null;

function clearActivePlayback() {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.src = "";
    activeAudio = null;
  }
  if (activeObjectUrl) {
    URL.revokeObjectURL(activeObjectUrl);
    activeObjectUrl = null;
  }
}

/** Detiene la voz Azure en reproducción (solo cliente). */
export function stopAzureVoice(): void {
  clearActivePlayback();
}

/**
 * TTS Azure vía /api/azure/speech-tts (solo APK Android / WebView OnniVers).
 * Fallback: retorna false si falla la red o el servidor.
 */
export async function speakWithAzureVoice(text: string): Promise<boolean> {
  const clean = text.replace(/\n+/g, ". ").trim();
  if (!clean) return false;

  stopAzureVoice();

  try {
    const res = await fetch("/api/azure/speech-tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: clean }),
    });
    if (!res.ok) return false;

    const blob = await res.blob();
    if (!blob.size) return false;

    const url = URL.createObjectURL(blob);
    activeObjectUrl = url;
    const audio = new Audio(url);
    activeAudio = audio;

    await new Promise<void>((resolve, reject) => {
      audio.onended = () => resolve();
      audio.onerror = () => reject(new Error("playback_failed"));
      void audio.play().catch(reject);
    });

    clearActivePlayback();
    return true;
  } catch {
    clearActivePlayback();
    return false;
  }
}
