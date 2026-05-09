import { useEffect } from "react";
import { Link } from "react-router-dom";
import LegalPageLayout from "@/components/LegalPageLayout";

const ORG_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "OnniVers",
  legalName: "Empresa Tecnológica de Colombia S.A.S.",
  url: "https://onnivers.com",
  taxID: "901.083.478-0",
  email: "gerencia@onniverso.com",
  founder: {
    "@type": "Person",
    name: "Davis Herrera",
    jobTitle: "Fundador y CEO",
  },
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
      description="OnniVers — La experiencia inmersiva definitiva, impulsada desde Colombia para el mundo."
    >
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
