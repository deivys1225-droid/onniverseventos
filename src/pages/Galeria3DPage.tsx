import { FormEvent, useState } from "react";
import { Box } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SectionHeader from "@/components/salas/SectionHeader";
import EducationSection from "@/components/EducationSection";
import BackToProfileHomeButton from "@/components/BackToProfileHomeButton";
import { Button } from "@/components/ui/button";

const Galeria3DPage = () => {
  const navigate = useNavigate();
  const [showStudentEntry, setShowStudentEntry] = useState(false);
  const [classLinkInput, setClassLinkInput] = useState("");

  const resolveClassSlug = (value: string): string => {
    const raw = value.trim();
    if (!raw) return "";

    if (/^https?:\/\//i.test(raw)) {
      try {
        const url = new URL(raw);
        const parts = url.pathname.split("/").filter(Boolean);
        const claseIdx = parts.findIndex((part) => part.toLowerCase() === "clase");
        if (claseIdx >= 0 && parts[claseIdx + 1]) return parts[claseIdx + 1];
      } catch {
        return "";
      }
    }

    const cleaned = raw.replace(/^\/+/, "");
    if (cleaned.toLowerCase().startsWith("clase/")) {
      return cleaned.slice("clase/".length).trim();
    }
    return cleaned;
  };

  const handleStudentClassEntry = (event: FormEvent) => {
    event.preventDefault();
    const slug = resolveClassSlug(classLinkInput);
    if (!slug) return;
    navigate(`/clase/${encodeURIComponent(slug)}`);
  };

  return (
    <div className="relative min-h-screen w-full max-w-full overflow-x-clip overflow-y-auto bg-background" data-camera-page-root>
      <Navbar />

      <div className="pointer-events-none fixed inset-0" data-camera-decorative-bg>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_5%,hsl(var(--primary)/0.18),transparent_35%),radial-gradient(circle_at_85%_95%,hsl(290_80%_60%/0.16),transparent_40%)]" />
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
      </div>

      <main className="relative z-20 px-6 pt-20 pb-20">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-6">
            <BackToProfileHomeButton />
          </div>
          <section id="galeria-3d" className="scroll-mt-24">
            <SectionHeader
              badge="Lobby 3D"
              icon={Box}
              title="CONTENIDO"
              highlight="3D"
              subtitle="Vista previa de contenido 3D del lobby educativo/recreativo: abecedario, dinosaurios, Tierra, anatomía y más."
              accent="border-amber-400/40 bg-amber-500/10 text-amber-100"
            />

            <article className="mb-10 scroll-mt-28 overflow-hidden rounded-2xl border border-cyan-400/35 bg-gradient-to-br from-cyan-500/10 via-card/50 to-violet-500/10 p-5 backdrop-blur-xl sm:p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
                <div className="relative h-44 shrink-0 overflow-hidden rounded-xl border border-white/10 sm:h-48 lg:w-72">
                  <img
                    src={`${import.meta.env.BASE_URL}educacion-inmersiva.jpeg`}
                    alt="Clase virtual inmersiva en OnniVers"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/70 to-transparent" />
                </div>
                <div className="flex-1">
                  <p className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-100">
                    Clase Virtual 360
                  </p>
                  <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                    Clase Virtual 360
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
                    Espacio educativo inmersivo donde se reciben clases virtuales en tiempo real,
                    dictadas por el docente para estudiantes conectados desde web o app.
                  </p>
                  <Button asChild variant="outline" size="sm" className="mt-4 touch-manipulation">
                    <Link to="/docente-clases">Panel docente (crear clase)</Link>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2 touch-manipulation"
                    onClick={() => setShowStudentEntry((prev) => !prev)}
                  >
                    Entrar a clases (alumno)
                  </Button>
                  {showStudentEntry ? (
                    <form onSubmit={handleStudentClassEntry} className="mt-3 max-w-xl space-y-2">
                      <input
                        type="text"
                        value={classLinkInput}
                        onChange={(e) => setClassLinkInput(e.target.value)}
                        placeholder="Pega aquí el link de clase o solo el slug"
                        className="w-full rounded-md border border-white/15 bg-background/70 px-3 py-2 text-sm text-foreground outline-none ring-0 transition focus:border-cyan-300/60"
                      />
                      <Button type="submit" size="sm" disabled={!classLinkInput.trim()}>
                        Ir a mi clase
                      </Button>
                    </form>
                  ) : null}
                </div>
              </div>
            </article>

            <div className="mb-10 overflow-hidden rounded-2xl border border-primary/20 bg-card/30 backdrop-blur-sm">
              <EducationSection />
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Galeria3DPage;
