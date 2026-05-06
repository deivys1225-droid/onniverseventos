import { Headset } from "lucide-react";

const AuthLoadingSplash = () => (
  <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-[#02030a]">
    <div className="relative">
      <div className="absolute inset-0 animate-ping rounded-full bg-primary/25 blur-xl" />
      <Headset className="relative z-10 h-12 w-12 text-primary" />
    </div>
    <p className="font-display text-sm uppercase tracking-[0.25em] text-muted-foreground">Conectando…</p>
  </div>
);

export default AuthLoadingSplash;
