import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check, Copy, Plus, Save, StopCircle, Trash2, UserCheck2, Users, X } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  emptyClassResource,
  legacyResourcesFromFields,
  normalizeClassResources,
  pickPrimaryByType,
  type ClassResourceItem,
  type ClassResourceType,
} from "@/lib/classResources";

type AulaCard = {
  id: string;
  slug: string;
  nombre: string;
  descripcion: string | null;
  is_active: boolean;
  template: {
    titulo: string;
    mp4_url: string | null;
    pdf_url: string | null;
    glb_url: string | null;
    metadata?: { resource_playlist?: unknown } | null;
  } | null;
};

type AulaDraft = {
  nombre: string;
  slug: string;
  descripcion: string;
  titulo: string;
  mp4_url: string;
  pdf_url: string;
  glb_url: string;
  resources: ClassResourceItem[];
};

type ClaseSession = {
  id: string;
  aula_id: string;
  status: "scheduled" | "live" | "ended";
  started_at: string;
  state_snapshot?: {
    titulo?: string | null;
    mp4_url?: string | null;
    pdf_url?: string | null;
    glb_url?: string | null;
    metadata?: { resource_playlist?: unknown } | null;
  } | null;
};

type AulaMember = {
  id: string;
  aula_id: string;
  user_id: string;
  rol: string;
  estado: "approved" | "pending" | "blocked";
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 64);
}

function sanitizeDraftResources(resources: ClassResourceItem[]): ClassResourceItem[] {
  return normalizeClassResources(resources).map((item) => ({
    ...item,
    title: item.title.trim() || (item.type === "video" ? "Video" : item.type === "pdf" ? "PDF" : "Modelo GLB"),
  }));
}

function syncLegacyLinksFromResources(resources: ClassResourceItem[], fallback: AulaDraft) {
  const normalized = sanitizeDraftResources(resources);
  return {
    resources: normalized,
    mp4_url: pickPrimaryByType(normalized, "video") ?? fallback.mp4_url.trim() ?? "",
    pdf_url: pickPrimaryByType(normalized, "pdf") ?? fallback.pdf_url.trim() ?? "",
    glb_url: pickPrimaryByType(normalized, "glb") ?? fallback.glb_url.trim() ?? "",
  };
}

export default function DocenteClasesPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [aulas, setAulas] = useState<AulaCard[]>([]);
  const [drafts, setDrafts] = useState<Record<string, AulaDraft>>({});
  const [sessionsByAula, setSessionsByAula] = useState<Record<string, ClaseSession | null>>({});
  const [membersByAula, setMembersByAula] = useState<Record<string, AulaMember[]>>({});
  const [newAula, setNewAula] = useState<AulaDraft>({
    nombre: "",
    slug: "",
    descripcion: "",
    titulo: "Clase Virtual",
    mp4_url: "",
    pdf_url: "",
    glb_url: "",
    resources: [],
  });

  const canManage = useMemo(() => role === "docente" || role === "admin", [role]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;
    if (!user) {
      setRole(null);
      setAulas([]);
      setDrafts({});
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("app_role")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError) {
      toast.error("No se pudo leer el rol del usuario.");
      setLoading(false);
      return;
    }
    const currentRole = (profile as { app_role?: string } | null)?.app_role ?? "particular";
    setRole(currentRole);

    if (!(currentRole === "docente" || currentRole === "admin")) {
      setAulas([]);
      setDrafts({});
      setLoading(false);
      return;
    }

    const { data: aulasRows, error: aulasError } = await supabase
      .from("aulas_virtuales" as any)
      .select("id,slug,nombre,descripcion,is_active")
      .eq("docente_id", user.id)
      .order("created_at", { ascending: false });
    if (aulasError) {
      toast.error("No se pudieron cargar tus aulas.");
      setLoading(false);
      return;
    }

    const aulaIds = (aulasRows ?? []).map((row) => row.id);
    let templatesByAula: Record<string, AulaCard["template"]> = {};
    if (aulaIds.length > 0) {
      const { data: templates, error: templatesError } = await supabase
        .from("clase_templates" as any)
        .select("aula_id,titulo,mp4_url,pdf_url,glb_url,metadata")
        .in("aula_id", aulaIds);
      if (templatesError) {
        toast.error("No se pudieron cargar los recursos de tus aulas.");
      } else {
        templatesByAula = Object.fromEntries(
          (templates ?? []).map((row) => [
            row.aula_id,
            {
              titulo: row.titulo,
              mp4_url: row.mp4_url,
              pdf_url: row.pdf_url,
              glb_url: row.glb_url,
              metadata: row.metadata,
            },
          ]),
        );
      }
    }

    const { data: sessionsRows } = await supabase
      .from("clase_sesiones" as any)
      .select("id,aula_id,status,started_at,state_snapshot")
      .in("aula_id", aulaIds)
      .order("started_at", { ascending: false });
    const latestSessionByAula: Record<string, ClaseSession | null> = {};
    for (const aulaId of aulaIds) latestSessionByAula[aulaId] = null;
    for (const row of (sessionsRows ?? []) as ClaseSession[]) {
      if (!latestSessionByAula[row.aula_id]) latestSessionByAula[row.aula_id] = row;
    }
    setSessionsByAula(latestSessionByAula);

    const normalized: AulaCard[] = (aulasRows ?? []).map((row) => ({
      id: row.id,
      slug: row.slug,
      nombre: row.nombre,
      descripcion: row.descripcion,
      is_active: row.is_active,
      template: templatesByAula[row.id] ?? null,
    }));
    setAulas(normalized);
    setDrafts(
      Object.fromEntries(
        normalized.map((aula) => {
          const liveSession = latestSessionByAula[aula.id];
          const liveSnapshot =
            liveSession?.status === "live" && liveSession.state_snapshot
              ? liveSession.state_snapshot
              : null;
          return [
            aula.id,
            (() => {
              const resourcesFromTemplate = normalizeClassResources(
                aula.template?.metadata && typeof aula.template.metadata === "object"
                  ? (aula.template.metadata as { resource_playlist?: unknown }).resource_playlist
                  : null,
              );
              const resourcesFromSnapshot = normalizeClassResources(
                liveSnapshot?.metadata && typeof liveSnapshot.metadata === "object"
                  ? (liveSnapshot.metadata as { resource_playlist?: unknown }).resource_playlist
                  : null,
              );
              const resources =
                resourcesFromSnapshot.length > 0
                  ? resourcesFromSnapshot
                  : resourcesFromTemplate.length > 0
                    ? resourcesFromTemplate
                    : legacyResourcesFromFields({
                        mp4_url: liveSnapshot?.mp4_url ?? aula.template?.mp4_url ?? null,
                        pdf_url: liveSnapshot?.pdf_url ?? aula.template?.pdf_url ?? null,
                        glb_url: liveSnapshot?.glb_url ?? aula.template?.glb_url ?? null,
                      });
              return {
              nombre: aula.nombre,
              slug: aula.slug,
              descripcion: aula.descripcion ?? "",
              titulo: liveSnapshot?.titulo ?? aula.template?.titulo ?? "Clase Virtual",
              mp4_url: liveSnapshot?.mp4_url ?? aula.template?.mp4_url ?? "",
              pdf_url: liveSnapshot?.pdf_url ?? aula.template?.pdf_url ?? "",
              glb_url: liveSnapshot?.glb_url ?? aula.template?.glb_url ?? "",
                resources,
              };
            })(),
          ];
        }),
      ),
    );

    const { data: membersRows } = await supabase
      .from("aula_miembros" as any)
      .select("id,aula_id,user_id,rol,estado")
      .in("aula_id", aulaIds)
      .order("created_at", { ascending: false });
    const groupedMembers: Record<string, AulaMember[]> = {};
    for (const aulaId of aulaIds) groupedMembers[aulaId] = [];
    for (const row of (membersRows ?? []) as AulaMember[]) {
      groupedMembers[row.aula_id] ??= [];
      groupedMembers[row.aula_id].push(row);
    }
    setMembersByAula(groupedMembers);

    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const createAula = async (event: FormEvent) => {
    event.preventDefault();
    if (!canManage || saving) return;
    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;
    if (!user) return;

    const nombre = newAula.nombre.trim();
    if (!nombre) {
      toast.error("Escribe el nombre de la clase.");
      return;
    }
    const slug = slugify(newAula.slug || nombre);
    if (!slug) {
      toast.error("No se pudo generar un ID válido para la clase.");
      return;
    }

    setSaving(true);
    const { data: aulaCreated, error: aulaError } = await supabase
      .from("aulas_virtuales" as any)
      .insert({
        slug,
        nombre,
        descripcion: newAula.descripcion.trim() || null,
        docente_id: user.id,
      })
      .select("id")
      .single();
    if (aulaError || !aulaCreated) {
      toast.error(aulaError?.message ?? "No se pudo crear la clase.");
      setSaving(false);
      return;
    }

    const syncedNewResources = syncLegacyLinksFromResources(newAula.resources, newAula);
    const { error: templateError } = await supabase
      .from("clase_templates" as any)
      .upsert(
        {
          aula_id: aulaCreated.id,
          titulo: newAula.titulo.trim() || "Clase Virtual",
          mp4_url: syncedNewResources.mp4_url || null,
          pdf_url: syncedNewResources.pdf_url || null,
          glb_url: syncedNewResources.glb_url || null,
          updated_by: user.id,
          metadata: { resource_playlist: syncedNewResources.resources },
        },
        { onConflict: "aula_id" },
      );
    if (templateError) {
      toast.error("La clase se creó, pero faltó guardar recursos iniciales.");
    } else {
      toast.success("Clase creada y configurada.");
    }

    setNewAula({
      nombre: "",
      slug: "",
      descripcion: "",
      titulo: "Clase Virtual",
      mp4_url: "",
      pdf_url: "",
      glb_url: "",
      resources: [],
    });
    await loadData();
    setSaving(false);
  };

  const saveAula = async (aulaId: string) => {
    if (!canManage || saving) return;
    const draft = drafts[aulaId];
    if (!draft) return;

    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;
    if (!user) return;
    const syncedDraft = syncLegacyLinksFromResources(draft.resources, draft);

    setSaving(true);
    const { error: aulaError } = await supabase
      .from("aulas_virtuales" as any)
      .update({
        nombre: draft.nombre.trim() || "Clase Virtual",
        slug: slugify(draft.slug || draft.nombre),
        descripcion: draft.descripcion.trim() || null,
      })
      .eq("id", aulaId);
    if (aulaError) {
      toast.error(aulaError.message);
      setSaving(false);
      return;
    }

    const { error: templateError } = await supabase
      .from("clase_templates" as any)
      .upsert(
        {
          aula_id: aulaId,
          titulo: draft.titulo.trim() || "Clase Virtual",
          mp4_url: syncedDraft.mp4_url || null,
          pdf_url: syncedDraft.pdf_url || null,
          glb_url: syncedDraft.glb_url || null,
          updated_by: user.id,
          metadata: { resource_playlist: syncedDraft.resources },
        },
        { onConflict: "aula_id" },
      );
    if (templateError) {
      toast.error(templateError.message);
      setSaving(false);
      return;
    }

    // Si la clase está en vivo, sincronizamos su snapshot para que alumno vea los cambios al instante.
    const liveSnapshot = {
      titulo: draft.titulo.trim() || "Clase Virtual",
      mp4_url: syncedDraft.mp4_url || null,
      pdf_url: syncedDraft.pdf_url || null,
      glb_url: syncedDraft.glb_url || null,
      metadata: { resource_playlist: syncedDraft.resources },
    };
    const { error: liveSyncError } = await supabase
      .from("clase_sesiones" as any)
      .update({ state_snapshot: liveSnapshot })
      .eq("aula_id", aulaId)
      .eq("status", "live");
    if (liveSyncError) {
      toast.error("Se guardó la clase, pero no se pudo sincronizar la sesión en vivo.");
      setSaving(false);
      return;
    }

    toast.success("Clase actualizada.");
    await loadData();
    setSaving(false);
  };

  const copyClassLink = async (slug: string) => {
    const url = `${window.location.origin}/clase/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link de clase copiado.");
    } catch {
      toast.error("No se pudo copiar el link.");
    }
  };

  const class360Url = (aulaSlug: string, draft: AulaDraft): string => {
    const synced = syncLegacyLinksFromResources(draft.resources, draft);
    const videoUrls = synced.resources
      .filter((resource) => resource.type === "video")
      .map((resource) => resource.url.trim())
      .filter(Boolean);
    const params = new URLSearchParams();
    const normalizedSlug = slugify(aulaSlug.trim() || draft.nombre);
    if (normalizedSlug) params.set("class", normalizedSlug);
    if (synced.mp4_url) params.set("mp4", synced.mp4_url);
    if (synced.pdf_url) params.set("pdf", synced.pdf_url);
    if (synced.glb_url) params.set("glb", synced.glb_url);
    for (const videoUrl of videoUrls) params.append("video", videoUrl);
    const q = params.toString();
    return q ? `/coliseo?${q}` : "/coliseo";
  };

  const enterClassroom = async (aulaId: string, draft: AulaDraft) => {
    if (saving) return;
    await saveAula(aulaId);
    navigate(class360Url(draft.slug, draft));
  };

  const startSession = async (aulaId: string, draft: AulaDraft) => {
    if (saving) return;
    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;
    if (!user) return;
    const syncedDraft = syncLegacyLinksFromResources(draft.resources, draft);
    setSaving(true);

    // Persistimos plantilla antes de iniciar para que "volver atrás" no recupere links viejos.
    const { error: templateSyncError } = await supabase
      .from("clase_templates" as any)
      .upsert(
        {
          aula_id: aulaId,
          titulo: draft.titulo.trim() || "Clase Virtual",
          mp4_url: syncedDraft.mp4_url || null,
          pdf_url: syncedDraft.pdf_url || null,
          glb_url: syncedDraft.glb_url || null,
          updated_by: user.id,
          metadata: { resource_playlist: syncedDraft.resources },
        },
        { onConflict: "aula_id" },
      );
    if (templateSyncError) {
      toast.error("No se pudieron guardar los links antes de iniciar la clase.");
      setSaving(false);
      return;
    }

    await supabase
      .from("clase_sesiones" as any)
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("aula_id", aulaId)
      .eq("status", "live");

    const snapshot = {
      titulo: draft.titulo.trim() || "Clase Virtual",
      mp4_url: syncedDraft.mp4_url || null,
      pdf_url: syncedDraft.pdf_url || null,
      glb_url: syncedDraft.glb_url || null,
      metadata: { resource_playlist: syncedDraft.resources },
    };

    const { error } = await supabase
      .from("clase_sesiones" as any)
      .insert({
        aula_id: aulaId,
        host_id: user.id,
        status: "live",
        state_snapshot: snapshot,
      });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Clase iniciada en vivo.");
      await loadData();
    }
    setSaving(false);
  };

  const endSession = async (aulaId: string) => {
    if (saving) return;
    setSaving(true);
    const { error } = await supabase
      .from("clase_sesiones" as any)
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("aula_id", aulaId)
      .eq("status", "live");
    if (error) toast.error(error.message);
    else {
      toast.success("Clase finalizada.");
      await loadData();
    }
    setSaving(false);
  };

  const setMemberStatus = async (memberId: string, estado: "approved" | "blocked") => {
    if (saving) return;
    setSaving(true);
    const { error } = await supabase
      .from("aula_miembros" as any)
      .update({ estado })
      .eq("id", memberId);
    if (error) toast.error(error.message);
    else {
      toast.success(estado === "approved" ? "Estudiante aprobado." : "Estudiante bloqueado.");
      await loadData();
    }
    setSaving(false);
  };

  const addResourceToDraft = (aulaId: string, type: ClassResourceType) => {
    setDrafts((prev) => {
      const current = prev[aulaId];
      if (!current) return prev;
      const synced = syncLegacyLinksFromResources([...current.resources, emptyClassResource(type)], current);
      return { ...prev, [aulaId]: { ...current, ...synced } };
    });
  };

  const updateDraftResource = (
    aulaId: string,
    resourceId: string,
    key: keyof Pick<ClassResourceItem, "title" | "url" | "type">,
    value: string,
  ) => {
    setDrafts((prev) => {
      const current = prev[aulaId];
      if (!current) return prev;
      const nextResources = current.resources.map((resource) =>
        resource.id === resourceId
          ? {
              ...resource,
              [key]: key === "type" ? (value as ClassResourceType) : value,
            }
          : resource,
      );
      const synced = syncLegacyLinksFromResources(nextResources, current);
      return { ...prev, [aulaId]: { ...current, ...synced } };
    });
  };

  const removeDraftResource = (aulaId: string, resourceId: string) => {
    setDrafts((prev) => {
      const current = prev[aulaId];
      if (!current) return prev;
      const nextResources = current.resources.filter((resource) => resource.id !== resourceId);
      const synced = syncLegacyLinksFromResources(nextResources, current);
      return { ...prev, [aulaId]: { ...current, ...synced } };
    });
  };

  const addResourceToNewAula = (type: ClassResourceType) => {
    setNewAula((prev) => {
      const synced = syncLegacyLinksFromResources([...prev.resources, emptyClassResource(type)], prev);
      return { ...prev, ...synced };
    });
  };

  const updateNewAulaResource = (
    resourceId: string,
    key: keyof Pick<ClassResourceItem, "title" | "url" | "type">,
    value: string,
  ) => {
    setNewAula((prev) => {
      const nextResources = prev.resources.map((resource) =>
        resource.id === resourceId
          ? {
              ...resource,
              [key]: key === "type" ? (value as ClassResourceType) : value,
            }
          : resource,
      );
      const synced = syncLegacyLinksFromResources(nextResources, prev);
      return { ...prev, ...synced };
    });
  };

  const removeNewAulaResource = (resourceId: string) => {
    setNewAula((prev) => {
      const nextResources = prev.resources.filter((resource) => resource.id !== resourceId);
      const synced = syncLegacyLinksFromResources(nextResources, prev);
      return { ...prev, ...synced };
    });
  };

  return (
    <div className="relative min-h-screen w-full max-w-full overflow-x-clip overflow-y-auto bg-background">
      <Navbar />
      <main className="relative z-20 px-4 pb-20 pt-20 md:px-6">
        <div className="container mx-auto max-w-5xl">
          <div className="mb-6 flex items-center justify-between gap-3">
            <h1 className="font-display text-2xl font-bold md:text-3xl">
              Panel <span className="text-gradient-neon">Docente</span>
            </h1>
            <Button asChild variant="outline" size="sm">
              <Link to="/educacion">Volver</Link>
            </Button>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando panel docente…</p>
          ) : !canManage ? (
            <div className="rounded-xl border border-amber-300/30 bg-amber-500/10 p-4 text-sm text-amber-100">
              Tu cuenta actual no tiene rol docente/admin. Cuando te apruebe el administrador,
              aquí podrás crear y gestionar tus clases.
            </div>
          ) : (
            <>
              <form
                onSubmit={createAula}
                className="mb-8 grid gap-3 rounded-2xl border border-cyan-400/25 bg-card/45 p-4 backdrop-blur md:grid-cols-2"
              >
                <div>
                  <Label>Nombre de la clase</Label>
                  <Input
                    value={newAula.nombre}
                    onChange={(e) => setNewAula((prev) => ({ ...prev, nombre: e.target.value }))}
                    placeholder="Clase Virtual 360"
                  />
                </div>
                <div>
                  <Label>ID / slug de clase</Label>
                  <Input
                    value={newAula.slug}
                    onChange={(e) => setNewAula((prev) => ({ ...prev, slug: e.target.value }))}
                    placeholder="clase-virtual-360"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Descripción</Label>
                  <Textarea
                    value={newAula.descripcion}
                    onChange={(e) => setNewAula((prev) => ({ ...prev, descripcion: e.target.value }))}
                    placeholder="Descripción corta de la clase"
                  />
                </div>
                <div>
                  <Label>Título visible en sala</Label>
                  <Input
                    value={newAula.titulo}
                    onChange={(e) => setNewAula((prev) => ({ ...prev, titulo: e.target.value }))}
                    placeholder="Clase Virtual"
                  />
                </div>
                <div className="md:col-span-2 space-y-2 rounded-lg border border-border/50 bg-background/40 p-3">
                  <p className="text-sm font-medium">Recursos de la clase (playlist docente)</p>
                  <p className="text-xs text-muted-foreground">
                    Puedes mezclar videos (MP4 o YouTube), PDFs y modelos GLB. Los estudiantes solo podrán visualizar y navegar.
                  </p>
                  {newAula.resources.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Aún no agregas recursos.</p>
                  ) : (
                    <div className="space-y-2">
                      {newAula.resources.map((resource) => (
                        <div key={resource.id} className="grid gap-2 rounded border border-border/40 p-2 md:grid-cols-[150px_1fr_1.2fr_auto]">
                          <select
                            className="h-10 rounded-md border border-input bg-background px-2 text-sm"
                            value={resource.type}
                            onChange={(e) => updateNewAulaResource(resource.id, "type", e.target.value)}
                          >
                            <option value="video">Video</option>
                            <option value="pdf">PDF</option>
                            <option value="glb">GLB</option>
                          </select>
                          <Input
                            value={resource.title}
                            onChange={(e) => updateNewAulaResource(resource.id, "title", e.target.value)}
                            placeholder="Título visible"
                          />
                          <Input
                            value={resource.url}
                            onChange={(e) => updateNewAulaResource(resource.id, "url", e.target.value)}
                            placeholder="https://... (YouTube, PDF, GLB o MP4)"
                          />
                          <Button type="button" variant="outline" size="icon" onClick={() => removeNewAulaResource(resource.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => addResourceToNewAula("video")}>
                      <Plus className="mr-2 h-4 w-4" />
                      Agregar video
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => addResourceToNewAula("pdf")}>
                      <Plus className="mr-2 h-4 w-4" />
                      Agregar PDF
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => addResourceToNewAula("glb")}>
                      <Plus className="mr-2 h-4 w-4" />
                      Agregar GLB
                    </Button>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <Button type="submit" className="w-full md:w-auto" disabled={saving}>
                    <Plus className="mr-2 h-4 w-4" />
                    Crear clase
                  </Button>
                </div>
              </form>

              <div className="space-y-4">
                {aulas.length === 0 && (
                  <p className="text-sm text-muted-foreground">Aún no tienes clases creadas.</p>
                )}
                {aulas.map((aula) => {
                  const draft = drafts[aula.id];
                  if (!draft) return null;
                  const currentSession = sessionsByAula[aula.id];
                  const members = membersByAula[aula.id] ?? [];
                  const pendingMembers = members.filter((m) => m.estado === "pending");
                  return (
                    <section
                      key={aula.id}
                      className="grid gap-3 rounded-2xl border border-border/40 bg-card/40 p-4 md:grid-cols-2"
                    >
                      <div>
                        <Label>Nombre</Label>
                        <Input
                          value={draft.nombre}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [aula.id]: { ...prev[aula.id], nombre: e.target.value },
                            }))
                          }
                        />
                      </div>
                      <div>
                        <Label>Slug</Label>
                        <Input
                          value={draft.slug}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [aula.id]: { ...prev[aula.id], slug: e.target.value },
                            }))
                          }
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label>Descripción</Label>
                        <Textarea
                          value={draft.descripcion}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [aula.id]: { ...prev[aula.id], descripcion: e.target.value },
                            }))
                          }
                        />
                      </div>
                      <div>
                        <Label>Título visible</Label>
                        <Input
                          value={draft.titulo}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [aula.id]: { ...prev[aula.id], titulo: e.target.value },
                            }))
                          }
                        />
                      </div>
                      <div className="md:col-span-2 space-y-2 rounded-lg border border-border/50 bg-background/40 p-3">
                        <p className="text-sm font-medium">Recursos de la clase</p>
                        {draft.resources.length === 0 ? (
                          <p className="text-xs text-muted-foreground">Sin recursos configurados.</p>
                        ) : (
                          <div className="space-y-2">
                            {draft.resources.map((resource) => (
                              <div
                                key={resource.id}
                                className="grid gap-2 rounded border border-border/40 p-2 md:grid-cols-[150px_1fr_1.2fr_auto]"
                              >
                                <select
                                  className="h-10 rounded-md border border-input bg-background px-2 text-sm"
                                  value={resource.type}
                                  onChange={(e) => updateDraftResource(aula.id, resource.id, "type", e.target.value)}
                                >
                                  <option value="video">Video</option>
                                  <option value="pdf">PDF</option>
                                  <option value="glb">GLB</option>
                                </select>
                                <Input
                                  value={resource.title}
                                  onChange={(e) => updateDraftResource(aula.id, resource.id, "title", e.target.value)}
                                  placeholder="Título visible"
                                />
                                <Input
                                  value={resource.url}
                                  onChange={(e) => updateDraftResource(aula.id, resource.id, "url", e.target.value)}
                                  placeholder="https://... (YouTube, PDF, GLB o MP4)"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  onClick={() => removeDraftResource(aula.id, resource.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={() => addResourceToDraft(aula.id, "video")}>
                            <Plus className="mr-2 h-4 w-4" />
                            Agregar video
                          </Button>
                          <Button type="button" variant="outline" size="sm" onClick={() => addResourceToDraft(aula.id, "pdf")}>
                            <Plus className="mr-2 h-4 w-4" />
                            Agregar PDF
                          </Button>
                          <Button type="button" variant="outline" size="sm" onClick={() => addResourceToDraft(aula.id, "glb")}>
                            <Plus className="mr-2 h-4 w-4" />
                            Agregar GLB
                          </Button>
                        </div>
                      </div>
                      <div className="md:col-span-2 flex flex-wrap gap-2">
                        <Button type="button" onClick={() => void saveAula(aula.id)} disabled={saving}>
                          <Save className="mr-2 h-4 w-4" />
                          Guardar
                        </Button>
                        <Button type="button" variant="outline" onClick={() => void copyClassLink(draft.slug)}>
                          <Copy className="mr-2 h-4 w-4" />
                          Copiar link alumno
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => void enterClassroom(aula.id, draft)}
                          disabled={saving}
                        >
                          Entrar a clase
                        </Button>
                        {currentSession?.status === "live" ? (
                          <>
                            <Button type="button" variant="destructive" onClick={() => void endSession(aula.id)} disabled={saving}>
                              <StopCircle className="mr-2 h-4 w-4" />
                              Finalizar clase
                            </Button>
                          </>
                        ) : (
                          <Button type="button" onClick={() => void startSession(aula.id, draft)} disabled={saving}>
                            <UserCheck2 className="mr-2 h-4 w-4" />
                            Iniciar clase
                          </Button>
                        )}
                      </div>
                      <div className="md:col-span-2 rounded-lg border border-border/50 bg-background/40 p-3">
                        <p className="mb-2 flex items-center gap-2 text-sm font-medium">
                          <Users className="h-4 w-4" />
                          Solicitudes de estudiantes ({pendingMembers.length})
                        </p>
                        {pendingMembers.length === 0 ? (
                          <p className="text-xs text-muted-foreground">No hay solicitudes pendientes.</p>
                        ) : (
                          <div className="space-y-2">
                            {pendingMembers.map((member) => (
                              <div key={member.id} className="flex items-center justify-between rounded border border-border/40 p-2 text-xs">
                                <span>{member.user_id}</span>
                                <div className="flex gap-2">
                                  <Button type="button" size="sm" variant="outline" onClick={() => void setMemberStatus(member.id, "approved")}>
                                    <Check className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button type="button" size="sm" variant="outline" onClick={() => void setMemberStatus(member.id, "blocked")}>
                                    <X className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </section>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
