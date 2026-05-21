import { useEffect, useMemo, useState } from "react";
import { Radio, Smartphone } from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { MuxHlsPlayer } from "@/components/streaming/LivepeerHlsPlayer";
import { DuplexSplitLayout } from "@/components/streaming/DuplexSplitLayout";
import { NativePlaybackRouteGuard } from "@/components/NativePlaybackRouteGuard";
import { shouldUseWebLivePlayer } from "@/lib/nativePlayback";
import { handleStreamCardPlay } from "@/lib/streamCardNavigation";
import { useLiveStreamChoiceModal } from "@/hooks/useLiveStreamChoiceModal";
import { handoffAudienceLiveCardOnAndroid } from "@/lib/liveStreamOpenDirect";
import {
  resolvePlaybackFromActiveStreamRow,
  resolvePlaybackIdFromActiveStreamRow,
} from "@/lib/audiencePlayback";
import { sanitizeMuxPlaybackId } from "@/lib/muxPlaybackId";
import { supabase } from "@/integrations/supabase/client";
import type { ActiveStreamRow } from "@/lib/salaRoomCards";
import { cn } from "@/lib/utils";

const LiveStreamPage = () => (
  <NativePlaybackRouteGuard>
    <LiveStreamPageWeb />
  </NativePlaybackRouteGuard>
);

const LiveStreamPageWeb = () => {
  const navigate = useNavigate();
  const { channel: channelParam } = useParams<{ channel?: string }>();
  const [searchParams] = useSearchParams();
  const playbackIdParam = (searchParams.get("playbackId") ?? searchParams.get("playback_id") ?? "").trim();
  const [activeStreams, setActiveStreams] = useState<ActiveStreamRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [duplexOpen, setDuplexOpen] = useState(false);
  const selectedTitle = (searchParams.get("title") ?? "").trim();
  const { requestChoice, dialog: liveStreamChoiceDialog } = useLiveStreamChoiceModal();

  const selectedStream = useMemo(() => {
    const routeKey = channelParam?.trim() ? decodeURIComponent(channelParam) : "";
    if (!routeKey) return activeStreams[0] ?? null;
    const match = activeStreams.find(
      (row) =>
        row.playback_id === routeKey ||
        row.user_id === routeKey ||
        row.stream_url.trim() === routeKey ||
        row.playback_url?.trim() === routeKey,
    );
    return match ?? activeStreams[0] ?? null;
  }, [channelParam, activeStreams]);

  const playbackId = useMemo(() => {
    const fromQuery = sanitizeMuxPlaybackId(playbackIdParam);
    if (fromQuery) return fromQuery;
    return resolvePlaybackIdFromActiveStreamRow(selectedStream);
  }, [playbackIdParam, selectedStream]);

  const playbackUrl = useMemo(
    () => resolvePlaybackFromActiveStreamRow(selectedStream),
    [selectedStream],
  );

  const displayTitle = selectedTitle || selectedStream?.title?.trim() || "LIVE STREAM";
  const useWebMuxPlayer = shouldUseWebLivePlayer();

  useEffect(() => {
    const load = async () => {
      setLoadingList(true);
      const { data } = await supabase
        .from("active_streams")
        .select("user_id,is_live,title,stream_url,playback_url,playback_id,privacy_mode,ticket_price,updated_at")
        .eq("is_live", true);
      setActiveStreams((data ?? []) as ActiveStreamRow[]);
      setLoadingList(false);
    };
    void load();
    const ch = supabase
      .channel("live-stream-page")
      .on("postgres_changes", { event: "*", schema: "public", table: "active_streams" }, () => {
        void load();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, []);

  const selectStream = (row: ActiveStreamRow) => {
    const title = row.title?.trim() || "En vivo";
    if (handoffAudienceLiveCardOnAndroid(row, title, requestChoice, true)) {
      return;
    }
    handleStreamCardPlay({
      navigate,
      streamUrl: resolvePlaybackFromActiveStreamRow(row) ?? undefined,
      streamId: resolvePlaybackIdFromActiveStreamRow(row) ?? row.user_id,
      playbackId: resolvePlaybackIdFromActiveStreamRow(row) ?? undefined,
      title,
    });
  };

  const androidNativePlaybackPanel = (
    <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-xl border border-cyan-300/35 bg-black/50 p-6 text-center">
      <Smartphone className="h-10 w-10 text-cyan-300" aria-hidden />
      <p className="text-sm font-semibold text-cyan-50">Reproducción nativa (Android)</p>
      <p className="max-w-md text-xs text-muted-foreground">
        El live Mux no se reproduce aquí en el WebView. Usa la tarjeta <strong>EN VIVO</strong> en la sala emisor o los
        botones 360° / VR / MT del puente nativo.
      </p>
      {playbackId ? (
        <p className="font-mono text-[10px] text-cyan-200/80">playback_id: {playbackId}</p>
      ) : null}
    </div>
  );

  const player = !useWebMuxPlayer ? (
    androidNativePlaybackPanel
  ) : playbackId ? (
    <MuxHlsPlayer
      key={playbackId}
      playbackId={playbackId}
      title={displayTitle}
      compact={duplexOpen}
      manualStart
    />
  ) : (
    <div className="flex aspect-video w-full items-center justify-center rounded-xl border border-cyan-300/35 bg-black/50 p-6 text-center text-sm text-muted-foreground">
      {loadingList ? "Cargando transmisiones…" : "No hay playback ID activo. El emisor debe estar en vivo (Mux)."}
    </div>
  );

  const livePanel = player;
  const duplexPanel = player;

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <Navbar />
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,hsl(var(--primary)/0.22),transparent_45%),radial-gradient(circle_at_80%_90%,hsl(290_80%_60%/0.14),transparent_42%)]" />
      </div>

      <main
        className={cn(
          "relative z-10 mx-auto px-3 pb-12 pt-24 md:px-6",
          duplexOpen ? "fixed inset-0 z-30 max-w-none pt-16" : "max-w-6xl",
        )}
      >
        {!duplexOpen && (
          <header className="mb-6 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-400/40 bg-cyan-500/10">
              <Radio className="h-5 w-5 text-cyan-300" aria-hidden />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold tracking-wide text-cyan-50 md:text-3xl">LIVE STREAM</h1>
              <p className="text-sm text-muted-foreground">
                {useWebMuxPlayer ? "Reproducción en vivo Mux Player" : "Reproducción nativa Android"}
              </p>
            </div>
          </header>
        )}

        <div className={cn("grid gap-4", !duplexOpen && "lg:grid-cols-[minmax(0,16rem)_1fr]")}>
          {!duplexOpen && (
            <aside className="rounded-2xl border border-cyan-300/30 bg-card/40 p-3 backdrop-blur-md">
              <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                En vivo ahora
              </p>
              {loadingList ? (
                <p className="px-2 py-4 text-sm text-muted-foreground">Cargando…</p>
              ) : activeStreams.length === 0 ? (
                <p className="px-2 py-4 text-sm text-muted-foreground">No hay transmisiones activas.</p>
              ) : (
                <ul className="flex max-h-[min(50vh,28rem)] flex-col gap-1.5 overflow-y-auto">
                  {activeStreams.map((row) => {
                    const isActive =
                      selectedStream?.user_id === row.user_id ||
                      selectedStream?.playback_id === row.playback_id;
                    return (
                      <li key={`${row.user_id}-${row.updated_at ?? row.title}`}>
                        <button
                          type="button"
                          onClick={() => selectStream(row)}
                          className={cn(
                            "w-full rounded-xl border px-3 py-2.5 text-left text-sm transition",
                            isActive
                              ? "border-cyan-400/60 bg-cyan-500/15 text-cyan-50"
                              : "border-transparent bg-primary/5 text-foreground hover:border-cyan-400/30 hover:bg-cyan-500/10",
                          )}
                        >
                          <span className="block font-medium">{row.title || "Sin título"}</span>
                          <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                            {row.playback_id || row.user_id}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </aside>
          )}

          <section
            className={cn(
              "flex flex-col",
              duplexOpen
                ? "min-h-0 flex-1 rounded-none border-0 bg-black p-0 shadow-none"
                : "rounded-2xl border border-cyan-300/35 bg-card/35 p-3 shadow-[0_0_50px_-18px_rgba(34,211,238,0.85)] backdrop-blur-xl md:p-4",
            )}
          >
            {duplexOpen ? <DuplexSplitLayout leftPanel={livePanel} rightPanel={duplexPanel} /> : livePanel}

            <div
              className={cn(
                "flex shrink-0 justify-center",
                duplexOpen ? "border-t border-cyan-500/25 bg-black/90 py-3" : "mt-4",
              )}
            >
              <button
                type="button"
                onClick={() => setDuplexOpen((open) => !open)}
                className={cn(
                  "inline-flex min-h-[48px] min-w-[10rem] items-center justify-center rounded-xl border px-8 py-2.5 text-sm font-semibold uppercase tracking-[0.2em] transition",
                  duplexOpen
                    ? "border-violet-400/60 bg-violet-500/20 text-violet-50 shadow-[0_0_28px_-8px_rgba(167,139,250,0.9)] hover:bg-violet-500/30"
                    : "border-cyan-400/60 bg-cyan-500/15 text-cyan-50 shadow-[0_0_28px_-8px_rgba(34,211,238,0.75)] hover:bg-cyan-500/25",
                )}
              >
                duplex
              </button>
            </div>
          </section>
        </div>
      </main>

      {liveStreamChoiceDialog}
    </div>
  );
};

export default LiveStreamPage;
