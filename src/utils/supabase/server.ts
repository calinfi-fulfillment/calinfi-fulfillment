import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { assertNotPledgeManagerSupabaseUrl, fulfillmentSupabasePublishableKey } from "@/lib/safety";

export async function createClient() {
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = fulfillmentSupabasePublishableKey();

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Fulfillment Supabase public environment variables.");
  }

  assertNotPledgeManagerSupabaseUrl(supabaseUrl);

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot persist refreshed cookies; middleware can handle this when auth is enabled.
        }
      },
    },
  });
}
