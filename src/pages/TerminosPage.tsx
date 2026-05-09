import LegalPageLayout from "@/components/LegalPageLayout";

const TerminosPage = () => {
  return (
    <LegalPageLayout
      title="Términos y condiciones de uso"
      description={`OnniVers — Empresa Tecnológica de Colombia S.A.S. NIT 901.083.478\u20110. Última actualización: 2026.`}
    >
      <section>
        <h2>1. Identificación</h2>
        <p>
          El sitio y la aplicación <strong>OnniVers</strong> son operados por{" "}
          <strong>Empresa Tecnológica de Colombia S.A.S.</strong>,{" "}
          <span className="whitespace-nowrap tabular-nums">
            NIT <strong>901.083.478-0</strong>
          </span>
          . Al acceder o usar el servicio, usted acepta estos
          términos.
        </p>
      </section>

      <section>
        <h2>2. Objeto del servicio</h2>
        <p>
          OnniVers ofrece experiencias digitales e inmersivas, incluyendo acceso a salas, contenidos y funciones
          descritas en la plataforma, sujetas a disponibilidad técnica y a las reglas de cada evento o sala.
        </p>
      </section>

      <section>
        <h2>3. Propiedad intelectual y uso del contenido</h2>
        <p>
          Los contenidos, marcas, diseños y transmisiones están protegidos. El usuario se compromete a no reproducir,
          distribuir ni explotar material sin autorización. OnniVers mantiene un{" "}
          <strong>protocolo de seguridad de contenido</strong> que{" "}
          <strong>prohíbe estrictamente la grabación de pantalla, capturas de video no autorizadas</strong> y conductas
          que vulneren derechos de autor o contratos con terceros.
        </p>
      </section>

      <section
        className="rounded-xl border border-primary/25 bg-primary/5 p-4 md:p-5 [&_h2]:mt-0"
        aria-labelledby="terms-disclosure-heading"
      >
        <h2 id="terms-disclosure-heading">4. Permisos de cámara y micrófono (emisión en vivo)</h2>
        <p className="text-foreground">
          <strong>Solicitamos acceso a cámara y audio únicamente para habilitar la función de emisión en vivo del usuario.</strong>{" "}
          El uso de estos permisos queda limitado a esa finalidad, conforme a la configuración de su dispositivo y a esta
          política.
        </p>
      </section>

      <section>
        <h2>5. Seguridad de la plataforma y certificaciones (SSL/TLS)</h2>
        <p>
          La comunicación con la plataforma se protege mediante <strong>certificados SSL/TLS (HTTPS)</strong> y prácticas
          de seguridad orientadas a la <strong>protección de identidad</strong> y la integridad del servicio. El usuario
          es responsable de la confidencialidad de sus credenciales.
        </p>
      </section>

      <section>
        <h2>6. Pagos con PayPal</h2>
        <p>
          Cuando estén disponibles pagos en línea, estos se procesan mediante la{" "}
          <strong>pasarela oficial PayPal</strong>, con transacciones seguras y encriptadas según los estándares de dicho
          proveedor. Las condiciones comerciales específicas (precios, reembolsos, eventos) se informarán en el checkout o
          en la descripción del producto.
        </p>
      </section>

      <section>
        <h2>7. Limitación y ley aplicable</h2>
        <p>
          En la medida permitida por la ley, OnniVers limita responsabilidades por daños indirectos o pérdidas de
          beneficios. Para controversias, se aplicará la legislación colombiana y los tribunales competentes en Colombia,
          salvo norma imperativa en contrario.
        </p>
      </section>

      <section>
        <h2>8. Contacto</h2>
        <p>
          <a href="mailto:gerencia@onniverso.com">gerencia@onniverso.com</a> ·{" "}
          <a href="mailto:empresatecnologicadecolombia@gmail.com">empresatecnologicadecolombia@gmail.com</a>
          <br />
          Línea nacional <strong className="tabular-nums">01 8000 210 21054</strong> · Fijo{" "}
          <strong className="tabular-nums">(601) 570 7476</strong> · WhatsApp{" "}
          <strong className="tabular-nums">311 748 6855</strong>.
        </p>
      </section>
    </LegalPageLayout>
  );
};

export default TerminosPage;
