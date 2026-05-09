import { useEffect } from "react";
import { Link } from "react-router-dom";
import LegalPageLayout from "@/components/LegalPageLayout";

const ORG_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "OnniVerso",
  legalName: "Empresa Tecnológica de Colombia S.A.S.",
  url: "https://onnivers.com",
  taxID: "901083478-0",
  email: "gerencia@onniverso.com",
  founder: {
    "@type": "Person",
    name: "David",
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
      description="OnniVerso — La experiencia inmersiva definitiva, impulsada desde Colombia para el mundo."
    >
      <section>
        <h2>OnniVerso</h2>
        <p>
          <strong>OnniVerso</strong> es la plataforma de <strong>Empresa Tecnológica de Colombia S.A.S.</strong> (NIT{" "}
          <strong>901083478-0</strong>), dedicada a experiencias inmersivas, streaming y contenido en entornos virtuales y
          web, con un enfoque futurista y accesible.
        </p>
      </section>

      <section>
        <h2>Liderazgo</h2>
        <p>
          <strong>David</strong> es <strong>Fundador y CEO</strong> de la compañía, liderando la visión de producto, la
          relación con creadores y la expansión internacional de OnniVerso.
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
          Soporte internacional: <strong>01-8000</strong>
        </p>
      </section>

      <section>
        <h2>Compromiso legal y de seguridad</h2>
        <p>
          Operamos con comunicación cifrada (SSL), integración de pagos mediante PayPal donde aplique, y políticas que
          protegen contenido y derechos de autor.           Consulte las páginas de <Link to="/privacidad">Privacidad</Link> y{" "}
          <Link to="/terminos">Términos</Link> para el detalle.
        </p>
      </section>
    </LegalPageLayout>
  );
};

export default QuienesSomosPage;
