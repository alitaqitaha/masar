import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";
import { verifyPassword } from "../../../../lib/passwordHash";
import { createSessionToken } from "../../../../lib/session";

function withSessionCookie(json, sessionPayload) {
  const token = createSessionToken(sessionPayload);
  const res = Response.json(json);
  res.headers.append(
    "Set-Cookie",
    `masar_session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${60 * 60 * 24 * 30}`
  );
  return res;
}

export async function POST(request) {
  try {
    const { role, username, password } = await request.json();
    if (!role || !username || !password) {
      return Response.json({ error: "missing fields" }, { status: 400 });
    }
    const supabaseAdmin = getSupabaseAdmin();

    if (role === "admin") {
      // المالك — بيانات دخوله محفوظة بمتغيرات بيئة السيرفر فقط، أبداً بالكود
      const ownerUsername = process.env.OWNER_USERNAME;
      const ownerPasswordHash = process.env.OWNER_PASSWORD_HASH;
      if (ownerUsername && ownerPasswordHash && username === ownerUsername && verifyPassword(password, ownerPasswordHash)) {
        return withSessionCookie({ role: "owner" }, { role: "owner" });
      }

      // إدارة معهد
      const { data: institute, error } = await supabaseAdmin
        .from("institutes")
        .select("id, name, logo_url, status, admin_password")
        .eq("admin_username", username)
        .maybeSingle();
      if (error) throw error;
      if (institute && verifyPassword(password, institute.admin_password)) {
        if (institute.status === "suspended") {
          return Response.json({ error: "suspended" }, { status: 403 });
        }
        return withSessionCookie(
          { role: "institute-admin", instituteId: institute.id, instituteName: institute.name, logoUrl: institute.logo_url },
          { role: "institute-admin", instituteId: institute.id }
        );
      }

      return Response.json({ error: "invalid" }, { status: 401 });
    }

    if (role === "student") {
      const { data: student, error } = await supabaseAdmin
        .from("students")
        .select("id, institute_id, password")
        .eq("username", username)
        .maybeSingle();
      if (error) throw error;
      if (student && verifyPassword(password, student.password)) {
        return withSessionCookie(
          { role: "student", studentId: student.id, instituteId: student.institute_id },
          { role: "student", studentId: student.id, instituteId: student.institute_id }
        );
      }
      return Response.json({ error: "invalid" }, { status: 401 });
    }

    return Response.json({ error: "invalid role" }, { status: 400 });
  } catch (e) {
    console.error("login error:", e);
    return Response.json({ error: (e && e.message) || "login failed" }, { status: 500 });
  }
}
