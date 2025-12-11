import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL = `${import.meta.env.VITE_API_DinoSprout_Database_URL}`;
export const ANON_KEY = `${import.meta.env.VITE_API_DinoSprout_Database_ANON}`; 

export const supabase = createClient(SUPABASE_URL, ANON_KEY);
