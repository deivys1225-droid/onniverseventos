import { motion } from "framer-motion";
import { Radio, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { salaRoomOverlayBar, salaRoomOverlayIcon } from "@/components/salas/salaRoomCardStyles";
import { publicAssetUrl } from "@/lib/publicAssetUrl";

const CONCIERTOS_LIVE_IMAGE = publicAssetUrl("eventos-inmersivos.jpeg");

/** Tarjeta en inicio → configuración de tarjeta en Conciertos Live. */
const ConciertosLiveHomeCard = () => {
  const navigate = useNavigate();

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
      onClick={() => navigate("/conciertos-live/config")}
      className="group w-full cursor-pointer select-none rounded-xl border border-amber-400/45 bg-card/40 p-3 text-left shadow-[0_0_36px_-14px_rgba(250,204,21,0.5)] backdrop-blur-xl transition-all duration-500 hover:border-amber-300/55 hover:shadow-[0_0_42px_-10px_rgba(250,204,21,0.65)] sm:rounded-2xl sm:p-3.5"
      aria-label="Configurar tarjeta Live Premium en Conciertos Live"
    >
      <div className="relative overflow-hidden rounded-xl border border-amber-400/25">
        <img
          src={CONCIERTOS_LIVE_IMAGE}
          alt="Eventos live premium en OnniVers"
          className="h-14 w-full object-cover transition-transform duration-500 group-hover:scale-[1.02] sm:h-16"
          loading="lazy"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/85 via-background/20 to-transparent" />
      </div>

      <div
        className={`mt-2 flex items-center justify-between rounded-lg border border-amber-200/20 bg-black/50 text-amber-100 backdrop-blur-md ${salaRoomOverlayBar}`}
      >
        <span className="flex items-center gap-1">
          <Radio className={`${salaRoomOverlayIcon} text-amber-300`} aria-hidden />
          Live
        </span>
        <span className="flex items-center gap-0.5 text-amber-200/90">
          <Sparkles className={salaRoomOverlayIcon} aria-hidden />
          Premium
        </span>
      </div>
    </motion.button>
  );
};

export default ConciertosLiveHomeCard;
