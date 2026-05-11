import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  assertNotPledgeManagerSupabaseUrl,
  fulfillmentSupabasePublishableKey,
  hasFulfillmentSupabasePublicConfig,
  hasFulfillmentSupabaseServiceRoleConfig,
  isPledgeManagerSupabaseUrl,
} from "@/lib/safety";

let serviceRoleClient: SupabaseClient | null = null;

export {
  fulfillmentSupabasePublishableKey,
  hasFulfillmentSupabasePublicConfig,
  hasFulfillmentSupabaseServiceRoleConfig,
  isPledgeManagerSupabaseUrl,
};

export function getSupabaseServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Fulfillment Supabase service-role environment variables.");
  }

  assertNotPledgeManagerSupabaseUrl(supabaseUrl);

  if (!serviceRoleClient) {
    serviceRoleClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return serviceRoleClient;
}
