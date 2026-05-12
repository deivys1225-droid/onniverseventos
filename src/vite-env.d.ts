/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  /** Alias opcional si copias variables desde plantillas Next.js */
  readonly NEXT_PUBLIC_SUPABASE_URL?: string;
  readonly NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
  readonly NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
  readonly VITE_PAYPAL_CLIENT_ID?: string;
  readonly VITE_PAYPAL_ENVIRONMENT?: "sandbox" | "production";
  readonly VITE_N8N_PAYMENT_WEBHOOK?: string;
  /** URLs absolutas a MP4 si no van en public/ (p. ej. en Vercel sin subir vídeos al repo) */
  readonly VITE_FREE_MATCH_VIDEO_URL?: string;
  readonly VITE_SECOND_MATCH_VIDEO_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
