import Navbar from "@/components/Navbar";
import EducationSection from "@/components/EducationSection";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const EducacionPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-16">
        <div className="container mx-auto px-4 pt-4">
          <div className="mb-4 rounded-xl border border-cyan-400/30 bg-cyan-500/10 p-4 backdrop-blur-sm">
            <h2 className="font-display text-lg font-semibold text-cyan-100">Panel Docente de Clases</h2>
            <p className="mt-1 text-sm text-cyan-50/90">
              Crea y configura tu clase virtual (MP4, PDF y GLB), luego comparte el link con tus estudiantes.
            </p>
            <Button asChild className="mt-3">
              <Link to="/docente-clases">Abrir panel docente</Link>
            </Button>
          </div>
        </div>
        <EducationSection />
      </div>
    </div>
  );
};

export default EducacionPage;
