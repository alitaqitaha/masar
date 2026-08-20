import { supabase } from "./supabaseClient";

const SUBJECT_NAMES = {
  ar: "اللغة العربية",
  math: "الرياضيات",
  en: "اللغة الانكليزية",
  chem: "الكيمياء",
  phys: "الفيزياء",
  isl: "الإسلامية",
  bio: "الأحياء",
};

/* ---------- fetch + transform ---------- */
export async function fetchAll() {
  const [teachersRes, studentsRes, gradesRes, attendanceRes, installmentsRes, notificationsRes] = await Promise.all([
    supabase.from("teachers").select("*, groups(*)").order("created_at"),
    supabase.from("students").select("*, enrollments(*)").order("created_at"),
    supabase.from("grade_records").select("*, grade_results(*)").order("created_at"),
    supabase.from("attendance_records").select("*, attendance_entries(*)").order("created_at"),
    supabase.from("installments").select("*").order("created_at"),
    supabase.from("notifications").select("*").order("created_at"),
  ]);

  const firstError = [teachersRes, studentsRes, gradesRes, attendanceRes, installmentsRes, notificationsRes].find((r) => r.error);
  if (firstError) throw firstError.error;

  const teachers = teachersRes.data.map((t) => ({
    id: t.id,
    name: t.name,
    subjectId: t.subject_id,
    groups: (t.groups || []).map((g) => ({ id: g.id, name: g.name })),
  }));

  const students = studentsRes.data.map((s) => ({
    id: s.id,
    serial: s.serial,
    name: s.name,
    photo: s.photo_url,
    phone: s.phone,
    parentPhone: s.parent_phone,
    username: s.username,
    password: s.password,
    enrollments: Object.fromEntries(
      (s.enrollments || []).map((e) => [e.subject_id, { teacherId: e.teacher_id, groupId: e.group_id }])
    ),
  }));

  const gradeRecords = gradesRes.data.map((r) => ({
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
  }));

  const attendanceRecords = attendanceRes.data.map((r) => ({
    id: r.id,
    subjectId: r.subject_id,
    teacherId: r.teacher_id,
    groupId: r.group_id,
    date: r.attendance_date,
    createdAt: r.created_at,
    presentIds: (r.attendance_entries || []).filter((e) => e.present).map((e) => e.student_id),
    allGroupStudentIds: (r.attendance_entries || []).map((e) => e.student_id),
  }));

  const installments = installmentsRes.data.map((i) => ({
    id: i.id,
    studentId: i.student_id,
    amountNumber: i.amount_number,
    amountText: i.amount_text,
    remaining: i.remaining,
    accountant: i.accountant,
    note: i.note,
    date: i.paid_date,
  }));

  const notifications = notificationsRes.data.map((n) => {
    let target = { type: "all" };
    if (n.target_type === "student") target = { type: "student", studentId: n.student_id };
    if (n.target_type === "group") target = { type: "group", subjectId: n.subject_id, teacherId: n.teacher_id, groupId: n.group_id };
    return { id: n.id, text: n.message, date: (n.created_at || "").slice(0, 10), target };
  });

  return { teachers, students, gradeRecords, attendanceRecords, installments, notifications };
}

/* ---------- writes ---------- */
export async function addTeacher({ name, subjectId }) {
  const { data: teacher, error: tErr } = await supabase.from("teachers").insert({ name, subject_id: subjectId }).select().single();
  if (tErr) throw tErr;
  const { error: gErr } = await supabase.from("groups").insert({ teacher_id: teacher.id, name: "M1" });
  if (gErr) throw gErr;
}

export async function addGroup(teacherId, nextName) {
  const { error } = await supabase.from("groups").insert({ teacher_id: teacherId, name: nextName });
  if (error) throw error;
}

export async function updateTeacherName(teacherId, name) {
  const { error } = await supabase.from("teachers").update({ name }).eq("id", teacherId);
  if (error) throw error;
}

export async function deleteTeacher(teacherId) {
  const { error } = await supabase.from("teachers").delete().eq("id", teacherId);
  if (error) throw error;
}

export async function addStudent({ name, phone, parentPhone, photo, username, password, enrollments }, serial) {
  const { data: student, error: sErr } = await supabase
    .from("students")
    .insert({ serial, name, phone, parent_phone: parentPhone, photo_url: photo, username, password })
    .select()
    .single();
  if (sErr) throw sErr;

  const rows = Object.entries(enrollments).map(([subjectId, v]) => ({
    student_id: student.id,
    subject_id: subjectId,
    teacher_id: v.teacherId,
    group_id: v.groupId,
  }));
  if (rows.length) {
    const { error: eErr } = await supabase.from("enrollments").insert(rows);
    if (eErr) throw eErr;
  }
  return serial;
}

export async function addAttendanceRecord({ subjectId, teacherId, groupId, presentIds, allGroupStudentIds }) {
  const { data: record, error: rErr } = await supabase
    .from("attendance_records")
    .insert({ subject_id: subjectId, teacher_id: teacherId, group_id: groupId, attendance_date: new Date().toISOString().slice(0, 10) })
    .select()
    .single();
  if (rErr) throw rErr;

  const entries = allGroupStudentIds.map((studentId) => ({
    attendance_record_id: record.id,
    student_id: studentId,
    present: presentIds.includes(studentId),
  }));
  const { error: eErr } = await supabase.from("attendance_entries").insert(entries);
  if (eErr) throw eErr;

  const notifs = allGroupStudentIds.map((studentId) => ({
    message: presentIds.includes(studentId) ? "تم تسجيلك حاضراً اليوم" : "تم تسجيلك غائباً اليوم",
    target_type: "student",
    student_id: studentId,
  }));
  const { error: nErr } = await supabase.from("notifications").insert(notifs);
  if (nErr) throw nErr;
}

export async function addGradeRecord({ subjectId, teacherId, groupId, examName, examType, date, passScore, fullScore, results }) {
  const { data: record, error: rErr } = await supabase
    .from("grade_records")
    .insert({
      subject_id: subjectId,
      teacher_id: teacherId,
      group_id: groupId,
      exam_name: examName,
      exam_type: examType,
      exam_date: date,
      pass_score: passScore || null,
      full_score: fullScore || null,
    })
    .select()
    .single();
  if (rErr) throw rErr;

  const rows = Object.entries(results)
    .filter(([, v]) => v && v.status)
    .map(([studentId, v]) => ({
      grade_record_id: record.id,
      student_id: studentId,
      status: v.status,
      score: v.score || null,
    }));
  if (rows.length) {
    const { error: gErr } = await supabase.from("grade_results").insert(rows);
    if (gErr) throw gErr;
  }

  const subjectName = SUBJECT_NAMES[subjectId] || subjectId;
  const notifRows = Object.entries(results)
    .filter(([, v]) => v && v.status)
    .map(([studentId, v]) => {
      const message =
        v.status === "طبيعي"
          ? `تم تسجيل درجتك بامتحان ${examName} (${examType}) في مادة ${subjectName}: ${v.score || 0}${fullScore ? `/${fullScore}` : ""}`
          : `تم تسجيل حالتك بامتحان ${examName} في مادة ${subjectName}: ${v.status}`;
      return { message, target_type: "student", student_id: studentId };
    });
  if (notifRows.length) {
    const { error: nErr } = await supabase.from("notifications").insert(notifRows);
    if (nErr) throw nErr;
  }
}

export async function addInstallment({ studentId, amountNumber, amountText, remaining, note, accountant }) {
  const { error } = await supabase.from("installments").insert({
    student_id: studentId,
    amount_number: amountNumber,
    amount_text: amountText,
    remaining,
    accountant,
    note,
  });
  if (error) throw error;
}

export async function deleteInstallment(installmentId) {
  const { error } = await supabase.from("installments").delete().eq("id", installmentId);
  if (error) throw error;
}

export async function addNotification({ text, target }) {
  const row = { message: text, target_type: target.type };
  if (target.type === "student") row.student_id = target.studentId;
  if (target.type === "group") {
    row.subject_id = target.subjectId;
    row.teacher_id = target.teacherId;
    row.group_id = target.groupId;
  }
  const { error } = await supabase.from("notifications").insert(row);
  if (error) throw error;
}

export async function updateEnrollment(studentId, subjectId, teacherId, groupId) {
  if (teacherId && groupId) {
    const { error } = await supabase
      .from("enrollments")
      .upsert({ student_id: studentId, subject_id: subjectId, teacher_id: teacherId, group_id: groupId }, { onConflict: "student_id,subject_id" });
    if (error) throw error;
  } else {
    const { error } = await supabase.from("enrollments").delete().eq("student_id", studentId).eq("subject_id", subjectId);
    if (error) throw error;
  }
}

export async function deleteStudent(studentId) {
  const { error } = await supabase.from("students").delete().eq("id", studentId);
  if (error) throw error;
}

export async function updateStudentInfo(studentId, { name, phone, parentPhone, photo }) {
  const { error } = await supabase
    .from("students")
    .update({ name, phone, parent_phone: parentPhone, photo_url: photo })
    .eq("id", studentId);
  if (error) throw error;
}

export async function updateGradeResult(gradeRecordId, studentId, { status, score }) {
  const { error } = await supabase
    .from("grade_results")
    .upsert({ grade_record_id: gradeRecordId, student_id: studentId, status, score: score || null }, { onConflict: "grade_record_id,student_id" });
  if (error) throw error;
}

export async function updateAttendanceEntry(attendanceRecordId, studentId, present) {
  const { error } = await supabase
    .from("attendance_entries")
    .upsert({ attendance_record_id: attendanceRecordId, student_id: studentId, present }, { onConflict: "attendance_record_id,student_id" });
  if (error) throw error;
}
