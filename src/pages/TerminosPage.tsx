import LegalPageLayout from "@/components/LegalPageLayout";

const TerminosPage = () => {
  return (
    <LegalPageLayout
      title="Términos y condiciones de uso"
      description="OnniVerso — Empresa Tecnológica de Colombia S.A.S. NIT 901083478-0. Última actualización: 2026."
    >
      <section>
        <h2>1. Identificación</h2>
        <p>
          El sitio y la aplicación <strong>OnniVerso</strong> son operados por{" "}
          <strong>Empresa Tecnológica de Colombia S.A.S.</strong>, NIT <strong>901083478-0</strong>. Al acceder o usar
          el servicio, usted acepta estos términos.
        </p>
      </section>

      <section>
        <h2>2. Objeto del servicio</h2>
        <p>
          OnniVerso ofrece experiencias digitales e inmersivas, incluyendo acceso a salas, contenidos y funciones
          descritas en la plataforma, sujetas a disponibilidad técnica y a las reglas de cada evento o sala.
        </p>
      </section>

      <section>
        <h2>3. Propiedad intelectual y uso del contenido</h2>
        <p>
          Los contenidos, marcas, diseños y transmisiones están protegidos. El usuario se compromete a no reproducir,
          distribuir ni explotar material sin autorización. OnniVerso mantiene un{" "}
          <strong>protocolo de seguridad de contenido</strong> que{" "}
          <strong>prohíbe estrictamente la grabación de pantalla, capturas de video no autorizadas</strong> y conductas
          que vulneren derechos de autor o contratos con terceros.
        </p>
      </section>

      <section>
        <h2>4. Seguridad de la plataforma y certificaciones</h2>
        <p>
          La comunicación con la plataforma se protege mediante <strong>certificados SSL/TLS</strong> y prácticas de
          seguridad orientadas a la <strong>protección de identidad</strong> y la integridad del servicio. El usuario es
          responsable de la confidencialidad de sus credenciales.
        </p>
      </section>

      <section>
        <h2>5. Pagos con PayPal</h2>
        <p>
          Cuando estén disponibles pagos en línea, estos se procesan mediante la{" "}
          <strong>pasarela oficial PayPal</strong>, con transacciones seguras y encriptadas según los estándares de dicho
          proveedor. Las condiciones comerciales específicas (precios, reembolsos, eventos) se informarán en el checkout o
          en la descripción del producto.
        </p>
      </section>

      <section>
        <h2>6. Limitación y ley aplicable</h2>
        <p>
          En la medida permitida por la ley, OnniVerso limita responsabilidades por daños indirectos o pérdidas de
          beneficios. Para controversias, se aplicará la legislación colombiana y los tribunales competentes en Colombia,
          salvo norma imperativa en contrario.
        </p>
      </section>

      <section>
        <h2>7. Contacto</h2>
        <p>
          <a href="mailto:gerencia@onniverso.com">gerencia@onniverso.com</a> · Soporte internacional{" "}
          <strong>01-8000</strong>.
        </p>
      </section>
    </LegalPageLayout>
  );
};

export default TerminosPage;
