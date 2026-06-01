import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { COLOSSEO_HOME_URL } from "@/data/coliseoScene";
import {
  COLOSSEO_NATIVE_BROWSER_SLOT_ID,
  useColiseoNativeWebViewSlot,
} from "@/lib/coliseoNativeWebView";
import { supabase } from "@/integrations/supabase/client";

/**
 * Slot de la pantalla flotante: WebView nativo en Android; vacío visible en PC para revisar posición.
 */
export default function ColiseoAndroidWebViewSlot({
  onScreenPointerDown,
}: {
  onScreenPointerDown?: () => void;
}) {
  type SyncCommand = {
    action?: "play" | "pause" | "next" | "prev";
    senderId?: string;
    index?: number;
    shouldPlay?: boolean;
  };

  const nativeSlotRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const applyingRemoteRef = useRef(false);
  const [selfUserId, setSelfUserId] = useState("");
  const [isTeacher, setIsTeacher] = useState(false);
  const [desiredPlayback, setDesiredPlayback] = useState<"play" | "pause" | null>(null);
  const useNativeWebView = false;
  const syncContext = useMemo(() => {
    if (typeof window === "undefined") return { classSlug: "", sessionId: "" };
    const searchParams = new URLSearchParams(window.location.search);
    return {
      classSlug: searchParams.get("class")?.trim().toLowerCase() ?? "",
      sessionId: searchParams.get("session")?.trim() ?? "",
    };
  }, []);

  const classVideoUrls = useMemo(() => {
    if (typeof window === "undefined") return [];
    const searchParams = new URLSearchParams(window.location.search);
    const legacyMp4 = searchParams.get("mp4")?.trim() ?? "";
    const allVideoParams = Array.from(
      new Set(
        searchParams
      .getAll("video")
      .map((item) => item.trim())
          .filter((item) => /^https?:\/\//i.test(item)),
      ),
    );
    // Regla estable: si hay playlist de videos, NO mezclar mp4 legacy.
    if (allVideoParams.length > 0) return allVideoParams;
    return legacyMp4 && /^https?:\/\//i.test(legacyMp4) ? [legacyMp4] : [];
  }, []);
  const [videoIndex, setVideoIndex] = useState(0);
  const activeVideoUrl =
    classVideoUrls.length > 0 ? classVideoUrls[Math.max(0, Math.min(videoIndex, classVideoUrls.length - 1))] : "";
  const browserTargetUrl = activeVideoUrl || COLOSSEO_HOME_URL;
  const canNavigateVideos = classVideoUrls.length > 1 && isTeacher;

  const broadcastSyncCommand = useCallback(
    async (command: Omit<SyncCommand, "senderId">) => {
      if (!isTeacher || !channelRef.current || !selfUserId) return;
      await channelRef.current.send({
        type: "broadcast",
        event: "video-control",
        payload: { ...command, senderId: selfUserId },
      });
    },
    [isTeacher, selfUserId],
  );

  useEffect(() => {
    let cancelled = false;
    let syncChannel: ReturnType<typeof supabase.channel> | null = null;

    const setupSync = async () => {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;
      if (!user || cancelled) return;
      setSelfUserId(user.id);

      if (syncContext.classSlug) {
        const { data: aulaRow } = await supabase
          .from("aulas_virtuales" as any)
          .select("docente_id")
          .eq("slug", syncContext.classSlug)
          .maybeSingle();
        const docenteId = (aulaRow as { docente_id?: string } | null)?.docente_id ?? "";
        if (!cancelled) setIsTeacher(docenteId === user.id);
      } else if (!cancelled) {
        setIsTeacher(false);
      }

      const channelName = `class-video-sync-${syncContext.classSlug || "main"}-${syncContext.sessionId || "default"}`;
      syncChannel = supabase.channel(channelName);
      channelRef.current = syncChannel;

      syncChannel
        .on("broadcast", { event: "video-control" }, ({ payload }) => {
          const command = (payload as SyncCommand | null) ?? null;
          if (!command || command.senderId === user.id) return;
          const action = command.action;
          if (!action) return;

          applyingRemoteRef.current = true;
          if (action === "next" || action === "prev") {
            if (typeof command.index === "number") setVideoIndex(command.index);
            if (command.shouldPlay === true) setDesiredPlayback("play");
            if (command.shouldPlay === false) setDesiredPlayback("pause");
            setTimeout(() => {
              applyingRemoteRef.current = false;
            }, 400);
            return;
          }
          setDesiredPlayback(action);
          setTimeout(() => {
            applyingRemoteRef.current = false;
          }, 200);
        })
        .subscribe();
    };

    void setupSync();
    return () => {
      cancelled = true;
      channelRef.current = null;
      if (syncChannel) void supabase.removeChannel(syncChannel);
    };
  }, [syncContext.classSlug, syncContext.sessionId]);

  useEffect(() => {
    if (videoIndex < classVideoUrls.length) return;
    setVideoIndex(classVideoUrls.length > 0 ? classVideoUrls.length - 1 : 0);
  }, [classVideoUrls.length, videoIndex]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !desiredPlayback) return;
    applyingRemoteRef.current = true;
    if (desiredPlayback === "play") {
      void video.play().catch(() => undefined);
    } else {
      video.pause();
    }
    const timeout = setTimeout(() => {
      applyingRemoteRef.current = false;
      setDesiredPlayback(null);
    }, 220);
    return () => clearTimeout(timeout);
  }, [activeVideoUrl, desiredPlayback]);

  useColiseoNativeWebViewSlot(nativeSlotRef, {
    enabled: useNativeWebView,
    url: browserTargetUrl,
    reloadToken: 0,
  });

  return (
    <div
      ref={nativeSlotRef}
      id={COLOSSEO_NATIVE_BROWSER_SLOT_ID}
      data-native-webview-slot={COLOSSEO_NATIVE_BROWSER_SLOT_ID}
      data-coliseo-screen="true"
      onPointerDown={(event) => {
        event.stopPropagation();
        onScreenPointerDown?.();
      }}
      className="relative flex h-full w-full items-center justify-center bg-black/15"
      aria-hidden={useNativeWebView}
    >
      {!useNativeWebView ? (
        activeVideoUrl ? (
          <div className="relative h-full w-full bg-black">
            <video
              key={activeVideoUrl}
              ref={videoRef}
              src={activeVideoUrl}
              className="h-full w-full bg-black"
              controls
              preload="metadata"
              playsInline
              onPlay={() => {
                if (!isTeacher || applyingRemoteRef.current) return;
                void broadcastSyncCommand({ action: "play" });
              }}
              onPause={() => {
                if (!isTeacher || applyingRemoteRef.current) return;
                void broadcastSyncCommand({ action: "pause" });
              }}
            />
            {classVideoUrls.length > 1 ? (
              <div className="absolute bottom-2 left-2 right-2 z-10 flex items-center justify-between gap-2 rounded bg-black/65 p-2 text-[11px] text-cyan-100">
                <button
                  type="button"
                  className="rounded border border-cyan-400/40 px-2 py-1 hover:bg-cyan-500/15 disabled:cursor-not-allowed disabled:opacity-45"
                  disabled={!canNavigateVideos}
                  onClick={() =>
                    setVideoIndex((prev) => {
                      const next = prev <= 0 ? classVideoUrls.length - 1 : prev - 1;
                      if (isTeacher) {
                        const shouldPlay = !videoRef.current?.paused;
                        void broadcastSyncCommand({ action: "prev", index: next, shouldPlay });
                      }
                      return next;
                    })
                  }
                >
                  Anterior
                </button>
                <span>
                  Video {Math.min(videoIndex + 1, classVideoUrls.length)} / {classVideoUrls.length}
                </span>
                <button
                  type="button"
                  className="rounded border border-cyan-400/40 px-2 py-1 hover:bg-cyan-500/15 disabled:cursor-not-allowed disabled:opacity-45"
                  disabled={!canNavigateVideos}
                  onClick={() =>
                    setVideoIndex((prev) => {
                      const next = (prev + 1) % classVideoUrls.length;
                      if (isTeacher) {
                        const shouldPlay = !videoRef.current?.paused;
                        void broadcastSyncCommand({ action: "next", index: next, shouldPlay });
                      }
                      return next;
                    })
                  }
                >
                  Siguiente
                </button>
              </div>
            ) : null}
            {classVideoUrls.length > 0 && !isTeacher ? (
              <div className="absolute right-2 top-2 rounded bg-black/70 px-2 py-1 text-[10px] text-cyan-100">
                Sincronizado por docente
              </div>
            ) : null}
          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-black/70 px-4 text-center">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-white/75">
              Esperando video del docente...
            </p>
          </div>
        )
      ) : null}
    </div>
  );
}
