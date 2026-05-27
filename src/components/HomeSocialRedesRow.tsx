import { useCallback, useState } from "react";
import { FacebookGlyph, InstagramGlyph } from "@/components/SocialFooterIcons";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  getHomeSocialUrl,
  loadHomeSocialRedesConfig,
  type HomeSocialIconConfig,
  type HomeSocialIconId,
} from "@/lib/homeSocialRedesConfig";
import { openHomeSocialRedes, openHomeSocialRedesCam } from "@/lib/homeSocialRedesOpen";
import { cn } from "@/lib/utils";

const YouTubeGlyph = () => (
  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden xmlns="http://www.w3.org/2000/svg">
    <path
      fill="currentColor"
      d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1c.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8zM9.7 15.6V8.4L16 12l-6.3 3.6z"
    />
  </svg>
);

const GoogleGlyph = () => (
  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden xmlns="http://www.w3.org/2000/svg">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

const NetflixGlyph = () => (
  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden xmlns="http://www.w3.org/2000/svg">
    <path
      fill="currentColor"
      d="M5.398 0v.006c3.028 8.556 5.37 15.175 8.348 23.596 2.344.756 2.905.884 3.172.884V20.89c-.752.017-2.495.084-3.251-3.799-.318-1.683-.527-2.83-.783-4.251H12.39v15.79c-1.448-.047-2.313-.068-3.766-.122v-9.31c-1.358 3.618-2.074 5.655-3.958 9.122-1.506-.612-2.301-1.076-3.767-1.566V0h3.182z"
    />
  </svg>
);

const WhatsAppGlyph = () => (
  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden xmlns="http://www.w3.org/2000/svg">
    <path
      fill="currentColor"
      d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.521-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"
    />
  </svg>
);

const TikTokBrandGlyph = () => (
  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden xmlns="http://www.w3.org/2000/svg">
    <path
      fill="#25F4EE"
      d="M13.1 4.4v8.2c0 .4-.1.7-.3 1-.4.9-1.2 1.5-2.2 1.5-1.4 0-2.5-1.1-2.5-2.5S9.2 10 10.6 10c.3 0 .6.1.9.2V7.8c-.3-.1-.6-.1-.9-.1-2.7 0-4.9 2.2-4.9 4.9s2.2 4.9 4.9 4.9c2 0 3.7-1.2 4.5-2.9.3-.6.4-1.3.4-2V8.9c1 .7 2.2 1.1 3.5 1.1V7.6c-.8 0-1.6-.2-2.3-.6-.8-.4-1.5-1-1.9-1.8-.3-.5-.4-1.1-.4-1.8h-2.3z"
    />
    <path
      fill="#FE2C55"
      d="M14 3.6v8.2c0 .4-.1.7-.3 1-.4.9-1.2 1.5-2.2 1.5-.5 0-1-.1-1.4-.4.4.8 1.2 1.3 2.1 1.3 1 0 1.8-.6 2.2-1.5.2-.3.3-.6.3-1V4.5c0 .7.1 1.3.4 1.8.4.8 1.1 1.4 1.9 1.8.7.3 1.5.5 2.3.6V6.3c-1.2 0-2.3-.4-3.2-1.1V3.6H14z"
      opacity="0.95"
    />
    <path
      fill="#fff"
      d="M13.6 4v8.4c0 .4-.1.8-.3 1.1-.4.9-1.3 1.5-2.3 1.5-1.5 0-2.6-1.2-2.6-2.6s1.2-2.6 2.6-2.6c.3 0 .7.1 1 .2V8c-.3-.1-.7-.1-1-.1-2.5 0-4.5 2-4.5 4.5S8.5 17 11 17c1.8 0 3.4-1.1 4.1-2.7.2-.5.4-1.1.4-1.7V9.2c1 .7 2.3 1.1 3.5 1.1V8.2c-.8 0-1.5-.2-2.2-.6-.8-.4-1.4-.9-1.8-1.7-.3-.5-.4-1.2-.4-1.9h-1z"
    />
  </svg>
);

const ICON_BUTTONS: {
  id: HomeSocialIconId;
  label: string;
  className: string;
  Glyph: () => JSX.Element;
}[] = [
  {
    id: "youtube",
    label: "YouTube",
    className:
      "border-red-500/65 bg-[#ff0000] text-white shadow-[0_0_20px_-6px_rgba(255,0,0,0.95)]",
    Glyph: YouTubeGlyph,
  },
  {
    id: "facebook",
    label: "Facebook",
    className:
      "border-blue-500/65 bg-[#1877f2] text-white shadow-[0_0_20px_-6px_rgba(24,119,242,0.95)]",
    Glyph: FacebookGlyph,
  },
  {
    id: "instagram",
    label: "Instagram",
    className:
      "border-fuchsia-500/65 bg-[linear-gradient(135deg,#f58529_0%,#feda77_18%,#dd2a7b_45%,#8134af_72%,#515bd4_100%)] text-white shadow-[0_0_20px_-6px_rgba(221,42,123,0.95)]",
    Glyph: InstagramGlyph,
  },
  {
    id: "tiktok",
    label: "TikTok",
    className: "border-white/65 bg-black text-white shadow-[0_0_20px_-6px_rgba(255,255,255,0.6)]",
    Glyph: TikTokBrandGlyph,
  },
  {
    id: "google",
    label: "Google",
    className: "border-white/50 bg-white text-white shadow-[0_0_20px_-6px_rgba(255,255,255,0.75)]",
    Glyph: GoogleGlyph,
  },
  {
    id: "netflix",
    label: "Netflix",
    className:
      "border-red-600/70 bg-[#E50914] text-white shadow-[0_0_20px_-6px_rgba(229,9,20,0.95)]",
    Glyph: NetflixGlyph,
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    className:
      "border-emerald-400/65 bg-[#25D366] text-white shadow-[0_0_20px_-6px_rgba(37,211,102,0.95)]",
    Glyph: WhatsAppGlyph,
  },
];

export default function HomeSocialRedesRow() {
  const [icons] = useState(loadHomeSocialRedesConfig);
  const [picked, setPicked] = useState<HomeSocialIconConfig | null>(null);

  const onPickRedes = useCallback(() => {
    if (!picked) return;
    openHomeSocialRedes(getHomeSocialUrl(icons, picked.id, "redes"));
    setPicked(null);
  }, [icons, picked]);

  const onPickRedesCam = useCallback(() => {
    if (!picked) return;
    openHomeSocialRedesCam(getHomeSocialUrl(icons, picked.id, "redesCam"));
    setPicked(null);
  }, [icons, picked]);

  return (
    <>
      <div className="pointer-events-none order-2 z-[81] flex max-w-[calc(100vw-1.5rem)] items-center gap-1.5 overflow-x-auto max-sm:relative max-sm:bottom-auto max-sm:left-auto max-sm:ml-3 max-sm:pl-0 sm:absolute sm:bottom-1 sm:left-[11rem] sm:ml-0 sm:max-w-none sm:translate-x-0 sm:gap-2 sm:overflow-visible sm:pl-0">
        {ICON_BUTTONS.map(({ id, label, className, Glyph }) => (
          <button
            key={id}
            type="button"
            className={cn(
              "pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur-md",
              className,
            )}
            aria-label={label}
            onClick={() => setPicked(icons.find((i) => i.id === id) ?? null)}
          >
            <Glyph />
          </button>
        ))}
      </div>

      <AlertDialog open={picked !== null} onOpenChange={(open) => !open && setPicked(null)}>
        <AlertDialogContent className="sm:max-w-xs">
          <AlertDialogHeader>
            <AlertDialogTitle>{picked?.label}</AlertDialogTitle>
            <AlertDialogDescription className="sr-only">
              Elige Redes o Redes Cam
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
            <AlertDialogAction type="button" className="w-full" onClick={onPickRedes}>
              Redes
            </AlertDialogAction>
            <AlertDialogAction type="button" className="w-full" onClick={onPickRedesCam}>
              Redes Cam
            </AlertDialogAction>
            <AlertDialogCancel type="button" className="w-full">
              Cancelar
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
