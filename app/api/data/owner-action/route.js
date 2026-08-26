import { cookies } from "next/headers";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";
import { verifySessionToken } from "../../../../lib/session";
import { hashPassword } from "../../../../lib/passwordHash";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("masar_session")?.value;
    const session = verifySessionToken(token);
    if (!session || session.role !== "owner") {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }

    const { action, payload } = await request.json();
    const db = getSupabaseAdmin();

    switch (action) {
      case "addInstitute": {
        const { name, adminUsername, adminPassword } = payload;
        const { error } = await db.from("institutes").insert({
          name,
          admin_username: adminUsername,
          admin_password: hashPassword(adminPassword),
          status: "active",
        });
        if (error) {
          const msg = (error.message || "").includes("duplicate") ? "duplicate" : error.message;
          return Response.json({ error: msg }, { status: 409 });
        }
        return Response.json({ ok: true });
      }

      case "deleteInstitute": {
        const { instituteId } = payload;
        const { error } = await db.from("institutes").delete().eq("id", instituteId);
        if (error) throw error;
        return Response.json({ ok: true });
      }

      case "toggleInstituteStatus": {
        const { instituteId, newStatus } = payload;
        if (newStatus !== "active" && newStatus !== "suspended") {
          return Response.json({ error: "invalid status" }, { status: 400 });
        }
        const { error } = await db.from("institutes").update({ status: newStatus }).eq("id", instituteId);
        if (error) throw error;
        return Response.json({ ok: true });
      }

      default:
        return Response.json({ error: "unknown action" }, { status: 400 });
    }
  } catch (e) {
    console.error("owner-action error:", e);
    return Response.json({ error: (e && e.message) || "action failed" }, { status: 500 });
  }
}
