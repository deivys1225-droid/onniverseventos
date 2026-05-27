import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { mailtoOfficial, OFFICIAL_EMAIL } from "@/config/contact";
import {
  FacebookGlyph,
  InstagramGlyph,
  SOCIAL_LINKS,
  TikTokGlyph,
  socialFooterIconClass,
} from "@/components/SocialFooterIcons";
import { Mail } from "lucide-react";

type InvestmentContactDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const INVESTMENT_MAIL = mailtoOfficial("Inversión en OnniVerso");

export default function InvestmentContactDialog({ open, onOpenChange }: InvestmentContactDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm border-primary/30 bg-card/95 backdrop-blur-xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Contacto para inversión</DialogTitle>
          <DialogDescription>
            Escríbenos por correo o en nuestras redes. Te respondemos desde el equipo de OnniVerso.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
            <p className="mb-2 text-xs font-display font-semibold uppercase tracking-wider text-muted-foreground">
              Correo oficial
            </p>
            <a
              href={INVESTMENT_MAIL}
              className="inline-flex items-center gap-2 text-sm font-medium text-primary underline-offset-2 hover:underline"
            >
              <Mail className="h-4 w-4 shrink-0" aria-hidden />
              {OFFICIAL_EMAIL}
            </a>
          </div>

          <div>
            <p className="mb-3 text-xs font-display font-semibold uppercase tracking-wider text-muted-foreground">
              Redes sociales
            </p>
            <div className="flex flex-wrap items-center gap-3" aria-label="Redes sociales OnniVerso">
              <a
                href={SOCIAL_LINKS.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className={socialFooterIconClass}
                aria-label="Instagram — OnniVerso"
              >
                <InstagramGlyph />
              </a>
              <a
                href={SOCIAL_LINKS.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className={socialFooterIconClass}
                aria-label="Facebook — OnniVerso"
              >
                <FacebookGlyph />
              </a>
              <a
                href={SOCIAL_LINKS.tiktok}
                target="_blank"
                rel="noopener noreferrer"
                className={socialFooterIconClass}
                aria-label="TikTok — OnniVerso"
              >
                <TikTokGlyph />
              </a>
            </div>
            <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
              <li>
                <a
                  href={SOCIAL_LINKS.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground/90 hover:text-primary"
                >
                  Instagram
                </a>
              </li>
              <li>
                <a
                  href={SOCIAL_LINKS.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground/90 hover:text-primary"
                >
                  Facebook
                </a>
              </li>
              <li>
                <a
                  href={SOCIAL_LINKS.tiktok}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground/90 hover:text-primary"
                >
                  TikTok
                </a>
              </li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
