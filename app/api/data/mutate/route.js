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

function generateAccessCode() {
  return Math.random().toString(36).slice(2, 10);
}

async function triggerPush(origin, target, body, title) {
  try {
    await fetch(`${origin}/api/send-push`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title || "مسار", body, target }),
    });
  } catch (e) {
    /* best-effort — لا توقف العملية الأساسية لو فشل الإشعار */
  }
}

export async function POST(request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("masar_session")?.value;
    const session = verifySessionToken(token);
    if (!session || session.role !== "institute-admin" || !session.instituteId) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }
    const instituteId = session.instituteId; // مصدر الثقة الوحيد — يتجاهل أي instituteId يرسله الطلب
    const origin = new URL(request.url).origin;

    const { action, payload } = await request.json();
    const db = getSupabaseAdmin();

    switch (action) {
      case "addTeacher": {
        const { name, subjectId } = payload;
        const { data: teacher, error: tErr } = await db
          .from("teachers")
          .insert({ name, subject_id: subjectId, institute_id: instituteId, access_code: generateAccessCode() })
          .select()
          .single();
        if (tErr) throw tErr;
        const { error: gErr } = await db.from("groups").insert({ teacher_id: teacher.id, name: "M1", institute_id: instituteId });
        if (gErr) throw gErr;
        return Response.json({ ok: true });
      }

      case "updateTeacherName": {
        const { teacherId, name } = payload;
        const { error } = await db.from("teachers").update({ name }).eq("id", teacherId).eq("institute_id", instituteId);
        if (error) throw error;
        return Response.json({ ok: true });
      }

      case "deleteTeacher": {
        const { teacherId } = payload;
        const { error } = await db.from("teachers").delete().eq("id", teacherId).eq("institute_id", instituteId);
        if (error) throw error;
        return Response.json({ ok: true });
      }

      case "addGroup": {
        const { teacherId, nextName } = payload;
        const { error } = await db.from("groups").insert({ teacher_id: teacherId, name: nextName, institute_id: instituteId });
        if (error) throw error;
        return Response.json({ ok: true });
      }

      case "updateEnrollment": {
        const { studentId, subjectId, teacherId, groupId } = payload;
        if (teacherId && groupId) {
          const { error } = await db
            .from("enrollments")
            .upsert({ student_id: studentId, subject_id: subjectId, teacher_id: teacherId, group_id: groupId, institute_id: instituteId }, { onConflict: "student_id,subject_id" });
          if (error) throw error;
        } else {
          const { error } = await db.from("enrollments").delete().eq("student_id", studentId).eq("subject_id", subjectId).eq("institute_id", instituteId);
          if (error) throw error;
        }
        return Response.json({ ok: true });
      }

      case "updateStudentInfo": {
        const { studentId, name, phone, parentPhone, photo } = payload;
        const { error } = await db
          .from("students")
          .update({ name, phone, parent_phone: parentPhone, photo_url: photo })
          .eq("id", studentId)
          .eq("institute_id", instituteId);
        if (error) throw error;
        return Response.json({ ok: true });
      }

      case "deleteStudent": {
        const { studentId } = payload;
        const { error } = await db.from("students").delete().eq("id", studentId).eq("institute_id", instituteId);
        if (error) throw error;
        return Response.json({ ok: true });
      }

      case "addAttendanceRecord": {
        const { subjectId, teacherId, groupId, presentIds, allGroupStudentIds } = payload;
        const { data: record, error: rErr } = await db
          .from("attendance_records")
          .insert({ subject_id: subjectId, teacher_id: teacherId, group_id: groupId, attendance_date: new Date().toISOString().slice(0, 10), institute_id: instituteId })
          .select()
          .single();
        if (rErr) throw rErr;

        const entries = allGroupStudentIds.map((studentId) => ({
          attendance_record_id: record.id,
          student_id: studentId,
          present: presentIds.includes(studentId),
          institute_id: instituteId,
        }));
        const { error: eErr } = await db.from("attendance_entries").insert(entries);
        if (eErr) throw eErr;

        const subjectName = SUBJECT_NAMES[subjectId] || subjectId;
        const notifs = allGroupStudentIds.map((studentId) => ({
          message: presentIds.includes(studentId) ? `تم تسجيلك حاضراً اليوم بمادة ${subjectName}` : `تم تسجيلك غائباً اليوم بمادة ${subjectName}`,
          target_type: "student",
          student_id: studentId,
          institute_id: instituteId,
        }));
        const { error: nErr } = await db.from("notifications").insert(notifs);
        if (nErr) throw nErr;

        await Promise.all(
          allGroupStudentIds.map((studentId) =>
            triggerPush(origin, { type: "student", studentId }, presentIds.includes(studentId) ? `تم تسجيلك حاضراً اليوم بمادة ${subjectName}` : `تم تسجيلك غائباً اليوم بمادة ${subjectName}`)
          )
        );
        return Response.json({ ok: true });
      }

      case "updateAttendanceEntry": {
        const { attendanceRecordId, studentId, present } = payload;
        const { error } = await db
          .from("attendance_entries")
          .upsert({ attendance_record_id: attendanceRecordId, student_id: studentId, present, institute_id: instituteId }, { onConflict: "attendance_record_id,student_id" });
        if (error) throw error;

        const { data: record } = await db.from("attendance_records").select("subject_id").eq("id", attendanceRecordId).single();
        const subjectName = record ? SUBJECT_NAMES[record.subject_id] || record.subject_id : "";
        const message = present ? `تم تحديث حالتك إلى حاضر${subjectName ? ` بمادة ${subjectName}` : ""}` : `تم تحديث حالتك إلى غائب${subjectName ? ` بمادة ${subjectName}` : ""}`;
        const { error: nErr } = await db.from("notifications").insert({ message, target_type: "student", student_id: studentId, institute_id: instituteId });
        if (!nErr) await triggerPush(origin, { type: "student", studentId }, message);
        return Response.json({ ok: true });
      }

      case "addGradeRecord": {
        const { subjectId, teacherId, groupId, examName, examType, date, passScore, fullScore, results } = payload;
        const { data: record, error: rErr } = await db
          .from("grade_records")
          .insert({ subject_id: subjectId, teacher_id: teacherId, group_id: groupId, exam_name: examName, exam_type: examType, exam_date: date, pass_score: passScore || null, full_score: fullScore || null, institute_id: instituteId })
          .select()
          .single();
        if (rErr) throw rErr;

        const rows = Object.entries(results)
          .filter(([, v]) => v && v.status)
          .map(([studentId, v]) => ({ grade_record_id: record.id, student_id: studentId, status: v.status, score: v.score || null, institute_id: instituteId }));
        if (rows.length) {
          const { error: gErr } = await db.from("grade_results").insert(rows);
          if (gErr) throw gErr;
        }

        const subjectName = SUBJECT_NAMES[subjectId] || subjectId;
        const entries = Object.entries(results).filter(([, v]) => v && v.status);
        const notifRows = entries.map(([studentId, v]) => ({
          message: v.status === "طبيعي" ? `تم تسجيل درجتك بامتحان ${examName} (${examType}) في مادة ${subjectName}: ${v.score || 0}${fullScore ? `/${fullScore}` : ""}` : `تم تسجيل حالتك بامتحان ${examName} في مادة ${subjectName}: ${v.status}`,
          target_type: "student",
          student_id: studentId,
          institute_id: instituteId,
        }));
        if (notifRows.length) {
          const { error: nErr } = await db.from("notifications").insert(notifRows);
          if (nErr) throw nErr;
        }
        await Promise.all(
          entries.map(([studentId, v]) =>
            triggerPush(
              origin,
              { type: "student", studentId },
              v.status === "طبيعي" ? `تم تسجيل درجتك بامتحان ${examName} (${examType}) في مادة ${subjectName}: ${v.score || 0}${fullScore ? `/${fullScore}` : ""}` : `تم تسجيل حالتك بامتحان ${examName} في مادة ${subjectName}: ${v.status}`
            )
          )
        );
        return Response.json({ ok: true });
      }

      case "updateGradeResult": {
        const { gradeRecordId, studentId, status, score } = payload;
        const { error } = await db
          .from("grade_results")
          .upsert({ grade_record_id: gradeRecordId, student_id: studentId, status, score: score || null, institute_id: instituteId }, { onConflict: "grade_record_id,student_id" });
        if (error) throw error;

        const { data: record } = await db.from("grade_records").select("exam_name, exam_type, subject_id, full_score").eq("id", gradeRecordId).single();
        if (record) {
          const subjectName = SUBJECT_NAMES[record.subject_id] || record.subject_id;
          const message = status === "طبيعي" ? `تم تحديث درجتك بامتحان ${record.exam_name} (${record.exam_type}) في مادة ${subjectName}: ${score || 0}${record.full_score ? `/${record.full_score}` : ""}` : `تم تحديث حالتك بامتحان ${record.exam_name} في مادة ${subjectName}: ${status}`;
          const { error: nErr } = await db.from("notifications").insert({ message, target_type: "student", student_id: studentId, institute_id: instituteId });
          if (!nErr) await triggerPush(origin, { type: "student", studentId }, message);
        }
        return Response.json({ ok: true });
      }

      case "addInstallment": {
        const { studentId, amountNumber, remaining, note, accountant } = payload;
        const { error } = await db.from("installments").insert({ student_id: studentId, amount_number: amountNumber, remaining, accountant, note, institute_id: instituteId });
        if (error) throw error;
        return Response.json({ ok: true });
      }

      case "deleteInstallment": {
        const { installmentId } = payload;
        const { error } = await db.from("installments").delete().eq("id", installmentId).eq("institute_id", instituteId);
        if (error) throw error;
        return Response.json({ ok: true });
      }

      case "addNotification": {
        const { text, target } = payload;
        const row = { message: text, target_type: target.type, institute_id: instituteId };
        if (target.type === "student") row.student_id = target.studentId;
        if (target.type === "group") {
          row.subject_id = target.subjectId;
          row.teacher_id = target.teacherId;
          row.group_id = target.groupId;
        }
        const { error } = await db.from("notifications").insert(row);
        if (error) throw error;
        await triggerPush(origin, target, text);
        return Response.json({ ok: true });
      }

      case "toggleInstituteStatus": {
        // فقط المالك يقدر يسوي هذا — إدارة المعهد ما تقدر توقف نفسها
        return Response.json({ error: "forbidden" }, { status: 403 });
      }

      default:
        return Response.json({ error: "unknown action" }, { status: 400 });
    }
  } catch (e) {
    console.error("mutate error:", e);
    return Response.json({ error: (e && e.message) || "mutation failed" }, { status: 500 });
  }
}
