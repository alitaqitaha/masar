import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";
import { hashPassword } from "../../../../lib/passwordHash";

export async function POST(request) {
  try {
    const { name, adminUsername, adminPassword } = await request.json();
    if (!name || !adminUsername || !adminPassword) {
      return Response.json({ error: "missing fields" }, { status: 400 });
    }
    const supabaseAdmin = getSupabaseAdmin();

    const { error } = await supabaseAdmin.from("institutes").insert({
      name,
      admin_username: adminUsername,
      admin_password: hashPassword(adminPassword),
      status: "active",
    });
    if (error) throw error;

    return Response.json({ ok: true });
  } catch (e) {
    console.error("create-institute error:", e);
    const msg = (e && e.message) || "";
    if (msg.includes("duplicate") || msg.includes("unique")) {
      return Response.json({ error: "duplicate" }, { status: 409 });
    }
    return Response.json({ error: msg || "create-institute failed" }, { status: 500 });
  }
}
