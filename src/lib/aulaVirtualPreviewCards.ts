import abecedarioPreviewImg from "@/assets/aula-preview/abecedario.png";
import dinosauriosPreviewImg from "@/assets/aula-preview/dinosaurios.png";
import { publicAssetUrl } from "@/lib/publicAssetUrl";

/**
 * Tarjetas solo informativas: describen qué verán dentro del Aula Virtual.
 * No abren modelos ni enlaces de acción.
 */
export type AulaVirtualPreviewCard = {
  id: string;
  title: string;
  description: string;
  detail: string;
  image: string;
  badge: string;
  imageAttribution?: string;
  imageAttributionUrl?: string;
  licenseUrl?: string;
};

export const AULA_VIRTUAL_PREVIEW_CARDS: AulaVirtualPreviewCard[] = [
  {
    id: "abecedario",
    title: "Abecedario y números 3D",
    description:
      "En la pared derecha del aula encontrarás letras del A al Z y los números del 0 al 9 en cubos de colores, ideales para lectoescritura y matemáticas tempranas.",
    detail: "Pared de aprendizaje · cubos 3D",
    badge: "En el aula",
    image: abecedarioPreviewImg,
  },
  {
    id: "dinosaurios",
    title: "Dinosaurios en la pared",
    description:
      "Tres modelos 3D giratorios: T-Rex, Diplodocus y un dinosaurio genérico. Refuerzan ciencias naturales y paleontología mientras recorres la sala.",
    detail: "Modelos .glb · pared izquierda",
    badge: "En el aula",
    image: dinosauriosPreviewImg,
  },
  {
    id: "tierra-luna",
    title: "Tierra y Luna",
    description:
      "Planeta Tierra con nubes, luces nocturnas y órbita de la Luna en el fondo del aula. Sirve para geografía, astronomía y conciencia del sistema solar.",
    detail: "Globo terráqueo 3D · fondo de sala",
    badge: "En el aula",
    image: publicAssetUrl("assets/textures/earth/earth_day_4096.jpg"),
  },
  {
    id: "corazon",
    title: "Corazón humano 3D",
    description:
      "Holograma del corazón en la pared trasera para estudiar anatomía cardiovascular de forma visual e interactiva dentro del recorrido del aula.",
    detail: "Modelo .glb · anatomía",
    badge: "En el aula",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d2/3D_model_of_a_human_heart.stl/1280px-3D_model_of_a_human_heart.stl.png",
    imageAttribution: "neshallads / Wikimedia Commons",
    imageAttributionUrl: "https://commons.wikimedia.org/wiki/File:3D_model_of_a_human_heart.stl",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
  },
  {
    id: "cerebro",
    title: "Cerebro 3D",
    description:
      "Modelo del cerebro humano en la pared del aula, pensado para neurociencia básica, biología y educación en salud mental.",
    detail: "Modelo .glb · neuroanatomía",
    badge: "En el aula",
    image:
      "https://images.unsplash.com/photo-1559757175-5700dde675bc?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "biblioteca",
    title: "Biblioteca en la pared",
    description:
      "Portadas de libros de la tienda OnniVers exhibidas como tarjetas 3D en la pared izquierda, conectando el aula con la biblioteca digital.",
    detail: "Tarjetas 3D · lectura",
    badge: "En el aula",
    image:
      "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&w=1200&q=80",
  },
];
