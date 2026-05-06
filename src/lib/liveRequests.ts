import { supabase } from "@/integrations/supabase/client";

const LIVE_EVENT_IMAGES_BUCKET = "live-event-images";

export type CreateLiveRequestInput = {
  userId: string;
  requesterEmail: string;
  artistName: string;
  ticketPrice: number;
  stadiumDisplayName: string;
  eventImageUrl: string;
};

export async function uploadLiveEventImage(userId: string, file: File): Promise<string> {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const safeExt = /^[a-z0-9]+$/.test(ext) ? ext : "jpg";
  const path = `${userId}/${Date.now()}-event.${safeExt}`;
  const { error: uploadError } = await supabase.storage.from(LIVE_EVENT_IMAGES_BUCKET).upload(path, file, {
    upsert: false,
    contentType: file.type || "image/jpeg",
    cacheControl: "3600",
  });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(LIVE_EVENT_IMAGES_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function createLiveRequest(input: CreateLiveRequestInput): Promise<void> {
  const { error } = await supabase.from("live_requests").insert({
    user_id: input.userId,
    requester_email: input.requesterEmail,
    artist_name: input.artistName,
    ticket_price: input.ticketPrice,
    stadium_display_name: input.stadiumDisplayName,
    event_image_url: input.eventImageUrl,
  });
  if (error) throw error;
}
