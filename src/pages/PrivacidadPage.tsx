import LegalPageLayout from "@/components/LegalPageLayout";

const PrivacidadPage = () => {
  return (
    <LegalPageLayout
      title="Política de privacidad"
      description="OnniVerso — Empresa Tecnológica de Colombia S.A.S. Última actualización: 2026."
    >
      <section>
        <h2>1. Responsable del tratamiento</h2>
        <p>
          <strong>Empresa Tecnológica de Colombia S.A.S.</strong>, NIT <strong>901083478-0</strong>, en adelante «OnniVerso»,
          opera la plataforma OnniVerso y es responsable del tratamiento de datos personales conforme a la normativa
          colombiana aplicable y buenas prácticas internacionales.
        </p>
      </section>

      <section>
        <h2>2. Finalidades</h2>
        <p>
          Tratamos datos para prestar el servicio (cuenta, acceso a salas y experiencias), soporte, seguridad,
          cumplimiento legal, mejora del producto y comunicaciones relacionadas con el servicio cuando corresponda.
        </p>
      </section>

      <section>
        <h2>3. Seguridad de contenido y protección de obra</h2>
        <p>
          OnniVerso aplica un <strong>protocolo de seguridad de contenido</strong> orientado a la protección de derechos de
          autor y de los titulares de contenido. Entre las medidas se incluyen políticas y controles técnicos que{" "}
          <strong>prohíben de manera estricta</strong>, salvo autorización expresa y por escrito, la{" "}
          <strong>grabación de pantalla, captura de video o reproducción no autorizada</strong> de las transmisiones y
          materiales protegidos distribuidos a través de la plataforma. El incumplimiento puede conllevar la suspensión
          del acceso y las acciones legales pertinentes.
        </p>
      </section>

      <section>
        <h2>4. Certificaciones y canal seguro (SSL)</h2>
        <p>
          La plataforma utiliza <strong>certificados de seguridad SSL/TLS</strong> para cifrar la comunicación entre su
          dispositivo y nuestros servidores, reduciendo el riesgo de interceptación. Asimismo implementamos{" "}
          <strong>protocolos de protección de identidad y acceso</strong> acordes al tipo de servicio (autenticación,
          controles de sesión y buenas prácticas de seguridad operativa).
        </p>
      </section>

      <section>
        <h2>5. Pagos — PayPal</h2>
        <p>
          Las transacciones comerciales habilitadas en la plataforma se procesan mediante la{" "}
          <strong>integración oficial de PayPal</strong>, que aplica sus propios estándares de seguridad y cifrado para
          pagos. OnniVerso no almacena datos completos de tarjeta en sus sistemas como parte de ese flujo; el tratamiento
          queda sujeto también a las políticas de PayPal.
        </p>
      </section>

      <section>
        <h2>6. Derechos del titular y contacto</h2>
        <p>
          Puede ejercer derechos de consulta, rectificación, actualización o supresión cuando corresponda, y enviar
          solicitudes o reclamos al correo <a href="mailto:gerencia@onniverso.com">gerencia@onniverso.com</a>. Soporte
          internacional: <strong>01-8000</strong>.
        </p>
      </section>
    </LegalPageLayout>
  );
};

export default PrivacidadPage;
