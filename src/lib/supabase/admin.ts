import "server-only";
import { createClient } from "@supabase/supabase-js";

/** Service-role client for server-only jobs (push send, cron). Never expose to the browser. */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set — required for push notifications.",
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}
