import { cookies } from "next/headers";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";
import { verifySessionToken } from "../../../../lib/session";

export const dynamic = "force-dynamic";

const SUBJECT_NAMES = {
  ar: "اللغة العربية",
  math: "الرياضيات",
  en: "اللغة الانكليزية",
  chem: "الكيمياء",
  phys: "الفيزياء",
  isl: "الإسلامية",
  bio: "الأحياء",
};

async function triggerPush(origin, target, body, title) {
  try {
    await fetch(`${origin}/api/send-push`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title || "مسار", body, target }),
    });
  } catch (e) {
    /* best-effort */
  }
}

export async function POST(request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("masar_session")?.value;
    const session = verifySessionToken(token);
    if (!session || session.role !== "teacher" || !session.teacherId || !session.instituteId) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }
    const teacherId = session.teacherId; // مصدر الثقة الوحيد — مدرس ما يقدر يتصرف باسم مدرس ثاني
    const instituteId = session.instituteId;
    const origin = new URL(request.url).origin;
    const db = getSupabaseAdmin();

    const { action, payload } = await request.json();

    switch (action) {
      case "sendMessageAsTeacher": {
        const { studentId, message } = payload;
        const { error } = await db.from("teacher_messages").insert({ institute_id: instituteId, teacher_id: teacherId, student_id: studentId, sender: "teacher", message });
        if (error) throw error;
        const { data: teacher } = await db.from("teachers").select("name").eq("id", teacherId).single();
        const notifMsg = `رد جديد من الأستاذ ${teacher?.name || ""}`;
        await db.from("notifications").insert({ message: notifMsg, target_type: "student", student_id: studentId, institute_id: instituteId });
        await triggerPush(origin, { type: "student", studentId }, notifMsg);
        return Response.json({ ok: true });
      }

      case "addMcqExam": {
        const { subjectId, groupId, title, timeLimitMinutes, questions } = payload;
        const { data: exam, error: eErr } = await db
          .from("mcq_exams")
          .insert({ institute_id: instituteId, subject_id: subjectId, teacher_id: teacherId, group_id: groupId, title, time_limit_minutes: timeLimitMinutes })
          .select()
          .single();
        if (eErr) throw eErr;

        const rows = questions.map((q, i) => ({ exam_id: exam.id, question_text: q.text, options: q.options, correct_index: q.correctIndex, order_index: i }));
        const { error: qErr } = await db.from("mcq_questions").insert(rows);
        if (qErr) throw qErr;

        const { data: enrolled } = await db.from("enrollments").select("student_id").eq("subject_id", subjectId).eq("teacher_id", teacherId).eq("group_id", groupId);
        const subjectName = SUBJECT_NAMES[subjectId] || subjectId;
        const message = `امتحان MCQ جديد متاح: ${title} (${subjectName})`;
        const notifRows = (enrolled || []).map((e) => ({ message, target_type: "student", student_id: e.student_id, institute_id: instituteId }));
        if (notifRows.length) {
          await db.from("notifications").insert(notifRows);
          await Promise.all((enrolled || []).map((e) => triggerPush(origin, { type: "student", studentId: e.student_id }, message)));
        }
        return Response.json({ id: exam.id });
      }

      case "deleteMcqExam": {
        const { examId } = payload;
        const { error } = await db.from("mcq_exams").delete().eq("id", examId).eq("teacher_id", teacherId);
        if (error) throw error;
        return Response.json({ ok: true });
      }

      case "addPhotoExam": {
        const { subjectId, groupId, title, timeLimitMinutes, examImageUrl } = payload;
        const { data: exam, error } = await db
          .from("photo_exams")
          .insert({ institute_id: instituteId, subject_id: subjectId, teacher_id: teacherId, group_id: groupId, title, time_limit_minutes: timeLimitMinutes || null, exam_image_url: examImageUrl })
          .select()
          .single();
        if (error) throw error;

        const { data: enrolled } = await db.from("enrollments").select("student_id").eq("subject_id", subjectId).eq("teacher_id", teacherId).eq("group_id", groupId);
        const subjectName = SUBJECT_NAMES[subjectId] || subjectId;
        const message = `امتحان جديد بالصورة متاح: ${title} (${subjectName})`;
        const notifRows = (enrolled || []).map((e) => ({ message, target_type: "student", student_id: e.student_id, institute_id: instituteId }));
        if (notifRows.length) {
          await db.from("notifications").insert(notifRows);
          await Promise.all((enrolled || []).map((e) => triggerPush(origin, { type: "student", studentId: e.student_id }, message)));
        }
        return Response.json({ id: exam.id });
      }

      case "deletePhotoExam": {
        const { photoExamId } = payload;
        const { error } = await db.from("photo_exams").delete().eq("id", photoExamId).eq("teacher_id", teacherId);
        if (error) throw error;
        return Response.json({ ok: true });
      }

      case "uploadCorrectedPhoto": {
        const { submissionId, studentId, correctedImageUrl } = payload;
        const { error } = await db.from("photo_exam_submissions").update({ corrected_image_url: correctedImageUrl, corrected_at: new Date().toISOString() }).eq("id", submissionId);
        if (error) throw error;
        const message = "تم تصحيح ورقة امتحانك — تقدر تشوفها الحين";
        await db.from("notifications").insert({ message, target_type: "student", student_id: studentId, institute_id: instituteId });
        await triggerPush(origin, { type: "student", studentId }, message);
        return Response.json({ ok: true });
      }

      case "savePushSubscription": {
        const { subscription } = payload;
        const row = { teacher_id: teacherId, endpoint: subscription.endpoint, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth };
        const { error } = await db.from("push_subscriptions").upsert(row, { onConflict: "endpoint" });
        if (error) throw error;
        return Response.json({ ok: true });
      }

      default:
        return Response.json({ error: "unknown action" }, { status: 400 });
    }
  } catch (e) {
    console.error("teacher-action error:", e);
    return Response.json({ error: (e && e.message) || "action failed" }, { status: 500 });
  }
}
