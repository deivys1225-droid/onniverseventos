/**
 * Texto editorial SEO en HTML semántico, sin Card ni modal — visible en el DOM para indexación.
 */
const HomeOnniVersSeoSection = () => {
  return (
    <section
      id="onnivers-ecosistema-seo"
      lang="es"
      aria-labelledby="onnivers-seo-main-heading"
      className="relative z-20 border-t border-primary/20 bg-gradient-to-b from-background via-background to-[hsl(235_40%_6%)] px-4 py-12 sm:px-6 md:py-16"
      data-camera-page-section
    >
      <div className="container mx-auto max-w-3xl">
        <h2
          id="onnivers-seo-main-heading"
          className="font-display text-xl font-bold leading-snug tracking-tight text-foreground sm:text-2xl md:text-[1.65rem]"
        >
          OnniVers: Tu Realidad Evolucionada
        </h2>

        <div className="mt-6 space-y-6 text-sm leading-relaxed text-muted-foreground sm:text-base md:leading-[1.75]">
          <p>
            Somos el ecosistema digital inmersivo más completo e innovador del mundo, desarrollado con tecnología propia
            para transformar la forma en que las personas se conectan, aprenden y viven experiencias. Nacimos con una visión
            clara: llevar la realidad virtual, aumentada y mixta a cada rincón del planeta, eliminando barreras y haciendo
            accesible lo que antes parecía imposible.
          </p>

          <div className="space-y-2">
            <h3 className="font-display text-base font-semibold text-foreground sm:text-lg">
              🔹 EDUCACIÓN INMERSIVA:
            </h3>
            <p>
              Revolucionamos el aprendizaje para colegios, universidades y centros educativos. Creamos entornos donde el
              estudiante no solo lee, sino que vive el conocimiento: recorridos históricos, laboratorios virtuales,
              simulaciones científicas y modelos 3D interactivos. Una herramienta poderosa para la educación del futuro.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-display text-base font-semibold text-foreground sm:text-lg">
              🔹 CONCIERTOS Y ENTRETENIMIENTO:
            </h3>
            <p>
              Llevamos los eventos más grandes a la pantalla de tu celular. Conciertos, espectáculos y presentaciones en vivo
              en 360°, donde tú eliges qué ver y desde dónde verlo. Entra al escenario, vive la música y siente la emoción
              como si estuvieras ahí mismo.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-display text-base font-semibold text-foreground sm:text-lg">
              🔹 RED SOCIAL Y TIENDAS:
            </h3>
            <p>
              Conecta con personas de todo el mundo en un espacio social totalmente inmersivo. Comparte experiencias, crea
              contenido y accede a tiendas digitales exclusivas donde el comercio y la tecnología convergen en un solo lugar.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-display text-base font-semibold text-foreground sm:text-lg">
              ✅ ACCESIBILIDAD TOTAL:
            </h3>
            <p>
              Nuestra mayor fortaleza: funciona en CUALQUIER DISPOSITIVO, desde los celulares más económicos hasta los de
              última generación. No necesitas gafas costosas ni equipos especiales. Vive la experiencia total con el celular
              que ya tienes en tu mano. Tecnología mundial, al alcance de todos.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HomeOnniVersSeoSection;
