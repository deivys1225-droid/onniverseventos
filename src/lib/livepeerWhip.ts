function waitIceComplete(pc: RTCPeerConnection, timeoutMs: number): Promise<void> {
  if (pc.iceGatheringState === "complete") return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(t);
      pc.removeEventListener("icegatheringstatechange", onState);
      resolve();
    };
    const onState = () => {
      if (pc.iceGatheringState === "complete") done();
    };
    const t = window.setTimeout(done, timeoutMs);
    pc.addEventListener("icegatheringstatechange", onState);
  });
}

export type WhipPublisherHandle = {
  stop: () => void;
};

/**
 * Ingest WHIP (WebRTC) hacia Livepeer Studio desde el navegador (ideal para móvil).
 */
export async function startLivepeerWhipPublisher(input: {
  mediaStream: MediaStream;
  streamKey: string;
  whipUrl?: string | null;
}): Promise<WhipPublisherHandle> {
  const { mediaStream, streamKey } = input;
  const whipTarget =
    typeof input.whipUrl === "string" && input.whipUrl.trim().length > 0
      ? input.whipUrl.trim()
      : `https://playback.livepeer.studio/webrtc/${encodeURIComponent(streamKey)}`;

  const pc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  });

  mediaStream.getTracks().forEach((track) => {
    pc.addTrack(track, mediaStream);
  });

  const offer = await pc.createOffer({
    offerToReceiveAudio: false,
    offerToReceiveVideo: false,
  });
  await pc.setLocalDescription(offer);
  await waitIceComplete(pc, 12_000);

  const sdp = pc.localDescription?.sdp;
  if (!sdp) {
    pc.close();
    throw new Error("No se pudo generar la oferta WebRTC.");
  }

  const res = await fetch(whipTarget, {
    method: "POST",
    headers: {
      "Content-Type": "application/sdp",
      Accept: "application/sdp",
    },
    body: sdp,
  });

  const answerText = await res.text();
  if (!res.ok) {
    pc.close();
    let detail = answerText.slice(0, 280).trim();
    try {
      const j = JSON.parse(answerText) as { error?: string; message?: string };
      if (typeof j.error === "string") detail = j.error;
      else if (typeof j.message === "string") detail = j.message;
    } catch {
      /* texto plano */
    }
    throw new Error(detail || `WHIP falló (HTTP ${res.status}).`);
  }

  await pc.setRemoteDescription({ type: "answer", sdp: answerText });

  return {
    stop: () => {
      pc.getSenders().forEach((s) => {
        try {
          s.track?.stop();
        } catch {
          /* ignore */
        }
      });
      pc.close();
    },
  };
}
