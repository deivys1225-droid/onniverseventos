import LegalPageLayout from "@/components/LegalPageLayout";
import WhatsAppBrandIcon from "@/components/WhatsAppBrandIcon";
import { Mail, Phone } from "lucide-react";

const WA_LINK = "https://wa.me/573117486855";

const ContactoPage = () => {
  return (
    <LegalPageLayout
      title="Contacto"
      description="Canales oficiales de OnniVers — Empresa Tecnológica de Colombia S.A.S."
    >
      <section className="rounded-xl border border-primary/20 bg-card/40 p-5 backdrop-blur-sm">
        <h2 className="mb-3 font-display text-lg font-semibold text-foreground">Empresa</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          <strong className="text-foreground">Empresa Tecnológica de Colombia S.A.S.</strong>
          <br />
          <span className="whitespace-nowrap tabular-nums">
            NIT <strong className="text-foreground">901.083.478-0</strong>
          </span>
        </p>
      </section>

      <section>
        <h2>Teléfonos y línea nacional</h2>
        <ul className="space-y-3 text-sm">
          <li className="flex items-start gap-3">
            <Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
            <span>
              <strong className="text-foreground">Línea nacional:</strong>{" "}
              <a href="tel:+571800021021054" className="tabular-nums text-primary underline-offset-2 hover:underline">
                01 8000 210 21054
              </a>
            </span>
          </li>
          <li className="flex items-start gap-3">
            <Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
            <span>
              <strong className="text-foreground">Teléfono fijo Bogotá:</strong>{" "}
              <a href="tel:+576015707476" className="tabular-nums text-primary underline-offset-2 hover:underline">
                (601) 570 7476
              </a>
            </span>
          </li>
          <li className="flex items-start gap-3">
            <WhatsAppBrandIcon className="mt-0.5 h-5 w-5 shrink-0" />
            <span>
              <strong className="text-foreground">WhatsApp:</strong>{" "}
              <a
                href={WA_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="tabular-nums text-primary underline-offset-2 hover:underline"
              >
                311 748 6855
              </a>{" "}
              <span className="text-muted-foreground">(chat oficial)</span>
            </span>
          </li>
        </ul>
      </section>

      <section>
        <h2>Correos electrónicos</h2>
        <ul className="space-y-3 text-sm">
          <li className="flex items-start gap-3">
            <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
            <a href="mailto:gerencia@onniverso.com" className="break-all text-primary underline-offset-2 hover:underline">
              gerencia@onniverso.com
            </a>
          </li>
          <li className="flex items-start gap-3">
            <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
            <a
              href="mailto:empresatecnologicadecolombia@gmail.com"
              className="break-all text-primary underline-offset-2 hover:underline"
            >
              empresatecnologicadecolombia@gmail.com
            </a>
          </li>
        </ul>
      </section>
    </LegalPageLayout>
  );
};

export default ContactoPage;
