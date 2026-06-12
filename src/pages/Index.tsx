import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HomeOnniVersSeoSection from "@/components/HomeOnniVersSeoSection";
import WorldCupVrHero from "@/components/WorldCupVrHero";
import BackToProfileHomeButton from "@/components/BackToProfileHomeButton";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    const scrollTo = (location.state as any)?.scrollTo;
    if (scrollTo) {
      setTimeout(() => {
        document.getElementById(scrollTo)?.scrollIntoView({ behavior: "smooth" });
      }, 300);
    }
  }, [location.state]);

  return (
    <div className="min-h-screen bg-background" data-camera-page-root>
      <section id="perfil" className="relative z-20">
        <Navbar />
        {user ? (
          <div className="relative z-20 mx-auto max-w-7xl px-6 pt-20 pb-2">
            <BackToProfileHomeButton />
          </div>
        ) : null}
        <WorldCupVrHero />
        <HomeOnniVersSeoSection />
        <Footer />
      </section>
    </div>
  );
};

export default Index;
