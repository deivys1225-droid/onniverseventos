import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
};

type Member = {
  id: string;
  estado: "approved" | "pending" | "blocked";
  rol: string;
};

export default function ClaseVirtualEntryPage() {
  const { slug = "" } = useParams();
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [aula, setAula] = useState<Aula | null>(null);
  const [template, setTemplate] = useState<Template | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [role, setRole] = useState<string>("particular");

  const canEnter = useMemo(() => {
    if (!aula) return false;
    if (role === "admin") return true;
    if (member?.estado === "approved") return true;
    return false;
  }, [aula, member?.estado, role]);

  const classUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (template?.mp4_url) params.set("mp4", template.mp4_url);
    if (template?.pdf_url) params.set("pdf", template.pdf_url);
    const q = params.toString();
    return q ? `/coliseo?${q}` : "/coliseo";
  }, [template?.mp4_url, template?.pdf_url]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;
    if (!user) {
      setLoading(false);
      return;
    }

    const { data: profileData } = await supabase
      .from("profiles")
      .select("app_role")
      .eq("id", user.id)
      .maybeSingle();
    setRole(((profileData as { app_role?: string } | null)?.app_role ?? "particular") as string);

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
      .select("titulo,mp4_url,pdf_url,glb_url")
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
    setMember((memberData as Member | null) ?? null);
    setLoading(false);
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

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

              <div className="mt-6 flex flex-wrap gap-2">
                {canEnter ? (
                  <Button asChild>
                    <Link to={classUrl}>Entrar a clase 360</Link>
                  </Button>
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
