import { useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { MuxHlsPlayer } from "@/components/streaming/LivepeerHlsPlayer";
import { NativePlaybackRouteGuard } from "@/components/NativePlaybackRouteGuard";
import { sanitizeMuxPlaybackId } from "@/lib/muxPlaybackId";

/** Solo navegador web: /go/:streamId → MuxPlayer. Android usa NativePlaybackRouteGuard. */
const GoViewerPage = () => (
  <NativePlaybackRouteGuard>
    <GoViewerWeb />
  </NativePlaybackRouteGuard>
);

function GoViewerWeb() {
  const { streamId: streamIdParam } = useParams<{ streamId: string }>();
  const [searchParams] = useSearchParams();
  const title = (searchParams.get("title") ?? "En vivo").trim();

  const playbackId = useMemo(() => {
    const fromQuery = sanitizeMuxPlaybackId(
      searchParams.get("playbackId") ?? searchParams.get("playback_id") ?? "",
    );
    if (fromQuery) return fromQuery;
    const fromRoute = sanitizeMuxPlaybackId(streamIdParam ? decodeURIComponent(streamIdParam) : "");
    return fromRoute;
  }, [searchParams, streamIdParam]);

  if (import.meta.env.DEV) {
    console.log("[Onniverso] RENDER PLAYER WEB — GoViewerPage", playbackId);
  }

  return (
    <div className="relative min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 pb-12 pt-24">
        <h1 className="mb-4 font-display text-2xl font-bold text-cyan-50">{title}</h1>
        {playbackId ? (
          <MuxHlsPlayer playbackId={playbackId} title={title} manualStart={false} />
        ) : (
          <p className="text-sm text-muted-foreground">Falta playback ID en la URL.</p>
        )}
      </main>
    </div>
  );
}

export default GoViewerPage;
