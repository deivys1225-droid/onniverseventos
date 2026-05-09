import LegalPageLayout from "@/components/LegalPageLayout";

const PrivacidadPage = () => {
  return (
    <LegalPageLayout
      title="Política de privacidad"
      description="OnniVers — Empresa Tecnológica de Colombia S.A.S. Última actualización: 2026."
    >
      <section>
        <h2>1. Responsable del tratamiento</h2>
        <p>
          <strong>Empresa Tecnológica de Colombia S.A.S.</strong>,{" "}
          <span className="whitespace-nowrap tabular-nums">
            NIT <strong>901.083.478-0</strong>
          </span>
          ,
          en adelante «OnniVers», opera la plataforma OnniVers y es responsable del tratamiento de datos personales
          conforme a la normativa colombiana aplicable y buenas prácticas internacionales.
        </p>
      </section>

      <section>
        <h2>2. Finalidades</h2>
        <p>
          Tratamos datos para prestar el servicio (cuenta, acceso a salas y experiencias), soporte, seguridad,
          cumplimiento legal, mejora del producto y comunicaciones relacionadas con el servicio cuando corresponda.
        </p>
      </section>

      <section
        className="rounded-xl border border-primary/25 bg-primary/5 p-4 md:p-5 [&_h2]:mt-0"
        aria-labelledby="privacy-disclosure-heading"
      >
        <h2 id="privacy-disclosure-heading">3. Divulgación destacada — cámara y micrófono</h2>
        <p className="text-foreground">
          <strong>Solicitamos acceso a cámara y audio únicamente para habilitar la función de emisión en vivo del usuario.</strong>{" "}
          No utilizamos estos permisos con fines distintos a esa función sin su conocimiento y las opciones del sistema
          operativo.
        </p>
      </section>

      <section>
        <h2>4. Seguridad de contenido y protección de obra</h2>
        <p>
          OnniVers aplica un <strong>protocolo de seguridad de contenido</strong> orientado a la protección de derechos de
          autor y de los titulares de contenido. Entre las medidas se incluyen políticas y controles técnicos que{" "}
          <strong>prohíben de manera estricta</strong>, salvo autorización expresa y por escrito, la{" "}
          <strong>grabación de pantalla, captura de video o reproducción no autorizada</strong> de las transmisiones y
          materiales protegidos distribuidos a través de la plataforma. El incumplimiento puede conllevar la suspensión
          del acceso y las acciones legales pertinentes.
        </p>
      </section>

      <section>
        <h2>5. Certificaciones y canal seguro (SSL/TLS)</h2>
        <p>
          La plataforma utiliza <strong>certificados de seguridad SSL/TLS</strong> (HTTPS) para cifrar la comunicación
          entre su dispositivo y nuestros servidores, reduciendo el riesgo de interceptación. Asimismo implementamos{" "}
          <strong>protocolos de protección de identidad y acceso</strong> acordes al tipo de servicio (autenticación,
          controles de sesión y buenas prácticas de seguridad operativa).
        </p>
      </section>

      <section>
        <h2>6. Pagos — integración segura con PayPal</h2>
        <p>
          Las transacciones comerciales habilitadas en la plataforma se procesan mediante la{" "}
          <strong>integración oficial y segura de PayPal</strong>, que aplica sus propios estándares de seguridad y
          cifrado para pagos. OnniVers no almacena datos completos de tarjeta en sus sistemas como parte de ese flujo; el
          tratamiento queda sujeto también a las políticas de PayPal.
        </p>
      </section>

      <section>
        <h2>7. Derechos del titular y contacto</h2>
        <p>
          Puede ejercer derechos de consulta, rectificación, actualización o supresión cuando corresponda, y enviar
          solicitudes o reclamos a{" "}
          <a href="mailto:gerencia@onniverso.com">gerencia@onniverso.com</a> o{" "}
          <a href="mailto:empresatecnologicadecolombia@gmail.com">empresatecnologicadecolombia@gmail.com</a>. Teléfonos y
          WhatsApp: <strong className="tabular-nums">01 8000 210 21054</strong>,{" "}
          <strong className="tabular-nums">(601) 570 7476</strong>, WhatsApp{" "}
          <strong className="tabular-nums">311 748 6855</strong>.
        </p>
      </section>
    </LegalPageLayout>
  );
};

export default PrivacidadPage;
