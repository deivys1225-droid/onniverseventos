import { useEffect } from "react";
import { Link } from "react-router-dom";
import LegalPageLayout from "@/components/LegalPageLayout";
import LandingSeoContent from "@/components/LandingSeoContent";
import { SOCIAL_LINKS } from "@/components/SocialFooterIcons";
import BackToProfileHomeButton from "@/components/BackToProfileHomeButton";

const ORG_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "OnniVers",
  legalName: "Empresa Tecnológica de Colombia S.A.S.",
  url: "https://onniverso.com",
  taxID: "901.083.478-0",
  foundingDate: "2017",
  email: "gerencia@onniverso.com",
  founder: {
    "@type": "Person",
    name: "Davis Herrera",
    jobTitle: "Fundador y CEO",
  },
  sameAs: [SOCIAL_LINKS.instagram, SOCIAL_LINKS.facebook, SOCIAL_LINKS.tiktok],
};

const QuienesSomosPage = () => {
  useEffect(() => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.text = JSON.stringify(ORG_JSON_LD);
    script.id = "schema-org-onniverso";
    document.head.appendChild(script);
    return () => {
      document.getElementById("schema-org-onniverso")?.remove();
    };
  }, []);

  return (
    <LegalPageLayout
      title="Quiénes somos"
      description="OnniVers: tu realidad evolucionada — ecosistema inmersivo. Más abajo: identidad legal de Empresa Tecnológica de Colombia S.A.S. y contacto corporativo."
      topContent={
        <>
          <div className="container mx-auto max-w-3xl px-6 pb-4">
            <BackToProfileHomeButton />
          </div>
          <LandingSeoContent embedded />
        </>
      }
    >
      <section
        className="rounded-xl border border-primary/25 bg-primary/5 p-4 md:p-5 [&_h2]:mt-0"
        aria-labelledby="identity-developer-heading"
      >
        <h2 id="identity-developer-heading">Identidad legal y titular del servicio</h2>
        <p>
          <strong className="text-foreground">Empresa Tecnológica de Colombia S.A.S.</strong> (
          <span className="whitespace-nowrap tabular-nums">
            NIT <strong>901.083.478-0</strong>
          </span>
          ) es la <strong>entidad legal responsable</strong> del producto y servicio digital publicado bajo la marca{" "}
          <strong>OnniVers</strong>, con continuidad operativa documentada desde <strong>2017</strong>. Esta información
          identifica al desarrollador y titular frente a usuarios, tiendas de aplicaciones y autoridades, según las buenas
          prácticas de transparencia exigidas por Google Play y políticas de confianza del consumidor.
        </p>
      </section>

      <section>
        <h2>Empresa y trayectoria</h2>
        <p>
          <strong>Empresa Tecnológica de Colombia S.A.S.</strong> (
          <span className="whitespace-nowrap tabular-nums">
            NIT <strong>901.083.478-0</strong>
          </span>
          )
          cuenta con <strong>casi 10 años de experiencia</strong> en el mercado tecnológico, operando con solidez desde{" "}
          <strong>2017</strong>. La marca <strong>OnniVers</strong> concentra nuestras apuestas por experiencias inmersivas,
          streaming y contenido en entornos virtuales y web, con un enfoque futurista y accesible.
        </p>
      </section>

      <section>
        <h2>Liderazgo</h2>
        <p>
          <strong>Davis Herrera</strong> es <strong>Fundador y CEO</strong> de la compañía, liderando la visión de producto,
          la relación con creadores y la expansión internacional de OnniVers.
        </p>
      </section>

      <section>
        <h2>Contacto corporativo</h2>
        <p>
          Correo gerencia:{" "}
          <a href="mailto:gerencia@onniverso.com" className="text-primary underline-offset-2 hover:underline">
            gerencia@onniverso.com
          </a>
          <br />
          Correo alternativo:{" "}
          <a
            href="mailto:empresatecnologicadecolombia@gmail.com"
            className="text-primary underline-offset-2 hover:underline"
          >
            empresatecnologicadecolombia@gmail.com
          </a>
          <br />
          Línea nacional: <strong className="tabular-nums">01 8000 210 21054</strong> · WhatsApp:{" "}
          <strong className="tabular-nums">311 748 6855</strong> · Fijo (601): <strong className="tabular-nums">570 7476</strong>.{" "}
          <Link to="/contacto" className="text-primary underline-offset-2 hover:underline">
            Ver todos los canales en Contacto
          </Link>
          .
        </p>
      </section>

      <section>
        <h2>Compromiso legal y de seguridad</h2>
        <p>
          Operamos con comunicación cifrada mediante <strong>protocolos SSL/TLS</strong>, integración segura de pagos con{" "}
          <strong>PayPal</strong> donde aplique, y políticas que prohíben de forma estricta la captura o grabación no
          autorizada de pantalla para proteger el contenido y los derechos de autor. Consulte{" "}
          <Link to="/privacidad">Privacidad</Link> y <Link to="/terminos">Términos</Link> para el detalle.
        </p>
      </section>
    </LegalPageLayout>
  );
};

export default QuienesSomosPage;
