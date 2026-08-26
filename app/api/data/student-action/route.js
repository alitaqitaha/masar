import { cookies } from "next/headers";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";
import { verifySessionToken } from "../../../../lib/session";

export const dynamic = "force-dynamic";

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
    if (!session || session.role !== "student" || !session.studentId || !session.instituteId) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }
    const studentId = session.studentId; // مصدر الثقة الوحيد — طالب ما يقدر يتصرف باسم طالب ثاني
    const instituteId = session.instituteId;
    const origin = new URL(request.url).origin;

    const { action, payload } = await request.json();
    const db = getSupabaseAdmin();

    switch (action) {
      case "sendMessageAsStudent": {
        const { teacherId, message } = payload;
        const { error } = await db.from("teacher_messages").insert({ institute_id: instituteId, teacher_id: teacherId, student_id: studentId, sender: "student", message });
        if (error) throw error;
        await triggerPush(origin, { type: "teacher", teacherId }, `سؤال جديد من طالب: ${message.slice(0, 80)}`);
        return Response.json({ ok: true });
      }

      case "submitMcqAnswers": {
        const { examId, answers } = payload;
        const { data: existing } = await db.from("mcq_submissions").select("id").eq("exam_id", examId).eq("student_id", studentId).maybeSingle();
        if (existing) return Response.json({ error: "already_submitted" }, { status: 409 });

        const { data: questions, error: qErr } = await db.from("mcq_questions").select("id, question_text, options, correct_index").eq("exam_id", examId).order("order_index");
        if (qErr) throw qErr;

        let score = 0;
        const breakdown = questions.map((q) => {
          const isCorrect = answers[q.id] === q.correct_index;
          if (isCorrect) score += 1;
          return { questionId: q.id, text: q.question_text, options: q.options, selectedIndex: answers[q.id] ?? null, correctIndex: q.correct_index, isCorrect };
        });
        const total = questions.length;

        const { error: sErr } = await db.from("mcq_submissions").insert({ exam_id: examId, student_id: studentId, institute_id: instituteId, answers, score, total, submitted_at: new Date().toISOString() });
        if (sErr) throw sErr;

        const { data: exam } = await db.from("mcq_exams").select("title").eq("id", examId).single();
        const message = `نتيجتك بامتحان ${exam?.title || ""}: ${score}/${total}`;
        await db.from("notifications").insert({ message, target_type: "student", student_id: studentId, institute_id: instituteId });
        await triggerPush(origin, { type: "student", studentId }, message);

        return Response.json({ score, total, breakdown });
      }

      case "submitPhotoAnswer": {
        const { photoExamId, answerImageUrl } = payload;
        const { error } = await db
          .from("photo_exam_submissions")
          .upsert({ photo_exam_id: photoExamId, student_id: studentId, institute_id: instituteId, answer_image_url: answerImageUrl, submitted_at: new Date().toISOString() }, { onConflict: "photo_exam_id,student_id" });
        if (error) throw error;
        return Response.json({ ok: true });
      }

      case "savePushSubscription": {
        const { subscription } = payload;
        const row = { student_id: studentId, endpoint: subscription.endpoint, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth };
        const { error } = await db.from("push_subscriptions").upsert(row, { onConflict: "endpoint" });
        if (error) throw error;
        return Response.json({ ok: true });
      }

      default:
        return Response.json({ error: "unknown action" }, { status: 400 });
    }
  } catch (e) {
    console.error("student-action error:", e);
    return Response.json({ error: (e && e.message) || "action failed" }, { status: 500 });
  }
}
