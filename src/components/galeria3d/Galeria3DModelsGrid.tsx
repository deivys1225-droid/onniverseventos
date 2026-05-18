import { motion } from "framer-motion";
import { Box } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GALERIA_3D_MODELS, openImmersiveModel, type Galeria3DModel } from "@/lib/galeria3dModels";

function ModelCard({ model, index }: { model: Galeria3DModel; index: number }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ delay: index * 0.06 }}
      className="group flex h-full flex-col rounded-2xl border border-border/50 bg-card/40 p-5 backdrop-blur-xl transition-all duration-500 hover:-translate-y-1 hover:border-primary/50 hover:shadow-[0_0_45px_-10px_hsl(var(--primary)/0.5)]"
    >
      <div className="relative mb-4 overflow-hidden rounded-xl border border-primary/20">
        <img
          src={model.image}
          alt={model.title}
          className="h-44 w-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent" />
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between rounded-lg border border-white/10 bg-black/45 px-2 py-1 text-[10px] font-display uppercase tracking-wider text-cyan-200 backdrop-blur-md">
          <span className="flex items-center gap-1">
            <Box className="h-3 w-3 text-primary" />
            Modelo 3D
          </span>
          <span className="text-slate-300">GRATIS</span>
        </div>
      </div>
      <h3 className="font-display text-lg font-semibold text-foreground line-clamp-2">{model.title}</h3>
      <p className="mt-2 flex-1 text-sm text-muted-foreground line-clamp-3">{model.description}</p>
      <p className="mt-1 text-[10px] text-muted-foreground">{model.detail}</p>
      {model.imageAttribution && model.imageAttributionUrl && model.licenseUrl && (
        <p className="mt-2 text-[9px] leading-snug text-muted-foreground/85 line-clamp-2">
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
        className="mt-4 w-full min-h-9 text-xs font-semibold touch-manipulation"
        onClick={() => openImmersiveModel(model.modelUrl, model.title)}
      >
        Ver en 3D
      </Button>
    </motion.article>
  );
}

export default function Galeria3DModelsGrid() {
  return (
    <motion.div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {GALERIA_3D_MODELS.map((model, index) => (
        <ModelCard key={model.id} model={model} index={index} />
      ))}
    </motion.div>
  );
}
