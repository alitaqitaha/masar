import { cookies } from "next/headers";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";
import { verifySessionToken } from "../../../../lib/session";

// المسار يعتمد على الكوكيز (الجلسة) لكل طلب، فلازم يبقى ديناميكي دايماً
export const dynamic = "force-dynamic";

const TEACHERS_COLS = "id, name, subject_id, access_code, created_at, groups(id, name)";
const STUDENTS_COLS = "id, serial, name, photo_url, phone, parent_phone, username, created_at, enrollments(subject_id, teacher_id, group_id)";
const GRADES_COLS = "id, subject_id, teacher_id, group_id, exam_name, exam_type, exam_date, pass_score, full_score, created_at, grade_results(student_id, status, score)";
const ATTENDANCE_COLS = "id, subject_id, teacher_id, group_id, attendance_date, created_at, attendance_entries(student_id, present)";
const INSTALLMENTS_COLS = "id, student_id, amount_number, amount_text, remaining, accountant, note, paid_date";
const NOTIFICATIONS_COLS = "id, message, target_type, student_id, subject_id, teacher_id, group_id, created_at";

function mapTeacher(t) {
  return { id: t.id, name: t.name, subjectId: t.subject_id, accessCode: t.access_code, groups: (t.groups || []).map((g) => ({ id: g.id, name: g.name })) };
}
function mapStudent(s) {
  return {
    id: s.id,
    serial: s.serial,
    name: s.name,
    photo: s.photo_url,
    phone: s.phone,
    parentPhone: s.parent_phone,
    username: s.username,
    enrollments: Object.fromEntries((s.enrollments || []).map((e) => [e.subject_id, { teacherId: e.teacher_id, groupId: e.group_id }])),
  };
}
function mapGradeRecord(r) {
  return {
    id: r.id,
    subjectId: r.subject_id,
    teacherId: r.teacher_id,
    groupId: r.group_id,
    examName: r.exam_name,
    examType: r.exam_type,
    date: r.exam_date,
    passScore: r.pass_score,
    fullScore: r.full_score,
    createdAt: r.created_at,
    results: Object.fromEntries((r.grade_results || []).map((res) => [res.student_id, { status: res.status, score: res.score }])),
  };
}
function mapAttendanceRecord(r) {
  return {
    id: r.id,
    subjectId: r.subject_id,
    teacherId: r.teacher_id,
    groupId: r.group_id,
    date: r.attendance_date,
    createdAt: r.created_at,
    presentIds: (r.attendance_entries || []).filter((e) => e.present).map((e) => e.student_id),
    allGroupStudentIds: (r.attendance_entries || []).map((e) => e.student_id),
  };
}
function mapInstallment(i) {
  return { id: i.id, studentId: i.student_id, amountNumber: i.amount_number, amountText: i.amount_text, remaining: i.remaining, accountant: i.accountant, note: i.note, date: i.paid_date };
}
function mapNotification(n) {
  let target = { type: "all" };
  if (n.target_type === "student") target = { type: "student", studentId: n.student_id };
  if (n.target_type === "group") target = { type: "group", subjectId: n.subject_id, teacherId: n.teacher_id, groupId: n.group_id };
  return { id: n.id, text: n.message, date: (n.created_at || "").slice(0, 10), target };
}

export async function GET(request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("masar_session")?.value;
    const session = verifySessionToken(token);

    // فقط جلسة موقّعة وصالحة تقدر تطلب بيانات — والمعهد يُستخرج من الجلسة نفسها، مو من رابط أو طلب المتصفح
    if (!session || !session.instituteId || (session.role !== "institute-admin" && session.role !== "student")) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }
    const instituteId = session.instituteId;

    const { searchParams } = new URL(request.url);
    const partsParam = searchParams.get("parts");
    const parts = partsParam ? partsParam.split(",") : ["teachers", "students", "gradeRecords", "attendanceRecords", "installments", "notifications"];

    const supabaseAdmin = getSupabaseAdmin();
    const fetchers = {
      teachers: async () => {
        const { data, error } = await supabaseAdmin.from("teachers").select(TEACHERS_COLS).eq("institute_id", instituteId).order("created_at");
        if (error) throw error;
        return data.map(mapTeacher);
      },
      students: async () => {
        const { data, error } = await supabaseAdmin.from("students").select(STUDENTS_COLS).eq("institute_id", instituteId).order("created_at");
        if (error) throw error;
        return data.map(mapStudent);
      },
      gradeRecords: async () => {
        const { data, error } = await supabaseAdmin.from("grade_records").select(GRADES_COLS).eq("institute_id", instituteId).order("created_at");
        if (error) throw error;
        return data.map(mapGradeRecord);
      },
      attendanceRecords: async () => {
        const { data, error } = await supabaseAdmin.from("attendance_records").select(ATTENDANCE_COLS).eq("institute_id", instituteId).order("created_at");
        if (error) throw error;
        return data.map(mapAttendanceRecord);
      },
      installments: async () => {
        const { data, error } = await supabaseAdmin.from("installments").select(INSTALLMENTS_COLS).eq("institute_id", instituteId).order("created_at");
        if (error) throw error;
        return data.map(mapInstallment);
      },
      notifications: async () => {
        const { data, error } = await supabaseAdmin.from("notifications").select(NOTIFICATIONS_COLS).eq("institute_id", instituteId).order("created_at");
        if (error) throw error;
        return data.map(mapNotification);
      },
    };

    const entries = await Promise.all(parts.map(async (key) => [key, await fetchers[key]()]));
    return Response.json(Object.fromEntries(entries));
  } catch (e) {
    console.error("institute-data error:", e);
    return Response.json({ error: (e && e.message) || "fetch failed" }, { status: 500 });
  }
}
