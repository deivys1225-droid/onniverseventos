import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Play, Headphones } from "lucide-react";
import heroBg from "@/assets/adh-lobby.jpg";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0">
        <img
          src={heroBg}
          alt="Lobby esférico ADH Speak Peak — ambiente inmersivo de eventos OnniVers"
          className="w-full h-full object-cover"
          width={1920}
          height={1080}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-transparent to-background/80" />
      </div>

      {/* CTAs only — clean minimalist view */}
      <div className="relative z-10 container mx-auto px-6 flex flex-col items-center justify-end pb-24 min-h-screen">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
          className="pointer-events-auto flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Button variant="hero" size="lg" className="text-base px-8 py-6">
            <Play className="w-5 h-5" />
            Explorar eventos
          </Button>
          <Button variant="heroOutline" size="lg" className="text-base px-8 py-6">
            <Headphones className="w-5 h-5" />
            Experiencia VR
          </Button>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-10 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center pt-2">
            <div className="w-1 h-2 bg-primary rounded-full" />
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
