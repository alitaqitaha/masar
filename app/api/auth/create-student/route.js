import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";
import { hashPassword } from "../../../../lib/passwordHash";

export async function POST(request) {
  try {
    const { instituteId, name, phone, parentPhone, photo, username, password, enrollments, serial } = await request.json();
    if (!instituteId || !name || !username || !password || !serial) {
      return Response.json({ error: "missing fields" }, { status: 400 });
    }
    const supabaseAdmin = getSupabaseAdmin();

    const { data: student, error: sErr } = await supabaseAdmin
      .from("students")
      .insert({
        serial,
        name,
        phone,
        parent_phone: parentPhone,
        photo_url: photo,
        username,
        password: hashPassword(password),
        institute_id: instituteId,
      })
      .select()
      .single();
    if (sErr) throw sErr;

    const rows = Object.entries(enrollments || {}).map(([subjectId, v]) => ({
      student_id: student.id,
      subject_id: subjectId,
      teacher_id: v.teacherId,
      group_id: v.groupId,
      institute_id: instituteId,
    }));
    if (rows.length) {
      const { error: eErr } = await supabaseAdmin.from("enrollments").insert(rows);
      if (eErr) throw eErr;
    }

    return Response.json({ ok: true, serial });
  } catch (e) {
    console.error("create-student error:", e);
    const msg = ((e && e.message) || "").toLowerCase();
    if (msg.includes("duplicate") || msg.includes("unique")) {
      if (msg.includes("username")) return Response.json({ error: "duplicate_username" }, { status: 409 });
      if (msg.includes("serial")) return Response.json({ error: "duplicate_serial" }, { status: 409 });
      return Response.json({ error: "duplicate" }, { status: 409 });
    }
    return Response.json({ error: (e && e.message) || "create-student failed" }, { status: 500 });
  }
}
