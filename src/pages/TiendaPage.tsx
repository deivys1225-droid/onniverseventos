import { Capacitor } from "@capacitor/core";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { mapStoreCategoriesWithDynamicPrices } from "@/lib/pricing";
import { buildAgoraChannel } from "@/lib/agoraRooms";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Gem,
  ShieldCheck,
  TrendingUp,
  Mail,
  Ticket,
  BookOpen,
  GraduationCap,
  Building2,
  Radio,
  Paintbrush,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import PricingSection from "@/components/PricingSection";
import Footer from "@/components/Footer";
import StoreProductPayPal from "@/components/StoreProductPayPal";
import { useAuth } from "@/hooks/useAuth";
import type { SkinRarityLabel } from "@/lib/pricing";
import { hasVaultPurchase, type VaultItemType } from "@/lib/vaultItems";
import { supabase } from "@/integrations/supabase/client";

type CategoryId = "tickets" | "biblioteca" | "cursos" | "salas-pro" | "set-streamer" | "skins";

type Product = {
  title: string;
  description: string;
  detail: string;
  price: string;
  image: string;
  /** Añadido en runtime por `mapStoreCategoriesWithDynamicPrices` */
  priceUsd?: number;
  skinRarity?: SkinRarityLabel;
  actionUrl?: string;
  actionLabel?: string;
  imageAttribution?: string;
  imageAttributionUrl?: string;
  licenseUrl?: string;
};

const bibliotecaHeartProduct: Product = {
  title: "Corazón Humano Interactivo (Holograma 3D)",
  description:
    "Explora la anatomía cardíaca en realidad aumentada. Rótalo y estúdialo como un holograma en tu espacio.",
  detail: "Modelo 3D interactivo",
  price: "GRATIS",
  priceUsd: 0,
  image:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d2/3D_model_of_a_human_heart.stl/1280px-3D_model_of_a_human_heart.stl.png",
  imageAttribution: "neshallads / Wikimedia Commons",
  imageAttributionUrl: "https://commons.wikimedia.org/wiki/File:3D_model_of_a_human_heart.stl",
  licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
  actionUrl: "https://res.cloudinary.com/dfsabdxup/image/upload/v1778502197/el_corazon_dbhvfn.glb",
  actionLabel: "Ver",
};

const bibliotecaGeochemicalProduct: Product = {
  title: "Modelo Geoquímico Interactivo (Holograma 3D)",
  description:
    "Explora procesos y estructuras geoquímicas en realidad aumentada. Rótalo y estúdialo como un holograma en tu espacio.",
  detail: "Modelo 3D interactivo",
  price: "GRATIS",
  priceUsd: 0,
  image:
    "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80",
  actionUrl:
    "https://res.cloudinary.com/dfsabdxup/image/upload/v1778502215/modelo_geoquimico_lwbh6v.glb",
  actionLabel: "Ver",
};

type DynamicStoreProduct = {
  id: string;
  item_type: "biblioteca" | "cursos";
  title: string;
  cover_image_url: string;
  sale_price: number;
};

const storeCategories: {
  id: CategoryId;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  image: string;
  tags: string[];
  products: Product[];
}[] = [
  {
    id: "tickets",
    title: "Tickets",
    subtitle: "Boletas para eventos y conciertos.",
    icon: Ticket,
    image:
      "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&w=1400&q=80",
    tags: ["Eventos", "Conciertos", "Live"],
    products: [
      { title: "Mainstage Galaxy", description: "Acceso VIP inmersivo a concierto electrónico 360.", detail: "Stock: 240 tickets", price: "$15 USD", image: "https://images.unsplash.com/photo-1470229538611-16ba8c7ffbd7?auto=format&fit=crop&w=1200&q=80" },
      { title: "Rock Arena Prime", description: "Acceso VIP inmersivo con vista frontal del escenario.", detail: "Stock: 180 tickets", price: "$12 USD", image: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1200&q=80" },
      { title: "Teatro Royale VR", description: "Acceso VIP inmersivo para obra teatral exclusiva.", detail: "Stock: 120 tickets", price: "$8 USD", image: "https://images.unsplash.com/photo-1503095396549-807759245b35?auto=format&fit=crop&w=1200&q=80" },
      { title: "Festival Neon Night", description: "Acceso VIP inmersivo con backstage virtual.", detail: "Stock: 300 tickets", price: "$10 USD", image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1200&q=80" },
      { title: "Ópera Metaverse", description: "Acceso VIP inmersivo en palco premium.", detail: "Stock: 90 tickets", price: "$14 USD", image: "https://images.unsplash.com/photo-1460723237483-7a6dc9d0b212?auto=format&fit=crop&w=1200&q=80" },
      { title: "Stand-Up Infinity", description: "Acceso VIP inmersivo para show de comedia en vivo.", detail: "Stock: 200 tickets", price: "$6 USD", image: "https://images.unsplash.com/photo-1516307365426-bea591f05011?auto=format&fit=crop&w=1200&q=80" },
      { title: "Indie Session XR", description: "Acceso VIP inmersivo a acústico íntimo.", detail: "Stock: 140 tickets", price: "$5 USD", image: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=1200&q=80" },
      { title: "Symphonic Future", description: "Acceso VIP inmersivo con sonido espacial 3D.", detail: "Stock: 110 tickets", price: "$13 USD", image: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=1200&q=80" },
      { title: "Urban Beats Live", description: "Acceso VIP inmersivo y chat backstage.", detail: "Stock: 260 tickets", price: "$9 USD", image: "https://images.unsplash.com/photo-1501612780327-45045538702b?auto=format&fit=crop&w=1200&q=80" },
      { title: "Teatro Noir", description: "Acceso VIP inmersivo con vista director.", detail: "Stock: 100 tickets", price: "$7 USD", image: "https://images.unsplash.com/photo-1515169067865-5387ec356754?auto=format&fit=crop&w=1200&q=80" },
    ],
  },
  {
    id: "biblioteca",
    title: "Biblioteca",
    subtitle: "Venta de libros virtuales.",
    icon: BookOpen,
    image:
      "https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1400&q=80",
    tags: ["E-books", "VR", "Colecciones"],
    products: [
      { title: "Neural Cities", description: "Lectura en el metaverso sobre urbanismo digital.", detail: "Stock: 820 licencias", price: "$8 USD", image: "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?auto=format&fit=crop&w=1200&q=80" },
      { title: "IA para Creadores", description: "Lectura en el metaverso con casos prácticos.", detail: "Stock: 650 licencias", price: "$5 USD", image: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&w=1200&q=80" },
      { title: "Economía XR", description: "Lectura en el metaverso para modelos de negocio.", detail: "Stock: 410 licencias", price: "$7 USD", image: "https://images.unsplash.com/photo-1541963463532-d68292c34b19?auto=format&fit=crop&w=1200&q=80" },
      { title: "Guía de Avatares", description: "Lectura en el metaverso de diseño identitario.", detail: "Stock: 920 licencias", price: "$3 USD", image: "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=1200&q=80" },
      { title: "Historia del VR", description: "Lectura en el metaverso de evolución tecnológica.", detail: "Stock: 540 licencias", price: "$2 USD", image: "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=1200&q=80" },
      { title: "Mindset Futurista", description: "Lectura en el metaverso para alto rendimiento.", detail: "Stock: 700 licencias", price: "$6 USD", image: "https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1200&q=80" },
      { title: "Arte Holográfico", description: "Lectura en el metaverso con enfoque visual.", detail: "Stock: 300 licencias", price: "$4 USD", image: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=1200&q=80" },
      { title: "Programación Espacial", description: "Lectura en el metaverso para devs inmersivos.", detail: "Stock: 510 licencias", price: "$8 USD", image: "https://images.unsplash.com/photo-1456324504439-367cee3b3c32?auto=format&fit=crop&w=1200&q=80" },
      { title: "Nómada Digital XR", description: "Lectura en el metaverso para trabajo remoto.", detail: "Stock: 760 licencias", price: "$2 USD", image: "https://images.unsplash.com/photo-1455885666463-9a4fdbe8f109?auto=format&fit=crop&w=1200&q=80" },
      { title: "Manual de Productividad", description: "Lectura en el metaverso para equipos ágiles.", detail: "Stock: 630 licencias", price: "$5 USD", image: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1200&q=80" },
    ],
  },
  {
    id: "cursos",
    title: "Educación Inmersiva",
    subtitle: "Programas y cursos especializados en una sola categoría.",
    icon: GraduationCap,
    image:
      "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1400&q=80",
    tags: ["Formación", "Cursos", "Inmersivo"],
    products: [
      { title: "Ventas Relámpago", description: "Curso técnico-comercial para cerrar más rápido.", detail: "Duración: 3 horas", price: "$5 USD", image: "https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=1200&q=80" },
      { title: "Embudo Express", description: "Diseña funnels de conversión en una tarde.", detail: "Duración: 2 horas", price: "$2 USD", image: "https://images.unsplash.com/photo-1551281044-8d8d0d86f5b0?auto=format&fit=crop&w=1200&q=80" },
      { title: "Ads con IA", description: "Optimiza campañas pagas con prompts y automatización.", detail: "Duración: 4 horas", price: "$5 USD", image: "https://images.unsplash.com/photo-1553028826-f4804a6dfd3f?auto=format&fit=crop&w=1200&q=80" },
      { title: "CRM Inteligente", description: "Implementa seguimiento comercial con métricas clave.", detail: "Duración: 3 horas", price: "$2 USD", image: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=1200&q=80" },
      { title: "Copy de Conversión", description: "Textos persuasivos para producto y anuncios.", detail: "Duración: 2 horas", price: "$5 USD", image: "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1200&q=80" },
      { title: "Analytics Comercial", description: "KPIs y tableros para decisiones de negocio.", detail: "Duración: 3 horas", price: "$2 USD", image: "https://images.unsplash.com/photo-1518186285589-2f7649de83e0?auto=format&fit=crop&w=1200&q=80" },
      { title: "Pricing Inteligente", description: "Estrategias de precio y percepción de valor.", detail: "Duración: 2 horas", price: "$5 USD", image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80" },
      { title: "E-commerce Turbo", description: "Escala ventas de tienda en tiempo récord.", detail: "Duración: 4 horas", price: "$5 USD", image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1200&q=80" },
      { title: "Pitch Comercial", description: "Presentaciones que convierten clientes.", detail: "Duración: 2 horas", price: "$2 USD", image: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1200&q=80" },
      { title: "Automatización de Ventas", description: "Flujos comerciales sin fricción.", detail: "Duración: 3 horas", price: "$5 USD", image: "https://images.unsplash.com/photo-1556155092-490a1ba16284?auto=format&fit=crop&w=1200&q=80" },
    ],
  },
  {
    id: "salas-pro",
    title: "Salas Pro",
    subtitle: "Venta/Alquiler de salas para teatros y conciertos.",
    icon: Building2,
    image:
      "https://images.unsplash.com/photo-1503095396549-807759245b35?auto=format&fit=crop&w=1400&q=80",
    tags: ["Alquiler", "Teatro", "Escenario"],
    products: [
      { title: "Teatro Quantum", description: "Diseño premium para obras y stand-up de alto impacto.", detail: "Stock: 6 diseños", price: "$12 USD", image: "https://images.unsplash.com/photo-1503095396549-807759245b35?auto=format&fit=crop&w=1200&q=80" },
      { title: "Estadio Nova", description: "Escenario masivo para festivales y deportes VR.", detail: "Stock: 4 diseños", price: "$15 USD", image: "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1200&q=80" },
      { title: "Arena Eclipse", description: "Layout circular con visuales inmersivas dinámicas.", detail: "Stock: 5 diseños", price: "$14 USD", image: "https://images.unsplash.com/photo-1470229538611-16ba8c7ffbd7?auto=format&fit=crop&w=1200&q=80" },
      { title: "Sala Coral", description: "Teatro elegante para acústicos y eventos íntimos.", detail: "Stock: 8 diseños", price: "$9 USD", image: "https://images.unsplash.com/photo-1460723237483-7a6dc9d0b212?auto=format&fit=crop&w=1200&q=80" },
      { title: "Estadio Titan", description: "Formato monumental para lanzamientos globales.", detail: "Stock: 3 diseños", price: "$15 USD", image: "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?auto=format&fit=crop&w=1200&q=80" },
      { title: "Teatro Aurora", description: "Ambiente neón para shows inmersivos nocturnos.", detail: "Stock: 7 diseños", price: "$10 USD", image: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80" },
      { title: "Hall Prisma", description: "Escenario polivalente para conferencias y live sessions.", detail: "Stock: 11 diseños", price: "$8 USD", image: "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=1200&q=80" },
      { title: "Stadium Hyper", description: "Diseño de estadio para producciones híbridas.", detail: "Stock: 4 diseños", price: "$13 USD", image: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1200&q=80" },
      { title: "Teatro Royale Plus", description: "Sala clásica modernizada con luces inteligentes.", detail: "Stock: 5 diseños", price: "$11 USD", image: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=1200&q=80" },
      { title: "Arena Pulse", description: "Escenario para shows de alta energía.", detail: "Stock: 6 diseños", price: "$12 USD", image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80" },
    ],
  },
  {
    id: "set-streamer",
    title: "Set Streamer",
    subtitle: "Salas exclusivas para streamers y podcasts.",
    icon: Radio,
    image:
      "https://images.unsplash.com/photo-1614680376593-902f74cf0d41?auto=format&fit=crop&w=1400&q=80",
    tags: ["Streaming", "Podcast", "Sala 360"],
    products: [
      { title: "Minimalista Pro", description: "Set limpio para directos de estudio y entrevistas.", detail: "Stock: 24 configs", price: "$8 USD", image: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=1200&q=80" },
      { title: "Cyberpunk Neon", description: "Ambiente urbano luminoso para streams gaming.", detail: "Stock: 18 configs", price: "$10 USD", image: "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80" },
      { title: "Espacial Prime", description: "Cabina orbital para podcast inmersivo.", detail: "Stock: 14 configs", price: "$9 USD", image: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=1200&q=80" },
      { title: "Loft Creator", description: "Set cálido con iluminación inteligente multicámara.", detail: "Stock: 20 configs", price: "$7 USD", image: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80" },
      { title: "Podcast Duo", description: "Configuración para dos hosts con branding dinámico.", detail: "Stock: 16 configs", price: "$8 USD", image: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=1200&q=80" },
      { title: "Studio Arena", description: "Set grande para paneles y programas en vivo.", detail: "Stock: 9 configs", price: "$10 USD", image: "https://images.unsplash.com/photo-1504274066651-8d31a536b11a?auto=format&fit=crop&w=1200&q=80" },
      { title: "Night Pulse", description: "Iluminación azul-dorado para contenido premium.", detail: "Stock: 15 configs", price: "$9 USD", image: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1200&q=80" },
      { title: "Creator XR", description: "Set de alto rendimiento con overlays reactivos.", detail: "Stock: 12 configs", price: "$10 USD", image: "https://images.unsplash.com/photo-1611162618071-b39a2ec055fb?auto=format&fit=crop&w=1200&q=80" },
      { title: "Talk Show VR", description: "Formato de entrevistas para creadores expertos.", detail: "Stock: 11 configs", price: "$6 USD", image: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80" },
      { title: "Meta Broadcast", description: "Plantilla de streaming para eventos de marca.", detail: "Stock: 10 configs", price: "$10 USD", image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80" },
    ],
  },
  {
    id: "skins",
    title: "Skins",
    subtitle: "Venta de skins y personalización.",
    icon: Paintbrush,
    image:
      "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1400&q=80",
    tags: ["Skins", "Avatares", "Neón"],
    products: [
      { title: "Neo Runner Suit", description: "Outfit futurista para avatar con luces dinámicas.", detail: "Stock: 450 unidades", price: "$6 USD", image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80" },
      { title: "Holo Jacket X", description: "Chaqueta holográfica con variación cromática.", detail: "Stock: 320 unidades", price: "$8 USD", image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=80" },
      { title: "Particle Wings", description: "Efecto de partículas para entradas épicas.", detail: "Stock: 500 unidades", price: "$5 USD", image: "https://images.unsplash.com/photo-1462332420958-a05d1e002413?auto=format&fit=crop&w=1200&q=80" },
      { title: "Avatar Titan", description: "Skin robusta para eventos masivos.", detail: "Stock: 210 unidades", price: "$10 USD", image: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1200&q=80" },
      { title: "Cyber Mask", description: "Máscara con efectos reactivos al audio.", detail: "Stock: 370 unidades", price: "$7 USD", image: "https://images.unsplash.com/photo-1579566346927-c68383817a25?auto=format&fit=crop&w=1200&q=80" },
      { title: "Aura Trail", description: "Rastro luminoso premium para desplazamiento.", detail: "Stock: 430 unidades", price: "$5 USD", image: "https://images.unsplash.com/photo-1518773553398-650c184e0bb3?auto=format&fit=crop&w=1200&q=80" },
      { title: "Meta Crown", description: "Accesorio exclusivo para eventos VIP.", detail: "Stock: 190 unidades", price: "$9 USD", image: "https://images.unsplash.com/photo-1460353581641-37baddab0fa2?auto=format&fit=crop&w=1200&q=80" },
      { title: "Quantum Outfit", description: "Conjunto completo con textura neón animada.", detail: "Stock: 260 unidades", price: "$10 USD", image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=1200&q=80" },
      { title: "Pulse Gloves", description: "Guantes reactivos para experiencias interactivas.", detail: "Stock: 310 unidades", price: "$6 USD", image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=80" },
      { title: "Spectra Avatar", description: "Avatar completo con rasgos premium.", detail: "Stock: 170 unidades", price: "$10 USD", image: "https://images.unsplash.com/photo-1531746790731-6c087fecd65a?auto=format&fit=crop&w=1200&q=80" },
    ],
  },
];

function vaultTypeForCategory(categoryId: CategoryId): VaultItemType {
  if (categoryId === "biblioteca") return "biblioteca";
  if (categoryId === "cursos") return "cursos";
  if (categoryId === "tickets") return "ticket";
  return "skin";
}

function openImmersiveContent(contentUrl: string, title: string) {
  if (Capacitor.getPlatform() === "android") {
    if (typeof window.Android?.onArClick === "function") {
      window.Android.onArClick(contentUrl);
      return;
    }
    const params = new URLSearchParams();
    params.set("mp4", contentUrl);
    params.set("title", title);
    params.set("mode", "vod");
    const path = `/sala/espectador/${encodeURIComponent(buildAgoraChannel("main"))}?${params.toString()}`;
    window.location.assign(`${window.location.origin}${path}`);
    return;
  }
  window.open(contentUrl, "_blank", "noopener,noreferrer");
}

const investorStats = [
  { label: "Usuarios Activos", value: "120K+" },
  { label: "Eventos Realizados", value: "340" },
  { label: "Revenue YoY", value: "+280%" },
  { label: "Países", value: "18" },
];

const TiendaPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState<CategoryId | null>(null);
  const [dynamicProducts, setDynamicProducts] = useState<DynamicStoreProduct[]>([]);
  const [sessionPurchases, setSessionPurchases] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const loadDynamicStore = async () => {
      const { data } = await supabase
        .from("store_items")
        .select("id,item_type,title,cover_image_url,sale_price")
        .order("created_at", { ascending: false })
        .limit(100);
      setDynamicProducts((data ?? []) as DynamicStoreProduct[]);
    };
    void loadDynamicStore();
  }, []);

  const catalog = useMemo(() => {
    const bibliotecaDynamic: Product[] = dynamicProducts
      .filter((item) => item.item_type === "biblioteca")
      .map((item) => ({
        title: item.title,
        description: "Libro virtual publicado por la comunidad.",
        detail: "Disponible para descarga",
        price: "",
        image: item.cover_image_url,
      }));
    const cursosDynamic: Product[] = dynamicProducts
      .filter((item) => item.item_type === "cursos")
      .map((item) => ({
        title: item.title,
        description: "Curso virtual publicado por la comunidad.",
        detail: "Acceso en linea",
        price: `$${Number(item.sale_price).toFixed(2)} USD`,
        image: item.cover_image_url,
        priceUsd: Number(item.sale_price),
      }));

    const merged = storeCategories.map((category) => {
      if (category.id === "biblioteca") {
        return {
          ...category,
          products: [bibliotecaHeartProduct, bibliotecaGeochemicalProduct, ...bibliotecaDynamic, ...category.products],
        };
      }
      if (category.id === "cursos") {
        return { ...category, products: [...cursosDynamic, ...category.products] };
      }
      return category;
    });
    return mapStoreCategoriesWithDynamicPrices(merged);
  }, [dynamicProducts]);
  const selectedCategory = useMemo(
    () => catalog.find((item) => item.id === activeCategory) ?? null,
    [activeCategory, catalog],
  );

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <Navbar />

      {/* Immersive background layers */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        {/* Radial glow top */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />
        {/* Gold accent bottom */}
        <div className="absolute bottom-0 right-0 w-[500px] h-[400px] rounded-full blur-[100px]" style={{ background: "radial-gradient(circle, hsl(45 80% 55% / 0.06), transparent)" }} />
        {/* Cyan line left */}
        <div className="absolute top-1/4 left-0 w-px h-1/2 bg-gradient-to-b from-transparent via-primary/20 to-transparent" />
        {/* Gold line right */}
        <div className="absolute top-1/3 right-0 w-px h-1/3 bg-gradient-to-b from-transparent via-amber-400/15 to-transparent" />
      </div>

      {/* Categorías — mismo patrón de tarjetas que Educación */}
      <section className="relative px-6 pt-20 pb-28 overflow-hidden">
        <div className="absolute inset-0 -z-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent pointer-events-none" />
        <div className="container relative z-10 mx-auto max-w-[93.6rem]">
          <AnimatePresence mode="wait">
            {selectedCategory ? (
              <motion.div
                key={`products-${selectedCategory.id}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.35 }}
              >
                <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <Button variant="heroOutline" className="w-full md:w-auto" onClick={() => setActiveCategory(null)}>
                    <ArrowLeft className="h-4 w-4" />
                    Volver a la Tienda
                  </Button>
                  <div className="text-left md:text-right">
                    <h3 className="font-display text-2xl font-bold text-foreground">
                      Catálogo <span className="text-primary">{selectedCategory.title}</span>
                    </h3>
                    <p className="text-sm text-muted-foreground">10 productos disponibles</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 md:gap-4">
                  {selectedCategory.products.map((product, index) => {
                    const usd = product.priceUsd ?? 0;
                    const vaultType = vaultTypeForCategory(selectedCategory.id);
                    const purchaseKey = `${selectedCategory.id}:${product.title}`;
                    const isFree = usd === 0;
                    const isUnlocked =
                      isFree ||
                      sessionPurchases.has(purchaseKey) ||
                      hasVaultPurchase(user?.id, vaultType, product.title);
                    const canOpenImmersive = Boolean(product.actionUrl) && isUnlocked;
                    const immersiveLabel =
                      selectedCategory.id === "biblioteca"
                        ? isUnlocked
                          ? "Ver en 3D"
                          : product.actionLabel ?? "Ver"
                        : isFree || isUnlocked
                          ? product.actionLabel ?? "Ver Holograma / Abrir"
                          : product.actionLabel ?? "Ver";
                    return (
                      <motion.div
                        key={product.title}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.04 }}
                        className="min-w-0"
                      >
                        <Card className="h-full flex flex-col border border-primary/35 bg-card/55 backdrop-blur-md overflow-hidden transition-all duration-300 hover:border-primary/60 hover:shadow-[0_0_30px_-10px_hsl(var(--primary)/0.9)]">
                          <div className="relative h-[7.8rem] sm:h-[9.1rem] overflow-hidden">
                            <img
                              src={product.image}
                              alt={product.title}
                              className="h-full w-full object-cover"
                              loading="lazy"
                              width={400}
                              height={240}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/25 to-transparent" />
                          </div>
                          <CardContent className="p-3 sm:p-4 flex-1 flex flex-col">
                            {selectedCategory.id === "skins" && product.skinRarity && (
                              <span className="mb-1 inline-flex w-fit rounded-full border border-amber-500/50 bg-amber-500/10 px-2 py-0.5 text-[10px] font-display font-bold uppercase tracking-wide text-amber-400">
                                {product.skinRarity}
                              </span>
                            )}
                            <h4 className="font-display text-xs sm:text-sm font-semibold text-foreground line-clamp-2">
                              {product.title}
                            </h4>
                            <p className="mt-1 text-[10px] sm:text-xs text-muted-foreground line-clamp-3 min-h-8 sm:min-h-10">
                              {product.description}
                            </p>
                            <p className="mt-1.5 text-[10px] text-muted-foreground line-clamp-1">{product.detail}</p>
                            {product.imageAttribution && product.imageAttributionUrl && product.licenseUrl && (
                              <p className="mt-1.5 text-[9px] leading-snug text-muted-foreground/85 line-clamp-2">
                                Imagen:{" "}
                                <a
                                  href={product.imageAttributionUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="underline underline-offset-2 hover:text-primary"
                                >
                                  {product.imageAttribution}
                                </a>{" "}
                                (
                                <a
                                  href={product.licenseUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="underline underline-offset-2 hover:text-primary"
                                >
                                  CC BY 4.0
                                </a>
                                )
                              </p>
                            )}
                            <div className="mt-2">
                              <span
                                className={`inline-block rounded-full border px-2.5 py-1 text-[10px] sm:text-[11px] font-display font-bold tracking-wide backdrop-blur-md ${
                                  isFree
                                    ? "border-emerald-300/55 bg-emerald-500/15 text-emerald-100 shadow-[0_0_18px_-6px_rgba(52,211,153,0.85)]"
                                    : "border-emerald-400/50 bg-white/10 text-white shadow-[0_0_22px_-8px_rgba(110,231,183,0.9)]"
                                }`}
                              >
                                {product.price}
                              </span>
                            </div>
                            {canOpenImmersive && product.actionUrl && (
                              <Button
                                type="button"
                                variant="heroOutline"
                                size="sm"
                                className="mt-2 w-full min-h-9 text-[11px] sm:text-xs font-semibold touch-manipulation"
                                onClick={() => openImmersiveContent(product.actionUrl!, product.title)}
                              >
                                {immersiveLabel}
                              </Button>
                            )}
                            {!isUnlocked && usd > 0 && (
                              <StoreProductPayPal
                                categoryId={selectedCategory.id}
                                categoryTitle={selectedCategory.title}
                                productTitle={product.title}
                                priceUsd={usd}
                                skinRarity={product.skinRarity}
                                productImage={product.image}
                                onPurchaseComplete={() => {
                                  setSessionPurchases((prev) => {
                                    const next = new Set(prev);
                                    next.add(purchaseKey);
                                    return next;
                                  });
                                }}
                              />
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="categories"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.35 }}
              >
                <div className="mb-6">
                  <Button variant="heroOutline" className="w-full sm:w-auto" onClick={() => navigate("/inicio")}>
                    <ArrowLeft className="h-4 w-4" />
                    Volver al inicio del perfil
                  </Button>
                </div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="text-center mb-8"
                >
                  <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">
                    Explora <span className="text-primary">categorías</span>
                  </h2>
                  <p className="mt-3 text-muted-foreground text-lg max-w-2xl mx-auto">
                    Productos y servicios con estética inmersiva. Elige tu vía.
                  </p>
                </motion.div>

                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
                  {catalog.map((item, i) => (
                    <motion.button
                      key={item.title}
                      type="button"
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1 }}
                      onClick={() => setActiveCategory(item.id)}
                      className="text-left"
                    >
                      <Card className="h-full border border-primary/30 bg-card/50 backdrop-blur-md overflow-hidden group transition-all duration-300 hover:border-primary/60 hover:shadow-[0_0_35px_-12px_hsl(var(--primary)/0.8)]">
                        <div className="relative h-[13rem] overflow-hidden">
                          <img
                            src={item.image}
                            alt={item.title}
                            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                            loading="lazy"
                            width={600}
                            height={320}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />
                        </div>

                        <CardContent className="p-4 sm:p-6">
                          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                            <item.icon className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-primary" />
                            <h3 className="font-display text-sm sm:text-xl font-semibold text-foreground line-clamp-2">
                              {item.title}
                            </h3>
                          </div>
                          <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4 line-clamp-2 sm:line-clamp-none">
                            {item.subtitle}
                          </p>
                          <div className="mb-3 sm:mb-5 flex flex-wrap gap-1.5 sm:gap-2">
                            {item.tags.map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full border border-primary/40 bg-primary/10 px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-display tracking-wide text-primary"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                          <Button
                            variant="heroOutline"
                            size="lg"
                            className="w-full min-h-12 text-sm sm:text-base font-semibold touch-manipulation"
                          >
                            Entrar
                          </Button>
                        </CardContent>
                      </Card>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* Investors section */}
      <section className="relative px-6 pb-32">
        <div className="container mx-auto max-w-[93.6rem]">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-3xl border border-border/50 bg-card/30 backdrop-blur-lg overflow-hidden"
          >
            {/* Gold accent bar */}
            <div className="h-px w-full bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />

            <div className="p-8 md:p-14">
              <div className="flex items-center gap-3 mb-2">
                <Gem className="w-6 h-6 text-amber-400" />
                <span className="text-xs font-display font-semibold tracking-[0.2em] uppercase text-amber-400">
                  Investor Relations
                </span>
              </div>
              <h2 className="text-3xl md:text-4xl font-display font-bold mb-4 text-foreground">
                Invierte en el futuro del{" "}
                <span className="text-gradient-neon">entretenimiento inmersivo</span>
              </h2>
              <p className="text-muted-foreground text-base md:text-lg max-w-3xl leading-relaxed mb-10">
                OnniVers está redefiniendo cómo el mundo experimenta la música en vivo.
                Con tecnología de punta en VR, streaming descentralizado y una comunidad
                en crecimiento exponencial, esta es tu oportunidad de ser parte de la
                próxima revolución digital.
              </p>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
                {investorStats.map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="text-center p-4 rounded-xl border border-border/30 bg-muted/20"
                  >
                    <div className="text-2xl md:text-3xl font-display font-bold text-primary mb-1">
                      {stat.value}
                    </div>
                    <div className="text-xs text-muted-foreground font-display tracking-wide uppercase">
                      {stat.label}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Trust badges */}
              <div className="flex flex-wrap gap-4 mb-10">
                {["Auditoría Financiera", "Smart Contract Verified", "SOC 2 Compliant"].map(
                  (badge) => (
                    <span
                      key={badge}
                      className="flex items-center gap-1.5 text-xs font-display text-muted-foreground border border-border/40 rounded-full px-3 py-1.5 bg-muted/10"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                      {badge}
                    </span>
                  )
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button variant="hero" size="lg" className="text-base px-10 gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Contactar para Inversión
                </Button>
                <Button variant="heroOutline" size="lg" className="text-base px-10 gap-2">
                  <Mail className="w-5 h-5" />
                  Solicitar Pitch Deck
                </Button>
              </div>
            </div>

            {/* Bottom accent */}
            <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
          </motion.div>
        </div>
      </section>

      <PricingSection />

      <Footer />
    </div>
  );
};

export default TiendaPage;
