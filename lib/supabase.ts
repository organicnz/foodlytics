import { createClient } from "@supabase/supabase-js";
import { Database } from "./types/supabase";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://blzsyikioefpnigzagxn.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_DnL6t56ttULJt9E9ygo7Wg_rs5c9BL2";

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
