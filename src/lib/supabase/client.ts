import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "@/lib/supabase/env";

export function createClient() {
  const { supabasePublishableKey, supabaseUrl } = getSupabaseEnv();

  return createBrowserClient(supabaseUrl, supabasePublishableKey);
}
