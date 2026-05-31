import ColiseoImmersiveScene from "@/components/immersive/ColiseoImmersiveScene";
import { ArrowLeft, Camera, Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type ClassroomResourcePayload = {
  mp4_url?: string | null;
  pdf_url?: string | null;
  glb_url?: string | null;
};

const ColiseoPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [cameraBusy, setCameraBusy] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const cameraBackgroundRef = useRef<HTMLVideoElement | null>(null);
  const classRefreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const classSlug = useMemo(() => {
    const value = new URLSearchParams(location.search).get("class")?.trim() ?? "";
    return value;
  }, [location.search]);

  const stopCamera = useCallback(() => {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    setCameraStream(null);
    setCameraReady(false);
    setCameraEnabled(false);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const syncClassResources = useCallback(
    (template: { mp4_url?: string | null; pdf_url?: string | null; glb_url?: string | null } | null) => {
      if (!classSlug) return;
      const currentParams = new URLSearchParams(location.search);
      if (classSlug) currentParams.set("class", classSlug);

      const setOrDelete = (key: string, value?: string | null) => {
        const normalized = value?.trim() ?? "";
        if (normalized) currentParams.set(key, normalized);
        else currentParams.delete(key);
      };

      setOrDelete("mp4", template?.mp4_url ?? null);
      setOrDelete("pdf", template?.pdf_url ?? null);
      setOrDelete("glb", template?.glb_url ?? null);

      const nextSearch = currentParams.toString();
      const normalizedCurrent = location.search.startsWith("?") ? location.search.slice(1) : location.search;
      if (nextSearch !== normalizedCurrent) {
        navigate({ pathname: location.pathname, search: nextSearch ? `?${nextSearch}` : "" }, { replace: true });
      }
    },
    [classSlug, location.pathname, location.search, navigate],
  );

  const loadClassRealtimeSnapshot = useCallback(async () => {
    if (!classSlug) return;

    const { data: aulaData } = await supabase
      .from("aulas_virtuales" as any)
      .select("id")
      .eq("slug", classSlug)
      .maybeSingle();
    if (!aulaData?.id) return;

    const [{ data: liveSession }, { data: template }] = await Promise.all([
      supabase
        .from("clase_sesiones" as any)
        .select("id,status")
        .eq("aula_id", aulaData.id)
        .eq("status", "live")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("clase_templates" as any)
        .select("mp4_url,pdf_url,glb_url")
        .eq("aula_id", aulaData.id)
        .maybeSingle(),
    ]);

    if (!liveSession?.id) {
      navigate(`/clase/${encodeURIComponent(classSlug)}`, { replace: true });
      return;
    }
    syncClassResources((template as { mp4_url?: string | null; pdf_url?: string | null; glb_url?: string | null } | null) ?? null);
  }, [classSlug, navigate, syncClassResources]);

  const queueClassRealtimeRefresh = useCallback(() => {
    if (classRefreshTimeoutRef.current) return;
    classRefreshTimeoutRef.current = setTimeout(() => {
      classRefreshTimeoutRef.current = null;
      void loadClassRealtimeSnapshot();
    }, 220);
  }, [loadClassRealtimeSnapshot]);

  const applyClassroomRealtimeEvent = useCallback(
    (eventRow: { event_type?: string; payload?: Record<string, unknown> | null } | null) => {
      if (!eventRow || !classSlug) return;
      const eventType = String(eventRow.event_type ?? "").trim();
      const payload = (eventRow.payload ?? {}) as ClassroomResourcePayload;

      if (eventType === "session_ended") {
        navigate(`/clase/${encodeURIComponent(classSlug)}`, { replace: true });
        return;
      }
      if (eventType === "resources_updated" || eventType === "session_started") {
        syncClassResources({
          mp4_url: payload.mp4_url ?? null,
          pdf_url: payload.pdf_url ?? null,
          glb_url: payload.glb_url ?? null,
        });
      }
    },
    [classSlug, navigate, syncClassResources],
  );

  useEffect(
    () => () => {
      if (classRefreshTimeoutRef.current) clearTimeout(classRefreshTimeoutRef.current);
    },
    [],
  );

  useEffect(() => {
    if (!classSlug) return;
    void loadClassRealtimeSnapshot();
  }, [classSlug, loadClassRealtimeSnapshot]);

  useEffect(() => {
    if (!classSlug) return;
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setup = async () => {
      const { data: aulaData } = await supabase
        .from("aulas_virtuales" as any)
        .select("id")
        .eq("slug", classSlug)
        .maybeSingle();
      if (!active || !aulaData?.id) return;

      channel = supabase
        .channel(`coliseo-classroom-live-${aulaData.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "clase_templates", filter: `aula_id=eq.${aulaData.id}` },
          queueClassRealtimeRefresh,
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "clase_sesiones", filter: `aula_id=eq.${aulaData.id}` },
          queueClassRealtimeRefresh,
        )
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "clase_eventos", filter: `aula_id=eq.${aulaData.id}` },
          (realtimePayload) => {
            const row = (realtimePayload as { new?: { event_type?: string; payload?: Record<string, unknown> | null } })
              .new;
            applyClassroomRealtimeEvent(row ?? null);
            queueClassRealtimeRefresh();
          },
        )
        .subscribe();
    };

    void setup();
    return () => {
      active = false;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [applyClassroomRealtimeEvent, classSlug, queueClassRealtimeRefresh]);

  useEffect(() => {
    const el = cameraBackgroundRef.current;
    if (!el) return;
    el.srcObject = cameraStream;
    if (!cameraStream) {
      setCameraReady(false);
      return;
    }
    setCameraReady(false);
    const onCanPlay = () => {
      setCameraReady(true);
      void el.play().catch(() => undefined);
    };
    el.addEventListener("loadeddata", onCanPlay);
    el.addEventListener("canplay", onCanPlay);
    void el.play().catch(() => undefined);
    return () => {
      el.removeEventListener("loadeddata", onCanPlay);
      el.removeEventListener("canplay", onCanPlay);
    };
  }, [cameraStream]);

  const toggleCamera = useCallback(async () => {
    if (cameraBusy) return;
    if (cameraEnabled) {
      stopCamera();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Este dispositivo no soporta camara web.");
      return;
    }
    setCameraBusy(true);
    setCameraError(null);
    setCameraReady(false);
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
          },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      cameraStreamRef.current = stream;
      setCameraStream(stream);
      setCameraEnabled(true);
    } catch (error) {
      setCameraError(error instanceof Error ? error.message : "No se pudo activar la camara.");
      stopCamera();
    } finally {
      setCameraBusy(false);
    }
  }, [cameraBusy, cameraEnabled, stopCamera]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => navigate("/")}
        aria-label="Volver"
        className="fixed left-4 top-4 z-30 inline-flex h-11 w-11 items-center justify-center rounded-full border border-cyan-400/60 bg-slate-950/95 text-cyan-200 shadow-[0_0_28px_-4px_rgba(34,211,238,0.95),inset_0_0_18px_-10px_rgba(34,211,238,0.55)] backdrop-blur-md transition hover:border-cyan-300 hover:bg-slate-900 hover:text-white"
        style={{
          top: "max(1rem, env(safe-area-inset-top))",
          left: "max(1rem, env(safe-area-inset-left))",
        }}
      >
        <ArrowLeft className="h-5 w-5" aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => void toggleCamera()}
        aria-label={cameraEnabled ? "Desactivar camara" : "Activar camara"}
        title={cameraEnabled ? "Camara activa" : "Activar camara"}
        className={`fixed right-4 top-4 z-30 inline-flex h-11 w-11 items-center justify-center rounded-full border bg-slate-950/95 backdrop-blur-md transition ${
          cameraEnabled
            ? "border-emerald-400/70 text-emerald-200 shadow-[0_0_24px_-6px_rgba(16,185,129,0.85)] hover:border-emerald-300 hover:text-white"
            : "border-cyan-400/60 text-cyan-200 shadow-[0_0_28px_-4px_rgba(34,211,238,0.95),inset_0_0_18px_-10px_rgba(34,211,238,0.55)] hover:border-cyan-300 hover:bg-slate-900 hover:text-white"
        }`}
        style={{
          top: "max(1rem, env(safe-area-inset-top))",
          right: "max(1rem, env(safe-area-inset-right))",
        }}
      >
        {cameraBusy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <Camera className="h-5 w-5" aria-hidden />}
      </button>
      {cameraError && (
        <p className="pointer-events-none fixed right-4 top-16 z-30 max-w-[min(86vw,320px)] rounded-md border border-rose-400/40 bg-black/75 px-3 py-2 text-[11px] text-rose-200 backdrop-blur-sm">
          {cameraError}
        </p>
      )}
      <video
        ref={cameraBackgroundRef}
        playsInline
        autoPlay
        muted
        aria-hidden
        style={
          cameraEnabled && cameraStream && cameraReady
            ? {
                position: "fixed",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                zIndex: 0,
                pointerEvents: "none",
              }
            : {
                position: "fixed",
                width: 1,
                height: 1,
                opacity: 0,
                pointerEvents: "none",
                overflow: "hidden",
              }
        }
      />
      <ColiseoImmersiveScene mixedRealityActive={Boolean(cameraEnabled && cameraStream && cameraReady)} />
    </div>
  );
};

export default ColiseoPage;
