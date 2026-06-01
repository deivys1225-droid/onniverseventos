import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { invokeOpenColiceoDirect } from "@/lib/coliseoOpenDirect";
import { COLOSSEO_PATH } from "@/data/coliseoScene";
import { stashColiseoClassLaunch } from "@/lib/coliseoClassLaunch";

type Aula = {
  id: string;
  slug: string;
  nombre: string;
  descripcion: string | null;
  docente_id: string;
  is_active: boolean;
};

type Template = {
  mp4_url: string | null;
  pdf_url: string | null;
  glb_url: string | null;
  titulo: string;
  metadata?: { video_urls?: unknown } | null;
};

type Member = {
  id: string;
  estado: "approved" | "pending" | "blocked";
  rol: string;
};

type SessionSnapshot = {
  mp4_url: string | null;
  pdf_url: string | null;
  glb_url: string | null;
  glb_v?: string | null;
  metadata?: { video_urls?: unknown } | null;
};

function normalizeVideoUrls(primaryMp4: string, rawList: unknown): string[] {
  const list = Array.isArray(rawList) ? rawList : [];
  const fromList = list
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => /^https?:\/\//i.test(item));
  const fromPrimary = primaryMp4.trim();
  const merged = fromPrimary ? [fromPrimary, ...fromList] : fromList;
  return Array.from(new Set(merged));
}

export default function ClaseVirtualEntryPage() {
  const navigate = useNavigate();
  const { slug = "" } = useParams();
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [aula, setAula] = useState<Aula | null>(null);
  const [template, setTemplate] = useState<Template | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [role, setRole] = useState<string>("particular");
  const [isClassLive, setIsClassLive] = useState(false);
  const [liveSessionId, setLiveSessionId] = useState<string>("");
  const [liveSnapshot, setLiveSnapshot] = useState<SessionSnapshot | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const realtimeReloadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasAccess = useMemo(() => {
    if (!aula) return false;
    if (role === "admin") return true;
    if (member?.estado === "approved") return true;
    return false;
  }, [aula, member?.estado, role]);

  const canEnter = useMemo(() => hasAccess && isClassLive, [hasAccess, isClassLive]);

  const classUrl = useMemo(() => {
    // En clase en vivo usamos snapshot activo; fuera de vivo tomamos template.
    const source = isClassLive ? (liveSnapshot ?? template) : template;
    const activeMp4 = source?.mp4_url?.trim() || "";
    const videoUrls = normalizeVideoUrls(activeMp4, source?.metadata?.video_urls ?? null);
    const activePdf = source?.pdf_url?.trim() || "";
    const activeGlb = source?.glb_url?.trim() || "";
    const activeGlbVersion =
      typeof (source as { glb_v?: unknown } | null)?.glb_v === "string" &&
      (source as { glb_v?: string | null }).glb_v?.trim()
        ? (source as { glb_v?: string | null }).glb_v!.trim()
        : activeGlb
          ? `${Date.now()}`
          : "";
    const params = new URLSearchParams();
    if (aula?.slug) params.set("class", aula.slug);
    if (liveSessionId) params.set("session", liveSessionId);
    if (activeMp4) params.set("mp4", activeMp4);
    for (const videoUrl of videoUrls) params.append("video", videoUrl);
    if (activePdf) params.set("pdf", activePdf);
    if (activeGlb) params.set("glb", activeGlb);
    if (activeGlbVersion) params.set("glb_v", activeGlbVersion);
    const q = params.toString();
    return q ? `${COLOSSEO_PATH}?${q}` : COLOSSEO_PATH;
  }, [
    aula?.slug,
    isClassLive,
    liveSessionId,
    liveSnapshot?.glb_url,
    liveSnapshot?.mp4_url,
    liveSnapshot?.pdf_url,
    template?.glb_url,
    template?.mp4_url,
    template?.pdf_url,
  ]);

  const load = useCallback(async () => {
    setLoading(true);
    setIsClassLive(false);
    setLiveSessionId("");
    setLiveSnapshot(null);
    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;
    if (!user) {
      setCurrentUserId("");
      setLoading(false);
      return;
    }
    setCurrentUserId(user.id);

    const { data: profileData } = await supabase
      .from("profiles")
      .select("app_role")
      .eq("id", user.id)
      .maybeSingle();
    const currentRole = ((profileData as { app_role?: string } | null)?.app_role ?? "particular") as string;
    setRole(currentRole);

    const { data: aulaData, error: aulaError } = await supabase
      .from("aulas_virtuales" as any)
      .select("id,slug,nombre,descripcion,docente_id,is_active")
      .eq("slug", slug)
      .maybeSingle();
    if (aulaError || !aulaData) {
      setAula(null);
      setTemplate(null);
      setMember(null);
      setLoading(false);
      return;
    }
    setAula(aulaData as Aula);

    const { data: tpl } = await supabase
      .from("clase_templates" as any)
      .select("titulo,mp4_url,pdf_url,glb_url,metadata")
      .eq("aula_id", aulaData.id)
      .maybeSingle();
    setTemplate((tpl as Template | null) ?? null);

    if (aulaData.docente_id === user.id) {
      setMember({ id: "owner", estado: "approved", rol: "teacher" });
      setLoading(false);
      return;
    }

    const { data: memberData } = await supabase
      .from("aula_miembros" as any)
      .select("id,estado,rol")
      .eq("aula_id", aulaData.id)
      .eq("user_id", user.id)
      .maybeSingle();
    const currentMember = (memberData as Member | null) ?? null;
    setMember(currentMember);

    const canReadSessionState =
      currentRole === "admin" || aulaData.docente_id === user.id || currentMember?.estado === "approved";
    if (canReadSessionState) {
      const { data: liveSession } = await supabase
        .from("clase_sesiones" as any)
        .select("id,status,started_at,state_snapshot")
        .eq("aula_id", aulaData.id)
        .eq("status", "live")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setIsClassLive(Boolean(liveSession));
      setLiveSessionId((liveSession as { id?: string } | null)?.id ?? "");
      const snapshot = (liveSession as { state_snapshot?: unknown } | null)?.state_snapshot as
        | SessionSnapshot
        | null
        | undefined;
      setLiveSnapshot(snapshot ?? null);
    }

    setLoading(false);
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  const queueRealtimeReload = useCallback(() => {
    if (realtimeReloadTimeoutRef.current) return;
    realtimeReloadTimeoutRef.current = setTimeout(() => {
      realtimeReloadTimeoutRef.current = null;
      void load();
    }, 250);
  }, [load]);

  useEffect(
    () => () => {
      if (realtimeReloadTimeoutRef.current) clearTimeout(realtimeReloadTimeoutRef.current);
    },
    [],
  );

  useEffect(() => {
    if (!aula?.id || !currentUserId) return;
    const channel = supabase
      .channel(`classroom-entry-${aula.id}-${currentUserId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clase_sesiones", filter: `aula_id=eq.${aula.id}` },
        queueRealtimeReload,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "aula_miembros", filter: `aula_id=eq.${aula.id}` },
        queueRealtimeReload,
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [aula?.id, currentUserId, queueRealtimeReload]);

  const requestAccess = async () => {
    if (!aula || requesting) return;
    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;
    if (!user) return;
    setRequesting(true);
    const { error } = await supabase.from("aula_miembros" as any).insert({
      aula_id: aula.id,
      user_id: user.id,
      rol: "student",
      estado: "pending",
    });
    if (error) toast.error(error.message);
    else toast.success("Solicitud enviada al docente.");
    setRequesting(false);
    await load();
  };

  const enterClassroom = () => {
    if (!canEnter) return;
    stashColiseoClassLaunch(classUrl);
    if (invokeOpenColiceoDirect()) return;
    navigate(classUrl);
  };

  return (
    <div className="relative min-h-screen w-full max-w-full overflow-x-clip overflow-y-auto bg-background">
      <Navbar />
      <main className="relative z-20 px-4 pb-20 pt-20 md:px-6">
        <div className="container mx-auto max-w-2xl rounded-2xl border border-cyan-400/25 bg-card/45 p-5 backdrop-blur-xl">
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando clase…</p>
          ) : !aula ? (
            <p className="text-sm text-rose-200">Esta clase no existe o no está activa.</p>
          ) : (
            <>
              <h1 className="font-display text-2xl font-bold">
                {template?.titulo?.trim() || aula.nombre}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {aula.descripcion?.trim() || "Clase virtual 360 con recursos compartidos por el docente."}
              </p>
              <p className="mt-2 text-xs text-cyan-100/90">
                Estado: {isClassLive ? "Clase en vivo" : "Esperando que el docente inicie la clase"}
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                {canEnter ? (
                  <Button onClick={enterClassroom}>Entrar a clase 360</Button>
                ) : hasAccess ? (
                  <Button disabled>Aun no inicia la clase</Button>
                ) : member?.estado === "pending" ? (
                  <Button disabled>Solicitud enviada (pendiente)</Button>
                ) : member?.estado === "blocked" ? (
                  <Button disabled>Acceso bloqueado</Button>
                ) : (
                  <Button onClick={() => void requestAccess()} disabled={requesting}>
                    Solicitar acceso
                  </Button>
                )}
                <Button asChild variant="outline">
                  <Link to="/3d">Volver</Link>
                </Button>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
