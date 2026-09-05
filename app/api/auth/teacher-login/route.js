import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";
import { createSessionToken } from "../../../../lib/session";

export async function POST(request) {
  try {
    const { code } = await request.json();
    if (!code) return Response.json({ error: "missing code" }, { status: 400 });

    const db = getSupabaseAdmin();
    const { data: teacher, error } = await db
      .from("teachers")
      .select("id, name, subject_id, institute_id")
      .eq("access_code", code.trim())
      .maybeSingle();
    if (error) throw error;
    if (!teacher) return Response.json({ error: "invalid" }, { status: 401 });

    const token = createSessionToken({ role: "teacher", teacherId: teacher.id, instituteId: teacher.institute_id });
    const res = Response.json({ id: teacher.id, name: teacher.name, subjectId: teacher.subject_id, instituteId: teacher.institute_id });
    res.headers.append(
      "Set-Cookie",
      `masar_session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${60 * 60 * 24 * 30}`
    );
    return res;
  } catch (e) {
    
    console.error("teacher-login error:", e);
    return Response.json({ error: (e && e.message) || "login failed" }, { status: 500 });
  }
}
