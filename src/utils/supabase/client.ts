"use client";

import { createBrowserClient } from "@supabase/ssr";

import { fulfillmentSupabasePublishableKey } from "@/lib/safety";

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = fulfillmentSupabasePublishableKey();

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Fulfillment Supabase public environment variables.");
  }

  return createBrowserClient(supabaseUrl, supabaseKey);
}
