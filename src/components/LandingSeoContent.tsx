type LandingSeoContentProps = {
  /** Cuando está dentro de LegalPageLayout u otra página, sin doble contenedor ni borde superior de portada. */
  embedded?: boolean;
};

/**
 * Bloque editorial SEO: historia OnniVers, jerarquía H2/H3, tema oscuro.
 */
const LandingSeoContent = ({ embedded = false }: LandingSeoContentProps) => {
  return (
    <section
      id="contenido-onnivers"
      lang="es"
      className={
        embedded
          ? "not-prose relative z-20 border-b border-primary/15 bg-gradient-to-b from-background/80 to-[hsl(235_40%_6%)] px-4 py-10 sm:px-6 md:py-12"
          : "relative border-t border-primary/20 bg-gradient-to-b from-background via-background to-[hsl(235_40%_6%)] px-4 py-14 sm:px-6 md:py-20"
      }
      {...(embedded ? { "data-camera-page-section": true } : {})}
    >
      <div className={embedded ? "w-full" : "container mx-auto max-w-3xl"}>
        <p className="mb-8 text-center font-display text-lg font-semibold italic text-primary md:text-xl">
          OnniVers: Tu Realidad Evolucionada
        </p>

        <h2 className="font-display text-xl font-bold leading-snug tracking-tight text-foreground sm:text-2xl md:text-[1.65rem]">
          Educación Inmersiva — Eventos en Realidad Virtual y Aumentada — Transmisiones Globales
        </h2>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base md:leading-[1.75]">
          <p>
            OnniVers es el ecosistema tecnológico líder en experiencias inmersivas, realidad virtual, realidad mixta y
            transmisiones en vivo en 360 grados. Nacida de más de 10 años de experiencia en infraestructura, redes y
            soluciones tecnológicas reales, nuestra plataforma está diseñada para llevar al mundo una nueva forma de vivir,
            ver y crear contenido.
          </p>
          <p>
            Nuestra misión es democratizar la tecnología inmersiva: cualquier persona, desde cualquier lugar del mundo y
            con cualquier dispositivo móvil, puede acceder a conciertos, eventos, conferencias, educación y encuentros
            sociales como si estuviera ahí mismo. Desarrollamos nuestra propia infraestructura y lógica desde cero,
            logrando una transmisión fluida, estable y de alta calidad, sin necesidad de equipos costosos ni gafas
            especiales.
          </p>
          <p>
            Así, conciertos, conferencias, educación y encuentros sociales convergen en una misma experiencia inmersiva,
            pensada para redes móviles y conectividad variable, manteniendo la misma idea de acceso universal que impulsa
            OnniVers.
          </p>
        </div>

        <h2 className="mt-12 font-display text-xl font-bold leading-snug tracking-tight text-foreground sm:text-2xl md:text-[1.65rem]">
          Tecnología Propia, Realidad Aumentada y Accesible para Todo el Mundo
        </h2>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base md:leading-[1.75]">
          <p>
            En OnniVers encontrarás escenas inmersivas completas, pantallas divididas, entornos 360°, reproductores
            adaptables y un sistema único de interacción en tiempo real. Todo nuestro contenido y servicio es 100% libre
            de publicidad, respetando tu experiencia y privacidad.
          </p>
        </div>

        <h2 className="mt-12 font-display text-xl font-bold leading-snug tracking-tight text-foreground sm:text-2xl md:text-[1.65rem]">
          Educación Inmersiva: Tecnología para Colegios y Universidades
        </h2>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base md:leading-[1.75]">
          <p className="font-display font-semibold text-primary/95">
            🔹 EDUCACIÓN INMERSIVA Y REALIDAD AUMENTADA:
          </p>
          <p>
            Una de nuestras grandes fortalezas y áreas de desarrollo principal es transformar la enseñanza y el
            aprendizaje. Creamos soluciones tecnológicas exclusivas diseñadas para colegios, universidades e instituciones
            educativas de todo el mundo, llevando el conocimiento a otro nivel. Aquí el estudiante no solo lee o escucha:{" "}
            <em className="font-medium italic text-foreground/90">vive la experiencia.</em> Recorridos históricos
            interactivos, simulaciones científicas, laboratorios virtuales, modelos 3D y realidad aumentada aplicada,
            diseñados para que el conocimiento se comprenda, se recuerde y se disfrute al máximo.
          </p>
        </div>

        <h3 className="mt-10 font-display text-lg font-semibold leading-snug text-cyan-100/95 sm:text-xl md:text-[1.35rem]">
          Escenas 360°, Realidad Mixta, Realidad Aumentada y Experiencias Sin Límites
        </h3>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base md:leading-[1.75]">
          <p>
            Las pantallas divididas, los entornos 360° y la interacción en tiempo real funcionan como piezas de un mismo
            sistema: ves el contenido y participas desde dentro, con la tranquilidad de un servicio sin publicidad y con
            foco en tu privacidad.
          </p>
          <p>
            Somos tecnología desarrollada desde Colombia, creada para el mundo. Una evolución digital donde tú no solo
            ves el contenido, sino que estás DENTRO del contenido. Bienvenido a la nueva etapa de la comunicación humana.
            Bienvenido a OnniVers.
          </p>
        </div>
      </div>
    </section>
  );
};

export default LandingSeoContent;
