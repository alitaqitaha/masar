import { cookies } from "next/headers";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";
import { verifySessionToken } from "../../../../lib/session";

export const dynamic = "force-dynamic";

function mapMcqExam(e) {
  return {
    id: e.id,
    subjectId: e.subject_id,
    teacherId: e.teacher_id,
    groupId: e.group_id,
    title: e.title,
    timeLimitMinutes: e.time_limit_minutes,
    createdAt: e.created_at,
    questionCount: (e.mcq_questions || []).length,
  };
}
function mapPhotoExam(e) {
  return {
    id: e.id,
    subjectId: e.subject_id,
    teacherId: e.teacher_id,
    groupId: e.group_id,
    title: e.title,
    timeLimitMinutes: e.time_limit_minutes,
    examImageUrl: e.exam_image_url,
    createdAt: e.created_at,
  };
}

export async function POST(request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("masar_session")?.value;
    const session = verifySessionToken(token);
    if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });

    const { action, payload } = await request.json();
    const db = getSupabaseAdmin();

    switch (action) {
      case "fetchGroupsForTeacher": {
        if (session.role !== "teacher") return Response.json({ error: "forbidden" }, { status: 403 });
        const { data, error } = await db.from("groups").select("id, name").eq("teacher_id", session.teacherId).order("name");
        if (error) throw error;
        return Response.json(data);
      }

      case "fetchMcqExams": {
        if (session.role !== "teacher" && session.role !== "student") return Response.json({ error: "forbidden" }, { status: 403 });
        const { data, error } = await db
          .from("mcq_exams")
          .select("id, subject_id, teacher_id, group_id, title, time_limit_minutes, created_at, mcq_questions(id)")
          .eq("institute_id", session.instituteId)
          .order("created_at", { ascending: false });
        if (error) throw error;
        return Response.json(data.map(mapMcqExam));
      }

      case "fetchPhotoExams": {
        if (session.role !== "teacher" && session.role !== "student") return Response.json({ error: "forbidden" }, { status: 403 });
        const { data, error } = await db
          .from("photo_exams")
          .select("id, subject_id, teacher_id, group_id, title, time_limit_minutes, exam_image_url, created_at")
          .eq("institute_id", session.instituteId)
          .order("created_at", { ascending: false });
        if (error) throw error;
        return Response.json(data.map(mapPhotoExam));
      }

      case "fetchMcqSubmissions": {
        if (session.role !== "teacher") return Response.json({ error: "forbidden" }, { status: 403 });
        const { examId } = payload;
        const { data: exam } = await db.from("mcq_exams").select("teacher_id").eq("id", examId).single();
        if (!exam || exam.teacher_id !== session.teacherId) return Response.json({ error: "forbidden" }, { status: 403 });
        const { data, error } = await db.from("mcq_submissions").select("id, student_id, score, total, submitted_at, students(name)").eq("exam_id", examId).order("submitted_at");
        if (error) throw error;
        return Response.json(data.map((s) => ({ id: s.id, studentId: s.student_id, studentName: s.students?.name || "طالب", score: s.score, total: s.total, submittedAt: s.submitted_at })));
      }

      case "fetchPhotoExamSubmissions": {
        if (session.role !== "teacher") return Response.json({ error: "forbidden" }, { status: 403 });
        const { photoExamId } = payload;
        const { data: exam } = await db.from("photo_exams").select("teacher_id").eq("id", photoExamId).single();
        if (!exam || exam.teacher_id !== session.teacherId) return Response.json({ error: "forbidden" }, { status: 403 });
        const { data, error } = await db
          .from("photo_exam_submissions")
          .select("id, student_id, answer_image_url, corrected_image_url, submitted_at, corrected_at, students(name)")
          .eq("photo_exam_id", photoExamId)
          .order("submitted_at");
        if (error) throw error;
        return Response.json(
          data.map((s) => ({ id: s.id, studentId: s.student_id, studentName: s.students?.name || "طالب", answerImageUrl: s.answer_image_url, correctedImageUrl: s.corrected_image_url, submittedAt: s.submitted_at, correctedAt: s.corrected_at }))
        );
      }

      case "fetchTeacherConversations": {
        if (session.role !== "teacher") return Response.json({ error: "forbidden" }, { status: 403 });
        const { data, error } = await db
          .from("teacher_messages")
          .select("student_id, sender, message, created_at, students(name)")
          .eq("institute_id", session.instituteId)
          .eq("teacher_id", session.teacherId)
          .order("created_at", { ascending: false });
        if (error) throw error;
        const byStudent = new Map();
        for (const m of data) {
          if (!byStudent.has(m.student_id)) {
            byStudent.set(m.student_id, { studentId: m.student_id, studentName: m.students?.name || "طالب", lastMessage: m.message, lastSender: m.sender, lastAt: m.created_at });
          }
        }
        return Response.json(Array.from(byStudent.values()));
      }

      case "fetchConversation": {
        let teacherId, studentId;
        if (session.role === "teacher") {
          teacherId = session.teacherId;
          studentId = payload.studentId;
        } else if (session.role === "student") {
          teacherId = payload.teacherId;
          studentId = session.studentId;
        } else {
          return Response.json({ error: "forbidden" }, { status: 403 });
        }
        const { data, error } = await db.from("teacher_messages").select("id, sender, message, created_at").eq("teacher_id", teacherId).eq("student_id", studentId).order("created_at", { ascending: true });
        if (error) throw error;
        return Response.json(data.map((m) => ({ id: m.id, sender: m.sender, message: m.message, createdAt: m.created_at })));
      }

      case "fetchMcqExamForStudent": {
        if (session.role !== "student") return Response.json({ error: "forbidden" }, { status: 403 });
        const { examId } = payload;
        const studentId = session.studentId;
        const [examRes, questionsRes, submissionRes] = await Promise.all([
          db.from("mcq_exams").select("id, title, time_limit_minutes, subject_id").eq("id", examId).single(),
          db.from("mcq_questions").select("id, question_text, options, correct_index, order_index").eq("exam_id", examId).order("order_index"),
          db.from("mcq_submissions").select("id, answers, score, total, submitted_at").eq("exam_id", examId).eq("student_id", studentId).maybeSingle(),
        ]);
        if (examRes.error) throw examRes.error;
        if (questionsRes.error) throw questionsRes.error;
        const hasSubmission = Boolean(submissionRes.data);
        const breakdown = hasSubmission
          ? questionsRes.data.map((q) => ({
              questionId: q.id,
              text: q.question_text,
              options: q.options,
              selectedIndex: submissionRes.data.answers?.[q.id] ?? null,
              correctIndex: q.correct_index,
              isCorrect: submissionRes.data.answers?.[q.id] === q.correct_index,
            }))
          : null;
        return Response.json({
          id: examRes.data.id,
          title: examRes.data.title,
          timeLimitMinutes: examRes.data.time_limit_minutes,
          subjectId: examRes.data.subject_id,
          questions: questionsRes.data.map((q) => ({ id: q.id, text: q.question_text, options: q.options })),
          submission: hasSubmission ? { score: submissionRes.data.score, total: submissionRes.data.total, submittedAt: submissionRes.data.submitted_at, breakdown } : null,
        });
      }

      case "fetchPhotoExamSubmissionForStudent": {
        if (session.role !== "student") return Response.json({ error: "forbidden" }, { status: 403 });
        const { photoExamId } = payload;
        const { data, error } = await db
          .from("photo_exam_submissions")
          .select("id, answer_image_url, corrected_image_url, submitted_at, corrected_at")
          .eq("photo_exam_id", photoExamId)
          .eq("student_id", session.studentId)
          .maybeSingle();
        if (error) throw error;
        return Response.json(
          data ? { id: data.id, answerImageUrl: data.answer_image_url, correctedImageUrl: data.corrected_image_url, submittedAt: data.submitted_at, correctedAt: data.corrected_at } : null
        );
      }

      case "fetchInstitutes": {
        if (session.role !== "owner") return Response.json({ error: "forbidden" }, { status: 403 });
        const { data, error } = await db.from("institutes").select("id, name, logo_url, admin_username, status, created_at").order("created_at");
        if (error) throw error;
        const withCounts = await Promise.all(
          data.map(async (i) => {
            const [studentsRes, teachersRes] = await Promise.all([
              db.from("students").select("id", { count: "exact", head: true }).eq("institute_id", i.id),
              db.from("teachers").select("id", { count: "exact", head: true }).eq("institute_id", i.id),
            ]);
            return {
              id: i.id,
              name: i.name,
              logoUrl: i.logo_url,
              adminUsername: i.admin_username,
              status: i.status || "active",
              createdAt: i.created_at,
              studentCount: studentsRes.count || 0,
              teacherCount: teachersRes.count || 0,
            };
          })
        );
        return Response.json(withCounts);
      }

      default:
        return Response.json({ error: "unknown action" }, { status: 400 });
    }
  } catch (e) {
    console.error("secure-read error:", e);
    return Response.json({ error: (e && e.message) || "read failed" }, { status: 500 });
  }
}
