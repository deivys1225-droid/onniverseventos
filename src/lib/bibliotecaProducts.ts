/** Primeros libros de la categoría Biblioteca (Tienda) para decoración 3D del aula. */
export type BibliotecaWallBook = {
  id: string;
  title: string;
  image: string;
  accent: string;
};

export const BIBLIOTECA_WALL_BOOKS: BibliotecaWallBook[] = [
  {
    id: "neural-cities",
    title: "Neural Cities",
    image: "/assets/biblioteca/neural-cities.jpg",
    accent: "#0EA5E9",
  },
  {
    id: "ia-creadores",
    title: "IA para Creadores",
    image: "/assets/biblioteca/ia-creadores.jpg",
    accent: "#8B5CF6",
  },
  {
    id: "economia-xr",
    title: "Economía XR",
    image: "/assets/biblioteca/economia-xr.jpg",
    accent: "#F59E0B",
  },
  {
    id: "guia-avatares",
    title: "Guía de Avatares",
    image: "/assets/biblioteca/guia-avatares.jpg",
    accent: "#EC4899",
  },
  {
    id: "historia-vr",
    title: "Historia del VR",
    image: "/assets/biblioteca/historia-vr.jpg",
    accent: "#10B981",
  },
  {
    id: "mindset-futurista",
    title: "Mindset Futurista",
    image: "/assets/biblioteca/mindset-futurista.jpg",
    accent: "#6366F1",
  },
];
