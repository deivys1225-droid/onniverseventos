import { useCallback, useEffect, useMemo, useState } from "react";
import { Radio } from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import {
  AgoraAudiencePlayer,
  channelFromActiveStream,
} from "@/components/streaming/AgoraAudiencePlayer";
import { DuplexSplitLayout } from "@/components/streaming/DuplexSplitLayout";
import { fetchAgoraAudienceToken } from "@/lib/agoraAudienceToken";
import { buildAgoraChannel } from "@/lib/agoraRooms";
import { supabase } from "@/integrations/supabase/client";
import type { ActiveStreamRow } from "@/lib/salaRoomCards";
import { cn } from "@/lib/utils";

const LiveStreamPage = () => {
  const navigate = useNavigate();
  const { channel: channelParam } = useParams<{ channel?: string }>();
  const [searchParams] = useSearchParams();
  const [activeStreams, setActiveStreams] = useState<ActiveStreamRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [duplexOpen, setDuplexOpen] = useState(false);
  const [streamToken, setStreamToken] = useState<string | null>(null);
  const [connectNonce, setConnectNonce] = useState(0);

  const selectedChannel = useMemo(() => {
    const fromRoute = channelParam?.trim() ? decodeURIComponent(channelParam) : "";
    if (fromRoute) return fromRoute;
    const first = activeStreams[0];
    if (first) return channelFromActiveStream(first.stream_url, buildAgoraChannel("main"));
    return buildAgoraChannel("main");
  }, [channelParam, activeStreams]);

  const selectedTitle = (searchParams.get("title") ?? "").trim();

  useEffect(() => {
    setStreamToken(null);
    setConnectNonce(0);
  }, [selectedChannel]);

  const requestConnectAll = useCallback(async () => {
    const token = await fetchAgoraAudienceToken(selectedChannel);
    setStreamToken(token);
    setConnectNonce((n) => n + 1);
  }, [selectedChannel]);

  const playerProps = {
    channelName: selectedChannel,
    title: selectedTitle || "LIVE STREAM",
    forceWebPlayback: true as const,
    manualStart: true as const,
    compact: duplexOpen,
    prefetchedToken: streamToken,
    connectNonce,
    showConnectionInfo: true as const,
    ...(duplexOpen ? { onConnectRequest: requestConnectAll } : {}),
  };

  const livePanel = (
    <AgoraAudiencePlayer key={`live-${selectedChannel}`} {...playerProps} />
  );

  const duplexPanel = (
    <AgoraAudiencePlayer key={`duplex-${selectedChannel}`} {...playerProps} />
  );

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
    const channel = channelFromActiveStream(row.stream_url, buildAgoraChannel("main"));
    const title = row.title?.trim() || "En vivo";
    const params = new URLSearchParams();
    params.set("title", title);
    navigate(`/live-stream/${encodeURIComponent(channel)}?${params.toString()}`, { replace: true });
  };

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
              <p className="text-sm text-muted-foreground">Pulsa Ver transmisión para conectar (Agora directo, sin túnel)</p>
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
                    const ch = channelFromActiveStream(row.stream_url, "");
                    const isActive = ch === selectedChannel || row.stream_url.trim() === selectedChannel;
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
                          <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{ch}</span>
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
            {duplexOpen ? (
              <DuplexSplitLayout leftPanel={livePanel} rightPanel={duplexPanel} />
            ) : (
              livePanel
            )}

            <div
              className={cn(
                "flex shrink-0 justify-center",
                duplexOpen
                  ? "border-t border-cyan-500/25 bg-black/90 py-3"
                  : "mt-4",
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
    </div>
  );
};

export default LiveStreamPage;
