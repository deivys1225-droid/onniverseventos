import { Box } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SectionHeader from "@/components/salas/SectionHeader";
import Galeria3DModelsGrid from "@/components/galeria3d/Galeria3DModelsGrid";
import BackToProfileHomeButton from "@/components/BackToProfileHomeButton";

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
            <Galeria3DModelsGrid />
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Galeria3DPage;
