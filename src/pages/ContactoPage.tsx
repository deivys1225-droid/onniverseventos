import LegalPageLayout from "@/components/LegalPageLayout";

const ContactoPage = () => {
  return (
    <LegalPageLayout
      title="Contacto"
      description="Canales oficiales de OnniVers — Empresa Tecnológica de Colombia S.A.S."
    >
      <section>
        <h2>Correo electrónico</h2>
        <p>
          <strong>Contacto:</strong>{" "}
          <a href="mailto:gerencia@onniverso.com">gerencia@onniverso.com</a>
        </p>
      </section>
      <section>
        <h2>Soporte internacional</h2>
        <p>
          <strong>Soporte internacional:</strong> <span className="text-foreground">01-8000</span>
        </p>
      </section>
      <section>
        <h2>Información corporativa</h2>
        <p>
          Razón social: Empresa Tecnológica de Colombia S.A.S. · NIT 901083478-0 · Marca OnniVers.
        </p>
      </section>
    </LegalPageLayout>
  );
};

export default ContactoPage;
