import { supabase } from "@/integrations/supabase/client";
import { buildAgoraChannel } from "@/lib/agoraRooms";
import type { RoomCard } from "@/lib/salaRoomCards";

const LIVE_EVENT_IMAGES_BUCKET = "live-event-images";

export const CONCIERTO_LIVE_STREAM_CATEGORY = "ConciertosLive";

/** 2 h antes del evento hasta 6 h después. */
export const CONCIERTO_EMIT_WINDOW_BEFORE_MS = 2 * 60 * 60 * 1000;
export const CONCIERTO_EMIT_WINDOW_AFTER_MS = 6 * 60 * 60 * 1000;

export const CONCIERTO_LIVE_CARD_SELECT =
  "id,full_name,avatar_url,live_status,concierto_live_access,concierto_card_title,concierto_card_subtitle,concierto_card_description,concierto_card_image_url,concierto_card_published,concierto_event_at,concierto_event_timezone";

export type ConciertoLiveProfileRow = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  live_status?: string | null;
  concierto_live_access?: boolean | null;
  concierto_card_title?: string | null;
  concierto_card_subtitle?: string | null;
  concierto_card_description?: string | null;
  concierto_card_image_url?: string | null;
  concierto_card_published?: boolean | null;
  concierto_event_at?: string | null;
  concierto_event_timezone?: string | null;
};

export type ConciertoLiveCardConfig = {
  title: string;
  subtitle: string;
  description: string;
  imageUrl: string;
  published: boolean;
  eventAt: string | null;
  eventTimezone: string;
};

export type ConciertoLiveUserState = {
  hasAccess: boolean;
  hasSavedCard: boolean;
  config: ConciertoLiveCardConfig | null;
  draftDefaults: ConciertoLiveCardConfig | null;
};

export type ConciertoEmitStatus = {
  canEmit: boolean;
  message: string;
  eventAt: string | null;
  formattedEvent: string | null;
  isLiveNow: boolean;
  hasAccess: boolean;
  hasSavedCard: boolean;
};

const DEFAULT_SUBTITLE = "Live Premium";
const DEFAULT_DESCRIPTION = "Crea tu evento live y transmite en modo premium.";
const DEFAULT_TIMEZONE = "America/Lima";

export const CONCIERTO_EMIT_DRAFT_SESSION_KEY = "onniverso.conciertos-live.emit-draft";

export type ConciertoEmitDraft = ConciertoLiveCardConfig & { userId: string };

/**
 * Modo prueba (emitir/publicar sin pago). En el navegador también detecta onnivers.com
 * aunque el build no traiga VITE_SITE_URL correcto.
 */
export function isConciertoLiveTestMode(): boolean {
  if (import.meta.env.VITE_CONCIERTO_LIVE_DEV_ACCESS === "false") return false;
  if (import.meta.env.VITE_CONCIERTO_LIVE_DEV_ACCESS === "true") return true;
  if (import.meta.env.DEV) return true;
  const site = (import.meta.env.VITE_SITE_URL ?? "").toLowerCase();
  if (site.includes("onnivers.com")) return true;
  if (typeof window !== "undefined") {
    const host = window.location.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1") return true;
    if (host === "onnivers.com" || host.endsWith(".onnivers.com")) return true;
  }
  return false;
}

export function saveConciertoEmitDraft(draft: ConciertoEmitDraft): void {
  try {
    sessionStorage.setItem(CONCIERTO_EMIT_DRAFT_SESSION_KEY, JSON.stringify(draft));
  } catch {
    /* sessionStorage no disponible */
  }
}

export function loadConciertoEmitDraft(userId: string): ConciertoEmitDraft | null {
  try {
    const raw = sessionStorage.getItem(CONCIERTO_EMIT_DRAFT_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConciertoEmitDraft;
    if (parsed.userId !== userId) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Listo para abrir el panel Mux (formulario completo, borrador o tarjeta guardada). */
export function canOpenConciertoEmitPanel(params: {
  userId: string | undefined;
  title: string;
  eventLocal: string;
  emitStatus: ConciertoEmitStatus | null;
}): boolean {
  if (!params.userId) return false;
  if (params.emitStatus?.isLiveNow) return true;
  if (params.emitStatus?.canEmit) return true;
  const hasForm = Boolean(params.title.trim() && params.eventLocal.trim());
  if (hasForm) return true;
  if (loadConciertoEmitDraft(params.userId)) return true;
  return false;
}

export function displayNameFromProfile(row: Pick<ConciertoLiveProfileRow, "full_name">): string {
  return row.full_name?.trim() || "Explorador VR";
}

export function hasConciertoLiveAccess(row: ConciertoLiveProfileRow): boolean {
  if (row.concierto_live_access === true) return true;
  if (isConciertoLiveTestMode()) return true;
  return false;
}

export function hasSavedConciertoCard(row: ConciertoLiveProfileRow): boolean {
  return Boolean(row.concierto_card_title?.trim());
}

function defaultExampleEventAt(): string {
  if (isConciertoLiveTestMode()) {
    return new Date().toISOString();
  }
  const d = new Date();
  d.setDate(d.getDate() + 7);
  d.setHours(20, 0, 0, 0);
  return d.toISOString();
}

export function formatConciertoEventDisplay(
  eventAtIso: string | null,
  timeZone = DEFAULT_TIMEZONE,
): string | null {
  if (!eventAtIso) return null;
  const ms = Date.parse(eventAtIso);
  if (!Number.isFinite(ms)) return null;
  return new Intl.DateTimeFormat("es", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(new Date(ms));
}

/** Valor para `<input type="datetime-local" />` en hora local del navegador. */
export function isoToDatetimeLocalValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function datetimeLocalValueToIso(localValue: string): string | null {
  if (!localValue.trim()) return null;
  const ms = new Date(localValue).getTime();
  if (!Number.isFinite(ms)) return null;
  return new Date(ms).toISOString();
}

export function canEmitConciertoLive(
  eventAtIso: string | null,
  nowMs = Date.now(),
): { allowed: boolean; message: string } {
  if (isConciertoLiveTestMode()) {
    return { allowed: true, message: "Modo prueba: puedes emitir en cualquier momento." };
  }
  if (!eventAtIso) {
    return { allowed: false, message: "Guarda la fecha de tu evento para habilitar la emisión." };
  }
  const startMs = Date.parse(eventAtIso);
  if (!Number.isFinite(startMs)) {
    return { allowed: false, message: "Fecha de evento no válida." };
  }
  const windowStart = startMs - CONCIERTO_EMIT_WINDOW_BEFORE_MS;
  const windowEnd = startMs + CONCIERTO_EMIT_WINDOW_AFTER_MS;
  const formatted = formatConciertoEventDisplay(eventAtIso);

  if (nowMs < windowStart) {
    return {
      allowed: false,
      message: formatted ? `Programado para ${formatted}` : "Aún no es la ventana de emisión.",
    };
  }
  if (nowMs > windowEnd) {
    return { allowed: false, message: "La ventana de emisión de este evento ya terminó." };
  }
  return { allowed: true, message: "Puedes emitir en vivo ahora." };
}

function cardConfigFromRow(row: ConciertoLiveProfileRow, overrides?: Partial<ConciertoLiveCardConfig>): ConciertoLiveCardConfig {
  const name = displayNameFromProfile(row);
  const avatar = row.avatar_url?.trim() || "/placeholder.svg";
  return {
    title: overrides?.title ?? row.concierto_card_title?.trim() ?? name,
    subtitle: overrides?.subtitle ?? row.concierto_card_subtitle?.trim() ?? DEFAULT_SUBTITLE,
    description: overrides?.description ?? row.concierto_card_description?.trim() ?? DEFAULT_DESCRIPTION,
    imageUrl: overrides?.imageUrl ?? row.concierto_card_image_url?.trim() ?? avatar,
    published: overrides?.published ?? row.concierto_card_published === true,
    eventAt: overrides?.eventAt ?? row.concierto_event_at ?? null,
    eventTimezone: overrides?.eventTimezone ?? (row.concierto_event_timezone?.trim() || DEFAULT_TIMEZONE),
  };
}

export function draftConciertoCardFromProfile(row: ConciertoLiveProfileRow): ConciertoLiveCardConfig {
  return {
    ...cardConfigFromRow(row, {
      title: displayNameFromProfile(row),
      subtitle: DEFAULT_SUBTITLE,
      description: DEFAULT_DESCRIPTION,
      imageUrl: row.avatar_url?.trim() || "/placeholder.svg",
      published: true,
      eventAt: row.concierto_event_at ?? defaultExampleEventAt(),
      eventTimezone: row.concierto_event_timezone?.trim() || DEFAULT_TIMEZONE,
    }),
  };
}

export function savedConciertoCardConfigFromProfile(row: ConciertoLiveProfileRow): ConciertoLiveCardConfig | null {
  if (!hasSavedConciertoCard(row)) return null;
  return cardConfigFromRow(row);
}

export function conciertoLiveStateFromProfile(row: ConciertoLiveProfileRow): ConciertoLiveUserState {
  const access = hasConciertoLiveAccess(row);
  const saved = savedConciertoCardConfigFromProfile(row);
  return {
    hasAccess: access,
    hasSavedCard: Boolean(saved),
    config: saved,
    draftDefaults: !saved ? draftConciertoCardFromProfile(row) : null,
  };
}

/** Tarjetas publicadas en Nuestras salas (`id` = `concierto-{userId}`). */
export function isConciertoRoomCard(room: Pick<RoomCard, "id">): boolean {
  return room.id.startsWith("concierto-");
}

export function profileRowToConciertoRoomCard(row: ConciertoLiveProfileRow): RoomCard | null {
  const accessOk = hasConciertoLiveAccess(row);
  if (!accessOk || !hasSavedConciertoCard(row) || row.concierto_card_published !== true) {
    return null;
  }
  const config = savedConciertoCardConfigFromProfile(row);
  if (!config) return null;
  const eventLabel = formatConciertoEventDisplay(config.eventAt, config.eventTimezone);
  return {
    id: `concierto-${row.id}`,
    name: config.title,
    image: config.imageUrl,
    subtitle: config.subtitle,
    description: eventLabel ? `${config.description} · ${eventLabel}` : config.description,
    status: row.live_status?.trim() || "",
    liveStatus: row.live_status?.trim() || "",
    channel: buildAgoraChannel(row.id),
    isPremium: true,
    priceUsd: 0,
    ownerUserId: row.id,
  };
}

function isMissingConciertoColumnError(error: { message?: string; details?: string }): boolean {
  const details = `${error.message ?? ""} ${error.details ?? ""}`.toLowerCase();
  return (
    (details.includes("concierto_") || details.includes("concierto_card")) &&
    (details.includes("does not exist") || details.includes("schema cache"))
  );
}

export async function fetchPublishedConciertoCards(): Promise<RoomCard[]> {
  let query = supabase
    .from("profiles")
    .select(CONCIERTO_LIVE_CARD_SELECT)
    .eq("concierto_card_published", true)
    .not("concierto_card_title", "is", null)
    .order("updated_at", { ascending: false });

  if (!isConciertoLiveTestMode()) {
    query = query.eq("concierto_live_access", true);
  }

  const { data, error } = await query;

  if (error) {
    if (isMissingConciertoColumnError(error)) return [];
    throw error;
  }

  return ((data ?? []) as ConciertoLiveProfileRow[])
    .map(profileRowToConciertoRoomCard)
    .filter((card): card is RoomCard => card !== null);
}

export async function fetchConciertoLiveState(userId: string): Promise<ConciertoLiveUserState | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(CONCIERTO_LIVE_CARD_SELECT)
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    if (isMissingConciertoColumnError(error)) return null;
    throw error;
  }
  if (!data) return null;
  return conciertoLiveStateFromProfile(data as ConciertoLiveProfileRow);
}

export async function fetchConciertoEmitStatus(userId: string): Promise<ConciertoEmitStatus | null> {
  const [{ data: profile, error: profileErr }, { data: stream }] = await Promise.all([
    supabase.from("profiles").select(CONCIERTO_LIVE_CARD_SELECT).eq("id", userId).maybeSingle(),
    supabase.from("active_streams").select("is_live").eq("user_id", userId).maybeSingle(),
  ]);

  if (profileErr) {
    if (isMissingConciertoColumnError(profileErr)) return null;
    throw profileErr;
  }
  if (!profile) return null;

  const row = profile as ConciertoLiveProfileRow;
  const testMode = isConciertoLiveTestMode();
  const access = hasConciertoLiveAccess(row);
  const saved = hasSavedConciertoCard(row);
  const eventAt = row.concierto_event_at ?? null;
  const emitWindow = canEmitConciertoLive(eventAt);
  const isLiveNow = Boolean(stream?.is_live);

  const draft = typeof window !== "undefined" ? loadConciertoEmitDraft(userId) : null;
  const canEmit = isLiveNow
    ? true
    : Boolean(draft)
      ? true
      : testMode
        ? access && (saved || Boolean(eventAt))
        : access && saved && emitWindow.allowed;

  return {
    hasAccess: access,
    hasSavedCard: saved || Boolean(draft),
    eventAt: eventAt ?? draft?.eventAt ?? null,
    formattedEvent: formatConciertoEventDisplay(
      eventAt ?? draft?.eventAt ?? null,
      row.concierto_event_timezone ?? DEFAULT_TIMEZONE,
    ),
    isLiveNow,
    canEmit,
    message: isLiveNow
      ? "Ya estás en vivo."
      : draft
        ? "Listo para emitir live (mismo panel Mux/OBS que en PC)."
        : testMode
          ? saved
            ? "Listo para emitir live."
            : "Completa título y fecha, guarda si quieres, y pulsa Emitir live."
          : !access
            ? "Activa tu plan premium para emitir."
            : !saved
              ? "Completa título y fecha del evento para emitir."
              : emitWindow.message
  };
}

export async function grantConciertoLiveAccess(userId: string): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ concierto_live_access: true, updated_at: new Date().toISOString() } as never)
    .eq("id", userId);
  if (error) throw error;
}

export async function uploadConciertoCardImage(userId: string, file: File): Promise<string> {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const safeExt = /^[a-z0-9]+$/.test(ext) ? ext : "jpg";
  const path = `${userId}/concierto-card-${Date.now()}.${safeExt}`;
  const { error: uploadError } = await supabase.storage.from(LIVE_EVENT_IMAGES_BUCKET).upload(path, file, {
    upsert: false,
    contentType: file.type || "image/jpeg",
    cacheControl: "3600",
  });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(LIVE_EVENT_IMAGES_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function saveConciertoLiveCard(userId: string, config: ConciertoLiveCardConfig): Promise<void> {
  const state = await fetchConciertoLiveState(userId);
  const testMode = isConciertoLiveTestMode();
  const hasAccess = Boolean(state?.hasAccess) || testMode;

  if (config.published && !hasAccess) {
    throw new Error("PREMIUM_REQUIRED");
  }

  const payload: Record<string, string | boolean | null> = {
    concierto_card_title: config.title.trim(),
    concierto_card_subtitle: config.subtitle.trim() || DEFAULT_SUBTITLE,
    concierto_card_description: config.description.trim() || DEFAULT_DESCRIPTION,
    concierto_card_image_url: config.imageUrl.trim() || null,
    concierto_card_published: hasAccess ? config.published : false,
    concierto_event_at: config.eventAt,
    concierto_event_timezone: config.eventTimezone.trim() || DEFAULT_TIMEZONE,
    updated_at: new Date().toISOString(),
  };

  if (testMode) {
    payload.concierto_live_access = true;
  }

  const { error } = await supabase.from("profiles").update(payload as never).eq("id", userId);
  if (error) {
    if (isMissingConciertoColumnError(error)) {
      const { concierto_event_at: _a, concierto_event_timezone: _b, ...legacy } = payload;
      const { error: fallback } = await supabase.from("profiles").update(legacy as never).eq("id", userId);
      if (fallback) throw fallback;
      return;
    }
    throw error;
  }
}

export function conciertoMuxChannelSlug(userId: string): string {
  return userId.replace(/-/g, "").slice(0, 12) || "concierto";
}
