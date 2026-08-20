import { createClient } from "@supabase/supabase-js";

// هذا الملف يستخدم فقط داخل مسارات API (server-side) — لا يستورد أبداً بملف يشتغل بالمتصفح.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});
