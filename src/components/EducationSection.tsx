import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Activity, ArrowLeft, Brain, BriefcaseBusiness, Languages, Sparkles, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EDU_COURSES_USD_MAX, EDU_COURSES_USD_MIN, formatUsd, stableUsdInRange } from "@/lib/pricing";

type CategoryId = "tecnologia" | "idiomas" | "negocios" | "bienestar" | "clases-privadas";

type Course = {
  title: string;
  description: string;
  duration: string;
  detail?: string;
  price: "$2 USD" | "$3 USD" | "$5 USD" | "$7 USD" | "$10 USD" | "GRATIS" | "Prueba Gratuita";
  image: string;
  actionLabel: "Reservar Cupo" | "Ver Horarios";
};

function displayCoursePrice(course: Course): string {
  if (course.price === "GRATIS" || course.price === "Prueba Gratuita") {
    return course.price;
  }
  return formatUsd(
    stableUsdInRange(`edu-curso:${course.title}`, EDU_COURSES_USD_MIN, EDU_COURSES_USD_MAX),
  );
}

const learningTracks: {
  id: CategoryId;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  image: string;
  courses: Course[];
}[] = [
  {
    id: "tecnologia",
    title: "Tecnología",
    subtitle: "Módulos técnicos para construir soluciones del futuro",
    icon: Brain,
    image:
      "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1400&q=80",
    courses: [
      { title: "IA Generativa", description: "Crea apps y agentes con modelos de última generación.", duration: "8 horas", price: "$5 USD", image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1200&q=80", actionLabel: "Reservar Cupo" },
      { title: "Desarrollo VR", description: "Diseño de experiencias inmersivas para eventos en vivo.", duration: "10 horas", price: "$5 USD", image: "https://images.unsplash.com/photo-1622979135225-d2ba269cf1ac?auto=format&fit=crop&w=1200&q=80", actionLabel: "Ver Horarios" },
      { title: "Python para Expertos", description: "Optimización, arquitectura y automatización avanzada.", duration: "12 horas", price: "$5 USD", image: "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?auto=format&fit=crop&w=1200&q=80", actionLabel: "Reservar Cupo" },
      { title: "Ciberseguridad 360", description: "Protege identidades y plataformas en entornos digitales.", duration: "9 horas", price: "$2 USD", image: "https://images.unsplash.com/photo-1510511459019-5dda7724fd87?auto=format&fit=crop&w=1200&q=80", actionLabel: "Ver Horarios" },
      { title: "Blockchain Aplicado", description: "Smart contracts y modelos de negocio descentralizados.", duration: "7 horas", price: "$2 USD", image: "https://images.unsplash.com/photo-1639322537228-f710d846310a?auto=format&fit=crop&w=1200&q=80", actionLabel: "Reservar Cupo" },
      { title: "DevOps Cloud", description: "CI/CD y despliegue automatizado para apps de alto tráfico.", duration: "8 horas", price: "$5 USD", image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80", actionLabel: "Ver Horarios" },
      { title: "UX para Metaverso", description: "Interfaces inmersivas con foco en retención y experiencia.", duration: "6 horas", price: "$2 USD", image: "https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=1200&q=80", actionLabel: "Reservar Cupo" },
      { title: "Arquitectura de APIs", description: "Diseño robusto para plataformas escalables en tiempo real.", duration: "6 horas", price: "GRATIS", image: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80", actionLabel: "Ver Horarios" },
      { title: "Prompt Engineering", description: "Optimiza prompts para resultados precisos y consistentes.", duration: "4 horas", price: "GRATIS", image: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1200&q=80", actionLabel: "Reservar Cupo" },
      { title: "Automatización No-Code", description: "Flujos inteligentes sin programar desde cero.", duration: "5 horas", price: "$2 USD", image: "https://images.unsplash.com/photo-1517430816045-df4b7de11d1d?auto=format&fit=crop&w=1200&q=80", actionLabel: "Ver Horarios" },
    ],
  },
  {
    id: "idiomas",
    title: "Idiomas",
    subtitle: "Comunicación global para proyectos y equipos internacionales",
    icon: Languages,
    image:
      "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=1400&q=80",
    courses: [
      { title: "Inglés Técnico", description: "Vocabulario profesional para tecnología y negocios.", duration: "8 horas", price: "$5 USD", image: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=1200&q=80", actionLabel: "Reservar Cupo" },
      { title: "Francés desde Cero", description: "Fundamentos para hablar con confianza desde la semana 1.", duration: "10 horas", price: "$2 USD", image: "https://images.unsplash.com/photo-1431274172761-fca41d930114?auto=format&fit=crop&w=1200&q=80", actionLabel: "Ver Horarios" },
      { title: "Polaco para Negocios", description: "Comunicación estratégica para reuniones y acuerdos.", duration: "7 horas", price: "$5 USD", image: "https://images.unsplash.com/photo-1519197924294-4ba991a11128?auto=format&fit=crop&w=1200&q=80", actionLabel: "Reservar Cupo" },
      { title: "Italiano Conversacional", description: "Expresiones cotidianas para networking internacional.", duration: "6 horas", price: "$2 USD", image: "https://images.unsplash.com/photo-1523531294919-4bcd7c65e216?auto=format&fit=crop&w=1200&q=80", actionLabel: "Ver Horarios" },
      { title: "Japonés Inicial", description: "Pronunciación y frases esenciales en contexto real.", duration: "9 horas", price: "$5 USD", image: "https://images.unsplash.com/photo-1492571350019-22de08371fd3?auto=format&fit=crop&w=1200&q=80", actionLabel: "Reservar Cupo" },
      { title: "Alemán para Startups", description: "Pitch, demo y negociación para mercados europeos.", duration: "5 horas", price: "$2 USD", image: "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=1200&q=80", actionLabel: "Ver Horarios" },
      { title: "Portugués Comercial", description: "Ventas y soporte para clientes de LATAM y Brasil.", duration: "6 horas", price: "$2 USD", image: "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=1200&q=80", actionLabel: "Reservar Cupo" },
      { title: "Coreano Básico", description: "Comprensión oral y estructura gramatical inicial.", duration: "6 horas", price: "GRATIS", image: "https://images.unsplash.com/photo-1538485399081-7c897c5b7dd7?auto=format&fit=crop&w=1200&q=80", actionLabel: "Ver Horarios" },
      { title: "Mandarín Práctico", description: "Frases clave para comercio y relaciones internacionales.", duration: "8 horas", price: "$5 USD", image: "https://images.unsplash.com/photo-1496822414531-8ffd6f5a5c11?auto=format&fit=crop&w=1200&q=80", actionLabel: "Reservar Cupo" },
      { title: "Speaking Pro", description: "Domina presentaciones y entrevistas de alto impacto.", duration: "4 horas", price: "GRATIS", image: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80", actionLabel: "Ver Horarios" },
    ],
  },
  {
    id: "negocios",
    title: "Negocios",
    subtitle: "Estrategias de crecimiento para escalar en entornos digitales",
    icon: BriefcaseBusiness,
    image:
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1400&q=80",
    courses: [
      { title: "Growth Hacking", description: "Experimentación para escalar productos de forma rápida.", duration: "7 horas", price: "$5 USD", image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80", actionLabel: "Reservar Cupo" },
      { title: "Ventas en el Metaverso", description: "Estrategias comerciales para espacios inmersivos.", duration: "8 horas", price: "$5 USD", image: "https://images.unsplash.com/photo-1649972904349-6e44c42644a7?auto=format&fit=crop&w=1200&q=80", actionLabel: "Ver Horarios" },
      { title: "E-commerce Performance", description: "Optimiza conversiones y ticket promedio en tiendas online.", duration: "9 horas", price: "$2 USD", image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1200&q=80", actionLabel: "Reservar Cupo" },
      { title: "Marketing con IA", description: "Automatización inteligente de campañas y contenidos.", duration: "6 horas", price: "$5 USD", image: "https://images.unsplash.com/photo-1553028826-f4804a6dfd3f?auto=format&fit=crop&w=1200&q=80", actionLabel: "Ver Horarios" },
      { title: "Finanzas para Crecer", description: "Flujo de caja y métricas para decisiones estratégicas.", duration: "6 horas", price: "$2 USD", image: "https://images.unsplash.com/photo-1553729459-efe14ef6055d?auto=format&fit=crop&w=1200&q=80", actionLabel: "Reservar Cupo" },
      { title: "Branding Futurista", description: "Construcción de marca con identidad memorable.", duration: "5 horas", price: "$2 USD", image: "https://images.unsplash.com/photo-1497032628192-86f99bcd76bc?auto=format&fit=crop&w=1200&q=80", actionLabel: "Ver Horarios" },
      { title: "Customer Success", description: "Retención y expansión con metodologías data-driven.", duration: "5 horas", price: "GRATIS", image: "https://images.unsplash.com/photo-1553877522-43269d4ea984?auto=format&fit=crop&w=1200&q=80", actionLabel: "Reservar Cupo" },
      { title: "Lanzamiento de Producto", description: "Go-to-market para productos digitales competitivos.", duration: "7 horas", price: "$5 USD", image: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80", actionLabel: "Ver Horarios" },
      { title: "Negociación Ejecutiva", description: "Cierra alianzas y acuerdos con mayor efectividad.", duration: "4 horas", price: "$2 USD", image: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1200&q=80", actionLabel: "Reservar Cupo" },
      { title: "Analytics de Negocio", description: "KPIs, dashboards y decisiones basadas en datos.", duration: "6 horas", price: "GRATIS", image: "https://images.unsplash.com/photo-1508385082359-f38ae991e8f2?auto=format&fit=crop&w=1200&q=80", actionLabel: "Ver Horarios" },
    ],
  },
  {
    id: "bienestar",
    title: "Ejercicios y Bienestar",
    subtitle: "Salud física y mental en sesiones inmersivas de alto impacto",
    icon: Activity,
    image:
      "https://images.unsplash.com/photo-1576678927484-cc907957088c?auto=format&fit=crop&w=1400&q=80",
    courses: [
      { title: "Yoga Inmersivo", description: "Flujo de posturas guiadas en entornos de calma total.", detail: "Nivel: Principiante", duration: "45 min", price: "$3 USD", image: "https://images.unsplash.com/photo-1545205597-3d9d02c29597?auto=format&fit=crop&w=1200&q=80", actionLabel: "Reservar Cupo" },
      { title: "Pilates VR", description: "Core, postura y equilibrio con coaching visual en vivo.", detail: "Nivel: Intermedio", duration: "50 min", price: "$7 USD", image: "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1200&q=80", actionLabel: "Ver Horarios" },
      { title: "Meditación en el Espacio", description: "Respiración consciente con ambientación cósmica inmersiva.", detail: "Nivel: Principiante", duration: "35 min", price: "Prueba Gratuita", image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=80", actionLabel: "Reservar Cupo" },
      { title: "Entrenamiento Funcional", description: "Rutina dinámica para fuerza, coordinación y resistencia.", detail: "Nivel: Avanzado", duration: "55 min", price: "$7 USD", image: "https://images.unsplash.com/photo-1594737625785-cb03e6de5778?auto=format&fit=crop&w=1200&q=80", actionLabel: "Ver Horarios" },
      { title: "Zumba Virtual", description: "Cardio coreografiado con energía y música en vivo.", detail: "Nivel: Intermedio", duration: "40 min", price: "$3 USD", image: "https://images.unsplash.com/photo-1518310383802-640c2de311b2?auto=format&fit=crop&w=1200&q=80", actionLabel: "Reservar Cupo" },
      { title: "HIIT 360", description: "Intervalos intensos con métricas de rendimiento por sesión.", detail: "Nivel: Avanzado", duration: "30 min", price: "$7 USD", image: "https://images.unsplash.com/photo-1599058917765-a780eda07a3e?auto=format&fit=crop&w=1200&q=80", actionLabel: "Ver Horarios" },
      { title: "Movilidad y Stretching", description: "Mejora flexibilidad y recuperación muscular progresiva.", detail: "Nivel: Principiante", duration: "35 min", price: "$3 USD", image: "https://images.unsplash.com/photo-1506629905607-55f529699fbd?auto=format&fit=crop&w=1200&q=80", actionLabel: "Reservar Cupo" },
      { title: "Respiración Consciente", description: "Técnicas para reducir estrés y mejorar enfoque diario.", detail: "Nivel: Principiante", duration: "25 min", price: "Prueba Gratuita", image: "https://images.unsplash.com/photo-1499209974431-9dddcece7f88?auto=format&fit=crop&w=1200&q=80", actionLabel: "Ver Horarios" },
      { title: "Cardio Dance XR", description: "Sesión rítmica para quemar calorías con seguimiento visual.", detail: "Nivel: Intermedio", duration: "45 min", price: "$3 USD", image: "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=1200&q=80", actionLabel: "Reservar Cupo" },
      { title: "Bootcamp Metafit", description: "Entrenamiento mixto de fuerza y agilidad en circuito.", detail: "Nivel: Avanzado", duration: "60 min", price: "$7 USD", image: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80", actionLabel: "Ver Horarios" },
    ],
  },
  {
    id: "clases-privadas",
    title: "Clases Privadas",
    subtitle: "Sesiones 1 a 1 virtuales con mentores especializados",
    icon: User,
    image:
      "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1400&q=80",
    courses: [
      { title: "Asesoría de Software", description: "Arquitectura, debugging y roadmap técnico personalizado.", detail: "Sesión 1 a 1 (60 min) · Instructor: Senior Engineer", duration: "60 min", price: "$10 USD", image: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1200&q=80", actionLabel: "Reservar Cupo" },
      { title: "Refuerzo de Idiomas", description: "Práctica intensiva orientada a tus objetivos profesionales.", detail: "Sesión 1 a 1 (60 min) · Instructor: Language Coach", duration: "60 min", price: "$5 USD", image: "https://images.unsplash.com/photo-1456324463128-7ff6903988d8?auto=format&fit=crop&w=1200&q=80", actionLabel: "Ver Horarios" },
      { title: "Mentoría de Negocios", description: "Estrategia comercial y crecimiento de tu proyecto digital.", detail: "Sesión 1 a 1 (60 min) · Instructor: Business Mentor", duration: "60 min", price: "$10 USD", image: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1200&q=80", actionLabel: "Reservar Cupo" },
      { title: "Clases de Instrumentos", description: "Aprendizaje guiado para técnica, ritmo y repertorio.", detail: "Sesión 1 a 1 (60 min) · Instructor: Music Trainer", duration: "60 min", price: "$5 USD", image: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=1200&q=80", actionLabel: "Ver Horarios" },
      { title: "Mentoría de Portafolio", description: "Optimiza CV, LinkedIn y portafolio para nuevas oportunidades.", detail: "Sesión 1 a 1 (60 min) · Instructor: Career Advisor", duration: "60 min", price: "$5 USD", image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=80", actionLabel: "Reservar Cupo" },
      { title: "Clínica de Pitch", description: "Mejora storytelling y seguridad para presentar ideas.", detail: "Sesión 1 a 1 (60 min) · Instructor: Startup Coach", duration: "60 min", price: "$10 USD", image: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=1200&q=80", actionLabel: "Ver Horarios" },
      { title: "Consultoría E-commerce", description: "Auditoría de tienda y plan de optimización de ventas.", detail: "Sesión 1 a 1 (60 min) · Instructor: Commerce Specialist", duration: "60 min", price: "$10 USD", image: "https://images.unsplash.com/photo-1556740738-b6a63e27c4df?auto=format&fit=crop&w=1200&q=80", actionLabel: "Reservar Cupo" },
      { title: "Branding Personal", description: "Diseña una presencia digital coherente y diferencial.", detail: "Sesión 1 a 1 (60 min) · Instructor: Brand Strategist", duration: "60 min", price: "$5 USD", image: "https://images.unsplash.com/photo-1522199755839-a2bacb67c546?auto=format&fit=crop&w=1200&q=80", actionLabel: "Ver Horarios" },
      { title: "Coaching de Productividad", description: "Sistemas prácticos para foco y ejecución semanal.", detail: "Sesión 1 a 1 (60 min) · Instructor: Productivity Mentor", duration: "60 min", price: "$5 USD", image: "https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?auto=format&fit=crop&w=1200&q=80", actionLabel: "Reservar Cupo" },
      { title: "Laboratorio de Marketing", description: "Feedback directo sobre campañas y estrategia de contenido.", detail: "Sesión 1 a 1 (60 min) · Instructor: Growth Marketer", duration: "60 min", price: "$10 USD", image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80", actionLabel: "Ver Horarios" },
    ],
  },
];

const EducationSection = () => {
  const [activeCategory, setActiveCategory] = useState<CategoryId | null>(null);
  const selectedTrack = useMemo(
    () => learningTracks.find((track) => track.id === activeCategory) ?? null,
    [activeCategory],
  );
  const compactCoursesView = selectedTrack?.id === "bienestar" || selectedTrack?.id === "clases-privadas";

  return (
    <section id="educacion" className="relative py-24 px-6 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
      <div className="absolute -top-20 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />

      <div className="container mx-auto max-w-6xl relative z-10">
        <AnimatePresence mode="wait">
          {selectedTrack ? (
            <motion.div
              key={`courses-${selectedTrack.id}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.35 }}
            >
              <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <Button variant="heroOutline" className="w-full md:w-auto" onClick={() => setActiveCategory(null)}>
                  <ArrowLeft className="h-4 w-4" />
                  Volver a Categorías
                </Button>
                <div className="text-left md:text-right">
                  <h3 className="font-display text-2xl font-bold text-foreground">
                    Cursos de <span className="text-primary">{selectedTrack.title}</span>
                  </h3>
                  <p className="text-sm text-muted-foreground">10 cursos disponibles</p>
                </div>
              </div>

              <div
                className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 ${
                  compactCoursesView ? "xl:grid-cols-5 2xl:grid-cols-6" : "xl:grid-cols-5"
                } gap-4`}
              >
                {selectedTrack.courses.map((course, index) => (
                  <motion.div
                    key={course.title}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                  >
                    <Card className="h-full border border-primary/35 bg-card/55 backdrop-blur-md overflow-hidden transition-all duration-300 hover:border-primary/60 hover:shadow-[0_0_30px_-10px_hsl(var(--primary)/0.9)]">
                      <div className={`relative ${compactCoursesView ? "h-24" : "h-28"} overflow-hidden`}>
                        <img
                          src={course.image}
                          alt={course.title}
                          className="h-full w-full object-cover"
                          loading="lazy"
                          width={400}
                          height={240}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/25 to-transparent" />
                      </div>
                      <CardContent className="p-4">
                        <h4 className="font-display text-sm font-semibold text-foreground">{course.title}</h4>
                        <p className="mt-1 text-xs text-muted-foreground min-h-10">{course.description}</p>
                        <p className="mt-2 text-[11px] text-primary font-display">Duración: {course.duration}</p>
                        {course.detail && (
                          <p className="mt-1 text-[11px] text-muted-foreground">{course.detail}</p>
                        )}
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <span
                            className={`rounded-full px-2 py-1 text-[10px] font-display font-bold tracking-wide ${
                              course.price === "GRATIS" || course.price === "Prueba Gratuita"
                                ? "border border-emerald-300/45 bg-emerald-400/15 text-emerald-300"
                                : "border border-primary/40 bg-primary/10 text-primary"
                            }`}
                          >
                            {displayCoursePrice(course)}
                          </span>
                          <Button size="sm" variant="heroOutline" className="h-7 px-2.5 text-[11px]">
                            {course.actionLabel}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
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
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center mb-14"
              >
                <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-2 text-xs font-display font-semibold tracking-wider text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  FORMACIÓN TÉCNICA EN EL UNIVERSO
                </span>
                <h2 className="mt-6 text-4xl md:text-5xl font-display font-bold text-foreground">
                  Educación <span className="text-primary">Inmersiva</span>
                </h2>
                <p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto">
                  Rutas de aprendizaje con estética futurista para dominar habilidades de alto impacto
                  en tecnología, idiomas y negocios.
                </p>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-6">
                {learningTracks.map((track, index) => (
                  <motion.button
                    key={track.title}
                    type="button"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.12 }}
                    onClick={() => setActiveCategory(track.id)}
                    className="text-left"
                  >
                    <Card className="h-full border border-primary/30 bg-card/50 backdrop-blur-md overflow-hidden group transition-all duration-300 hover:border-primary/60 hover:shadow-[0_0_35px_-12px_hsl(var(--primary)/0.8)]">
                      <div className="relative h-40 overflow-hidden">
                        <img
                          src={track.image}
                          alt={`${track.title} — ruta de formación inmersiva OnniVers`}
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                          loading="lazy"
                          width={600}
                          height={320}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />
                      </div>

                      <CardContent className="p-6">
                        <div className="flex items-center gap-3 mb-3">
                          <track.icon className="h-5 w-5 text-primary" />
                          <h3 className="font-display text-xl font-semibold text-foreground">{track.title}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground mb-5">{track.subtitle}</p>
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-display tracking-wide text-primary">
                            10 cursos
                          </span>
                          <span className="rounded-full border border-border/40 bg-background/50 px-3 py-1 text-xs font-display tracking-wide text-muted-foreground">
                            Haz clic para explorar
                          </span>
                        </div>
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
  );
};

export default EducationSection;
