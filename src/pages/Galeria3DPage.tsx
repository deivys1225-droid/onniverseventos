import { Box, GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SectionHeader from "@/components/salas/SectionHeader";
import Galeria3DModelsGrid from "@/components/galeria3d/Galeria3DModelsGrid";
import BackToProfileHomeButton from "@/components/BackToProfileHomeButton";
import { Button } from "@/components/ui/button";
import { AULA_VIRTUAL_PATH } from "@/lib/aulaVirtual";

const Galeria3DPage = () => {
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
              badge="Galería OnniVers"
              icon={Box}
              title="MODELOS"
              highlight="3D"
              subtitle="Explora hologramas 3D gratuitos. Rótalos y estúdialos en tu espacio o en AR."
              accent="border-cyan-400/40 bg-cyan-500/10 text-cyan-200"
            />

            <article className="mb-10 overflow-hidden rounded-2xl border border-amber-400/35 bg-gradient-to-br from-amber-500/10 via-card/50 to-cyan-500/10 p-5 backdrop-blur-xl sm:p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
                <div className="relative h-44 shrink-0 overflow-hidden rounded-xl border border-white/10 sm:h-48 lg:w-72">
                  <img
                    src={`${import.meta.env.BASE_URL}educacion-inmersiva.jpeg`}
                    alt="Aula virtual inmersiva OnniVers"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/70 to-transparent" />
                </div>
                <div className="flex-1">
                  <p className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-100">
                    <GraduationCap className="h-3.5 w-3.5" aria-hidden />
                    Nuevo espacio inmersivo
                  </p>
                  <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                    Aula Virtual
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
                    Entra a la sala 3D caminable con pupitres, pizarra y luz de aula. Mismos controles
                    que el lobby inmersivo.
                  </p>
                  <Button asChild variant="heroOutline" size="sm" className="mt-4 touch-manipulation">
                    <Link to={AULA_VIRTUAL_PATH}>Entrar al Aula Virtual</Link>
                  </Button>
                </div>
              </div>
            </article>

            <Galeria3DModelsGrid />
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Galeria3DPage;
