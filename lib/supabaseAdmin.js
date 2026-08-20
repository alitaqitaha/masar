import { createClient } from "@supabase/supabase-js";

// هذا الملف يستخدم فقط داخل مسارات API (server-side) — لا يستورد أبداً بملف يشتغل بالمتصفح.
let cachedClient = null;

export function getSupabaseAdmin() {
  if (cachedClient) return cachedClient;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl) throw new Error("NEXT_PUBLIC_SUPABASE_URL غير موجود بمتغيرات البيئة");
  if (!serviceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY غير موجود بمتغيرات البيئة");
  cachedClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  return cachedClient;
}
