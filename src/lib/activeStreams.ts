import { supabase } from "@/integrations/supabase/client";

export async function startActiveStream(input: {
  userId: string;
  streamUrl: string;
  title: string;
  category: string;
}) {
  const { error } = await supabase.from("active_streams").upsert(
    {
      user_id: input.userId,
      stream_url: input.streamUrl,
      title: input.title,
      category: input.category,
      is_live: true,
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ live_status: "En Vivo", updated_at: new Date().toISOString() })
    .eq("id", input.userId);
  if (profileError) throw profileError;
}

export async function stopMyActiveStream() {
  const { error } = await supabase.rpc("stop_my_active_streams");
  if (error) throw error;
}
