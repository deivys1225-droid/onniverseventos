import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type UserProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  updated_at: string | null;
};

export function useProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(Boolean(userId));

  const refresh = useCallback(async () => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    if (!error && data) {
      setProfile(data as UserProfile);
    } else {
      setProfile(null);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { profile, loading, refresh };
}
