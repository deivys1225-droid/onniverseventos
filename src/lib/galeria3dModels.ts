import { Capacitor } from "@capacitor/core";
import { buildAgoraChannel } from "@/lib/agoraRooms";

export type Galeria3DModel = {
  id: string;
  title: string;
  description: string;
  detail: string;
  image: string;
  modelUrl: string;
  imageAttribution?: string;
  imageAttributionUrl?: string;
  licenseUrl?: string;
};

export const GALERIA_3D_MODELS: Galeria3DModel[] = [
  {
    id: "corazon",
    title: "Corazón Humano Interactivo (Holograma 3D)",
    description:
      "Explora la anatomía cardíaca en realidad aumentada. Rótalo y estúdialo como un holograma en tu espacio.",
    detail: "Modelo 3D interactivo",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d2/3D_model_of_a_human_heart.stl/1280px-3D_model_of_a_human_heart.stl.png",
    imageAttribution: "neshallads / Wikimedia Commons",
    imageAttributionUrl: "https://commons.wikimedia.org/wiki/File:3D_model_of_a_human_heart.stl",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    modelUrl: "/assets/models/corazon.glb",
  },
  {
    id: "geoquimico",
    title: "Modelo Geoquímico Interactivo (Holograma 3D)",
    description:
      "Explora procesos y estructuras geoquímicas en realidad aumentada. Rótalo y estúdialo como un holograma en tu espacio.",
    detail: "Modelo 3D interactivo",
    image:
      "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80",
    modelUrl:
      "https://res.cloudinary.com/dfsabdxup/image/upload/v1778502215/modelo_geoquimico_lwbh6v.glb",
  },
];

export function openImmersiveModel(modelUrl: string, title: string) {
  if (Capacitor.getPlatform() === "android") {
    if (typeof window.Android?.onArClick === "function") {
      window.Android.onArClick(modelUrl);
      return;
    }
    const params = new URLSearchParams();
    params.set("mp4", modelUrl);
    params.set("title", title);
    params.set("mode", "vod");
    const path = `/sala/espectador/${encodeURIComponent(buildAgoraChannel("main"))}?${params.toString()}`;
    window.location.assign(`${window.location.origin}${path}`);
    return;
  }
  window.open(modelUrl, "_blank", "noopener,noreferrer");
}
