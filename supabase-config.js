// ============================================================
// Supabase configuration
// Replace the two values below with your real project's values:
// Supabase Dashboard → Project Settings → API
// ============================================================
export const SUPABASE_URL = "https://YOUR-PROJECT-REF.supabase.co";
export const SUPABASE_ANON_KEY = "YOUR-PUBLIC-ANON-KEY";

// WhatsApp number used for the optional "share order" button
export const WHATSAPP_NUMBER = "201123330540"; // no + or leading zeros

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
