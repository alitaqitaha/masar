import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";
import { hashPassword } from "../../../../lib/passwordHash";

const HASH_PATTERN = /^[0-9a-f]{32}:[0-9a-f]{128}$/;

export async function POST(request) {
  try {
    const { secret } = await request.json();
    if (!process.env.MIGRATION_SECRET || secret !== process.env.MIGRATION_SECRET) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }
    const supabaseAdmin = getSupabaseAdmin();

    let studentsMigrated = 0;
    let institutesMigrated = 0;

    const { data: students, error: sErr } = await supabaseAdmin.from("students").select("id, password");
    if (sErr) throw sErr;
    for (const s of students) {
      if (!HASH_PATTERN.test(s.password || "")) {
        const { error } = await supabaseAdmin.from("students").update({ password: hashPassword(s.password) }).eq("id", s.id);
        if (error) throw error;
        studentsMigrated++;
      }
    }

    const { data: institutes, error: iErr } = await supabaseAdmin.from("institutes").select("id, admin_password");
    if (iErr) throw iErr;
    for (const i of institutes) {
      if (!HASH_PATTERN.test(i.admin_password || "")) {
        const { error } = await supabaseAdmin.from("institutes").update({ admin_password: hashPassword(i.admin_password) }).eq("id", i.id);
        if (error) throw error;
        institutesMigrated++;
      }
    }

    return Response.json({ studentsMigrated, institutesMigrated });
  } catch (e) {
    console.error("migrate-passwords error:", e);
    return Response.json({ error: (e && e.message) || "migration failed" }, { status: 500 });
  }
}
