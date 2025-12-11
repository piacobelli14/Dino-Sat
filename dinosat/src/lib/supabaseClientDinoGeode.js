import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL = `${import.meta.env.VITE_API_DinoGeode_Database_URL}`;
export const ANON_KEY = `${import.meta.env.VITE_API_DinoGeode_Database_ANON}`; 
export const PHOTO_BUCKET = `${import.meta.env.VITE_API_DinoGeode_Database_Photo_Bucket}`;

export const supabase = createClient(SUPABASE_URL, ANON_KEY);
