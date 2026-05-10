import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HomeOnniVersSeoSection from "@/components/HomeOnniVersSeoSection";
import WorldCupVrHero from "@/components/WorldCupVrHero";

const Index = () => {
  const location = useLocation();

  useEffect(() => {
    const scrollTo = (location.state as any)?.scrollTo;
    if (scrollTo) {
      setTimeout(() => {
        document.getElementById(scrollTo)?.scrollIntoView({ behavior: "smooth" });
      }, 300);
    }
  }, [location.state]);

  return (
    <div className="min-h-screen bg-background">
      <section id="perfil" className="relative">
        <Navbar />
        <WorldCupVrHero />
        <HomeOnniVersSeoSection />
        <Footer />
      </section>
    </div>
  );
};

export default Index;
