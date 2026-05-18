import { motion } from "framer-motion";
import { Box } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  salaRoomCardPadding,
  salaRoomDesc,
  salaRoomGrid3ColClass,
  salaRoomImageHeight,
  salaRoomImageWrapMb,
  salaRoomOverlayBar,
  salaRoomOverlayIcon,
  salaRoomPrimaryBtn,
  salaRoomTitle,
} from "@/components/salas/salaRoomCardStyles";
import { GALERIA_3D_MODELS, openImmersiveModel, type Galeria3DModel } from "@/lib/galeria3dModels";

function ModelCard({ model, index }: { model: Galeria3DModel; index: number }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ delay: index * 0.06 }}
      className={`group flex h-full flex-col rounded-2xl border border-border/50 bg-card/40 backdrop-blur-xl transition-all duration-500 hover:-translate-y-1 hover:border-primary/50 hover:shadow-[0_0_45px_-10px_hsl(var(--primary)/0.5)] ${salaRoomCardPadding}`}
    >
      <div className={`relative overflow-hidden rounded-xl border border-primary/20 ${salaRoomImageWrapMb}`}>
        <img
          src={model.image}
          alt={model.title}
          className={`${salaRoomImageHeight} w-full object-cover transition-transform duration-500 group-hover:scale-105`}
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent" />
        <div
          className={`absolute bottom-2 left-2 right-2 flex items-center justify-between rounded-lg border border-white/10 bg-black/45 text-cyan-200 backdrop-blur-md ${salaRoomOverlayBar}`}
        >
          <span className="flex items-center gap-1">
            <Box className={`${salaRoomOverlayIcon} text-primary`} />
            Modelo 3D
          </span>
          <span className="text-slate-300">GRATIS</span>
        </div>
      </div>
      <h3 className={`${salaRoomTitle} line-clamp-2`}>{model.title}</h3>
      <p className={`mt-2 flex-1 line-clamp-3 ${salaRoomDesc}`}>{model.description}</p>
      <p className="mt-1 text-[8px] text-muted-foreground sm:text-[10px]">{model.detail}</p>
      {model.imageAttribution && model.imageAttributionUrl && model.licenseUrl && (
        <p className="mt-2 text-[8px] leading-snug text-muted-foreground/85 line-clamp-2 sm:text-[9px]">
          Imagen:{" "}
          <a
            href={model.imageAttributionUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-primary"
          >
            {model.imageAttribution}
          </a>{" "}
          (
          <a
            href={model.licenseUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-primary"
          >
            CC BY 4.0
          </a>
          )
        </p>
      )}
      <Button
        type="button"
        variant="heroOutline"
        size="sm"
        className={`mt-3 touch-manipulation sm:mt-4 ${salaRoomPrimaryBtn}`}
        onClick={() => openImmersiveModel(model.modelUrl, model.title)}
      >
        Ver en 3D
      </Button>
    </motion.article>
  );
}

export default function Galeria3DModelsGrid() {
  return (
    <motion.div className={salaRoomGrid3ColClass}>
      {GALERIA_3D_MODELS.map((model, index) => (
        <ModelCard key={model.id} model={model} index={index} />
      ))}
    </motion.div>
  );
}
