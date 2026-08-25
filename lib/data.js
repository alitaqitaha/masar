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

function triggerPush(target, body, title) {
  try {
    fetch("/api/send-push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title || "مسار", body, target }),
    })
      .then((r) => r.json())
      .then((data) => console.log("send-push result:", data))
      .catch((e) => console.error("send-push request failed:", e));
  } catch (e) {
    /* best-effort — never block the main save flow */
  }
}

/* ---------- institutes (multi-tenant) ---------- */

// المالك — حساب واحد ثابت يشوف كل المعاهد (مو محفوظ بقاعدة البيانات، نفس نمط الأمان الحالي بالمشروع)
// دخول المالك والإدارة صار يصير كامل بمسار API سري (server-side) — راجع loginUnified بالأسفل

export async function fetchInstitutes() {
  const { data, error } = await supabase.from("institutes").select("id, name, logo_url, admin_username, status, created_at").order("created_at");
  if (error) throw error;

  const withCounts = await Promise.all(
    data.map(async (i) => {
      const [studentsRes, teachersRes] = await Promise.all([
        supabase.from("students").select("id", { count: "exact", head: true }).eq("institute_id", i.id),
        supabase.from("teachers").select("id", { count: "exact", head: true }).eq("institute_id", i.id),
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
  return withCounts;
}

export async function addInstitute({ name, adminUsername, adminPassword }) {
  const res = await fetch("/api/auth/create-institute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, adminUsername, adminPassword }),
  });
  const json = await res.json();
  if (!res.ok) {
    const err = new Error(json.error === "duplicate" ? "duplicate" : json.error || "create-institute failed");
    throw err;
  }
}

export async function toggleInstituteStatus(instituteId, newStatus) {
  const { error } = await supabase.from("institutes").update({ status: newStatus }).eq("id", instituteId);
  if (error) throw error;
}

export async function deleteInstitute(instituteId) {
  const { error } = await supabase.from("institutes").delete().eq("id", instituteId);
  if (error) throw error;
}

/* ---------- تسجيل الدخول (server-side — كلمات المرور مشفّرة وما تنقارن أبداً بالمتصفح) ---------- */
export async function loginUnified(role, username, password) {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role, username, password }),
  });
  const json = await res.json();
  if (!res.ok) {
    if (json.error === "suspended") {
      const err = new Error("SUSPENDED");
      err.suspended = true;
      throw err;
    }
    return null; // بيانات دخول غلط — يرجع null بدل ما يرمي خطأ
  }
  return json;
}

/* ---------- fetch + transform (كل شي يصير مفلتر حسب المعهد) ---------- */
function mapTeacher(t) {
  return {
    id: t.id,
    name: t.name,
    subjectId: t.subject_id,
    accessCode: t.access_code,
    groups: (t.groups || []).map((g) => ({ id: g.id, name: g.name })),
  };
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
    enrollments: Object.fromEntries(
      (s.enrollments || []).map((e) => [e.subject_id, { teacherId: e.teacher_id, groupId: e.group_id }])
    ),
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
  return {
    id: i.id,
    studentId: i.student_id,
    amountNumber: i.amount_number,
    amountText: i.amount_text,
    remaining: i.remaining,
    accountant: i.accountant,
    note: i.note,
    date: i.paid_date,
  };
}
function mapNotification(n) {
  let target = { type: "all" };
  if (n.target_type === "student") target = { type: "student", studentId: n.student_id };
  if (n.target_type === "group") target = { type: "group", subjectId: n.subject_id, teacherId: n.teacher_id, groupId: n.group_id };
  return { id: n.id, text: n.message, date: (n.created_at || "").slice(0, 10), target };
}

const TEACHERS_COLS = "id, name, subject_id, access_code, created_at, groups(id, name)";
const STUDENTS_COLS = "id, serial, name, photo_url, phone, parent_phone, username, created_at, enrollments(subject_id, teacher_id, group_id)";
const GRADES_COLS = "id, subject_id, teacher_id, group_id, exam_name, exam_type, exam_date, pass_score, full_score, created_at, grade_results(student_id, status, score)";
const ATTENDANCE_COLS = "id, subject_id, teacher_id, group_id, attendance_date, created_at, attendance_entries(student_id, present)";
const INSTALLMENTS_COLS = "id, student_id, amount_number, amount_text, remaining, accountant, note, paid_date";
const NOTIFICATIONS_COLS = "id, message, target_type, student_id, subject_id, teacher_id, group_id, created_at";

export async function fetchTeachers(instituteId) {
  const { data, error } = await supabase.from("teachers").select(TEACHERS_COLS).eq("institute_id", instituteId).order("created_at");
  if (error) throw error;
  return data.map(mapTeacher);
}
export async function fetchStudents(instituteId) {
  const { data, error } = await supabase.from("students").select(STUDENTS_COLS).eq("institute_id", instituteId).order("created_at");
  if (error) throw error;
  return data.map(mapStudent);
}
export async function fetchGradeRecords(instituteId) {
  const { data, error } = await supabase.from("grade_records").select(GRADES_COLS).eq("institute_id", instituteId).order("created_at");
  if (error) throw error;
  return data.map(mapGradeRecord);
}
export async function fetchAttendanceRecords(instituteId) {
  const { data, error } = await supabase.from("attendance_records").select(ATTENDANCE_COLS).eq("institute_id", instituteId).order("created_at");
  if (error) throw error;
  return data.map(mapAttendanceRecord);
}
export async function fetchInstallments(instituteId) {
  const { data, error } = await supabase.from("installments").select(INSTALLMENTS_COLS).eq("institute_id", instituteId).order("created_at");
  if (error) throw error;
  return data.map(mapInstallment);
}
export async function fetchNotifications(instituteId) {
  const { data, error } = await supabase.from("notifications").select(NOTIFICATIONS_COLS).eq("institute_id", instituteId).order("created_at");
  if (error) throw error;
  return data.map(mapNotification);
}

// جلب جزء واحد بس من بيانات المعهد — يستخدم بعد كل عملية كتابة بدل إعادة تحميل كل شي
export async function fetchParts(instituteId, parts) {
  const fetchers = {
    teachers: fetchTeachers,
    students: fetchStudents,
    gradeRecords: fetchGradeRecords,
    attendanceRecords: fetchAttendanceRecords,
    installments: fetchInstallments,
    notifications: fetchNotifications,
  };
  const entries = await Promise.all(parts.map(async (key) => [key, await fetchers[key](instituteId)]));
  return Object.fromEntries(entries);
}

// نسخة مقسّمة صفحات من سجلات الحضور/الامتحانات — تستخدم بشاشات "سجلات المدرس"
// اللي تكبر بلا حدود مع الوقت، بدل ما نجيب كل التاريخ دفعة وحدة
export async function fetchAttendanceRecordsPage(instituteId, teacherId, offset = 0, pageSize = 20) {
  const { data, error } = await supabase
    .from("attendance_records")
    .select(ATTENDANCE_COLS)
    .eq("institute_id", instituteId)
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);
  if (error) throw error;
  return data.map(mapAttendanceRecord);
}

export async function fetchGradeRecordsPage(instituteId, teacherId, offset = 0, pageSize = 20) {
  const { data, error } = await supabase
    .from("grade_records")
    .select(GRADES_COLS)
    .eq("institute_id", instituteId)
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);
  if (error) throw error;
  return data.map(mapGradeRecord);
}

export async function fetchAll(instituteId) {
  const [teachers, students, gradeRecords, attendanceRecords, installments, notifications] = await Promise.all([
    fetchTeachers(instituteId),
    fetchStudents(instituteId),
    fetchGradeRecords(instituteId),
    fetchAttendanceRecords(instituteId),
    fetchInstallments(instituteId),
    fetchNotifications(instituteId),
  ]);
  return { teachers, students, gradeRecords, attendanceRecords, installments, notifications };
}


/* ---------- writes (كل دالة الحين تاخذ instituteId وتربطه بالسطر الجديد) ---------- */
function generateAccessCode() {
  return Math.random().toString(36).slice(2, 10);
}

export async function addTeacher(instituteId, { name, subjectId }) {
  const { data: teacher, error: tErr } = await supabase
    .from("teachers")
    .insert({ name, subject_id: subjectId, institute_id: instituteId, access_code: generateAccessCode() })
    .select()
    .single();
  if (tErr) throw tErr;
  const { error: gErr } = await supabase.from("groups").insert({ teacher_id: teacher.id, name: "M1", institute_id: instituteId });
  if (gErr) throw gErr;
}

export async function addGroup(instituteId, teacherId, nextName) {
  const { error } = await supabase.from("groups").insert({ teacher_id: teacherId, name: nextName, institute_id: instituteId });
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

export async function addStudent(instituteId, { name, phone, parentPhone, photo, username, password, enrollments }, serial) {
  const res = await fetch("/api/auth/create-student", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ instituteId, name, phone, parentPhone, photo, username, password, enrollments, serial }),
  });
  const json = await res.json();
  if (!res.ok) {
    const err = new Error(json.error === "duplicate" ? "duplicate" : json.error || "create-student failed");
    throw err;
  }
  return serial;
}

export async function addAttendanceRecord(instituteId, { subjectId, teacherId, groupId, presentIds, allGroupStudentIds }) {
  const { data: record, error: rErr } = await supabase
    .from("attendance_records")
    .insert({
      subject_id: subjectId,
      teacher_id: teacherId,
      group_id: groupId,
      attendance_date: new Date().toISOString().slice(0, 10),
      institute_id: instituteId,
    })
    .select()
    .single();
  if (rErr) throw rErr;

  const entries = allGroupStudentIds.map((studentId) => ({
    attendance_record_id: record.id,
    student_id: studentId,
    present: presentIds.includes(studentId),
    institute_id: instituteId,
  }));
  const { error: eErr } = await supabase.from("attendance_entries").insert(entries);
  if (eErr) throw eErr;

  const subjectName = SUBJECT_NAMES[subjectId] || subjectId;
  const notifs = allGroupStudentIds.map((studentId) => ({
    message: presentIds.includes(studentId) ? `تم تسجيلك حاضراً اليوم بمادة ${subjectName}` : `تم تسجيلك غائباً اليوم بمادة ${subjectName}`,
    target_type: "student",
    student_id: studentId,
    institute_id: instituteId,
  }));
  const { error: nErr } = await supabase.from("notifications").insert(notifs);
  if (nErr) throw nErr;

  allGroupStudentIds.forEach((studentId) => {
    triggerPush(
      { type: "student", studentId },
      presentIds.includes(studentId) ? `تم تسجيلك حاضراً اليوم بمادة ${subjectName}` : `تم تسجيلك غائباً اليوم بمادة ${subjectName}`
    );
  });
}

export async function addGradeRecord(instituteId, { subjectId, teacherId, groupId, examName, examType, date, passScore, fullScore, results }) {
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
      institute_id: instituteId,
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
      institute_id: instituteId,
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
      return { message, target_type: "student", student_id: studentId, institute_id: instituteId };
    });
  if (notifRows.length) {
    const { error: nErr } = await supabase.from("notifications").insert(notifRows);
    if (nErr) throw nErr;
  }

  Object.entries(results)
    .filter(([, v]) => v && v.status)
    .forEach(([studentId, v]) => {
      const message =
        v.status === "طبيعي"
          ? `تم تسجيل درجتك بامتحان ${examName} (${examType}) في مادة ${subjectName}: ${v.score || 0}${fullScore ? `/${fullScore}` : ""}`
          : `تم تسجيل حالتك بامتحان ${examName} في مادة ${subjectName}: ${v.status}`;
      triggerPush({ type: "student", studentId }, message);
    });
}

export async function addInstallment(instituteId, { studentId, amountNumber, amountText, remaining, note, accountant }) {
  const { error } = await supabase.from("installments").insert({
    student_id: studentId,
    amount_number: amountNumber,
    amount_text: amountText,
    remaining,
    accountant,
    note,
    institute_id: instituteId,
  });
  if (error) throw error;
}

export async function deleteInstallment(installmentId) {
  const { error } = await supabase.from("installments").delete().eq("id", installmentId);
  if (error) throw error;
}

export async function addNotification(instituteId, { text, target }) {
  const row = { message: text, target_type: target.type, institute_id: instituteId };
  if (target.type === "student") row.student_id = target.studentId;
  if (target.type === "group") {
    row.subject_id = target.subjectId;
    row.teacher_id = target.teacherId;
    row.group_id = target.groupId;
  }
  const { error } = await supabase.from("notifications").insert(row);
  if (error) throw error;

  triggerPush(target, text);
}

export async function updateEnrollment(instituteId, studentId, subjectId, teacherId, groupId) {
  if (teacherId && groupId) {
    const { error } = await supabase
      .from("enrollments")
      .upsert(
        { student_id: studentId, subject_id: subjectId, teacher_id: teacherId, group_id: groupId, institute_id: instituteId },
        { onConflict: "student_id,subject_id" }
      );
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

export async function updateGradeResult(instituteId, gradeRecordId, studentId, { status, score }) {
  const { error } = await supabase
    .from("grade_results")
    .upsert(
      { grade_record_id: gradeRecordId, student_id: studentId, status, score: score || null, institute_id: instituteId },
      { onConflict: "grade_record_id,student_id" }
    );
  if (error) throw error;

  const { data: record } = await supabase
    .from("grade_records")
    .select("exam_name, exam_type, subject_id, full_score")
    .eq("id", gradeRecordId)
    .single();
  if (record) {
    const subjectName = SUBJECT_NAMES[record.subject_id] || record.subject_id;
    const message =
      status === "طبيعي"
        ? `تم تحديث درجتك بامتحان ${record.exam_name} (${record.exam_type}) في مادة ${subjectName}: ${score || 0}${record.full_score ? `/${record.full_score}` : ""}`
        : `تم تحديث حالتك بامتحان ${record.exam_name} في مادة ${subjectName}: ${status}`;
    const { error: nErr } = await supabase
      .from("notifications")
      .insert({ message, target_type: "student", student_id: studentId, institute_id: instituteId });
    if (!nErr) triggerPush({ type: "student", studentId }, message);
  }
}

export async function updateAttendanceEntry(instituteId, attendanceRecordId, studentId, present) {
  const { error } = await supabase
    .from("attendance_entries")
    .upsert(
      { attendance_record_id: attendanceRecordId, student_id: studentId, present, institute_id: instituteId },
      { onConflict: "attendance_record_id,student_id" }
    );
  if (error) throw error;

  const { data: record } = await supabase
    .from("attendance_records")
    .select("subject_id")
    .eq("id", attendanceRecordId)
    .single();
  const subjectName = record ? SUBJECT_NAMES[record.subject_id] || record.subject_id : "";
  const message = present
    ? `تم تحديث حالتك إلى حاضر${subjectName ? ` بمادة ${subjectName}` : ""}`
    : `تم تحديث حالتك إلى غائب${subjectName ? ` بمادة ${subjectName}` : ""}`;
  const { error: nErr } = await supabase
    .from("notifications")
    .insert({ message, target_type: "student", student_id: studentId, institute_id: instituteId });
  if (!nErr) triggerPush({ type: "student", studentId }, message);
}

export async function uploadStudentPhoto(blob) {
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
  const { error } = await supabase.storage.from("student-photos").upload(fileName, blob, {
    contentType: "image/jpeg",
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("student-photos").getPublicUrl(fileName);
  return data.publicUrl;
}

export async function uploadExamPhoto(blob) {
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
  const { error } = await supabase.storage.from("exam-photos").upload(fileName, blob, {
    contentType: "image/jpeg",
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("exam-photos").getPublicUrl(fileName);
  return data.publicUrl;
}

/* ---------- امتحانات MCQ ---------- */

export async function addMcqExam(instituteId, { subjectId, teacherId, groupId, title, timeLimitMinutes, questions }) {
  const { data: exam, error: eErr } = await supabase
    .from("mcq_exams")
    .insert({ institute_id: instituteId, subject_id: subjectId, teacher_id: teacherId, group_id: groupId, title, time_limit_minutes: timeLimitMinutes })
    .select()
    .single();
  if (eErr) throw eErr;

  const rows = questions.map((q, i) => ({
    exam_id: exam.id,
    question_text: q.text,
    options: q.options,
    correct_index: q.correctIndex,
    order_index: i,
  }));
  const { error: qErr } = await supabase.from("mcq_questions").insert(rows);
  if (qErr) throw qErr;

  // إشعار وpush لكل طلاب المجموعة
  const { data: enrolled } = await supabase
    .from("enrollments")
    .select("student_id")
    .eq("subject_id", subjectId)
    .eq("teacher_id", teacherId)
    .eq("group_id", groupId);
  const subjectName = SUBJECT_NAMES[subjectId] || subjectId;
  const message = `امتحان MCQ جديد متاح: ${title} (${subjectName})`;
  const notifRows = (enrolled || []).map((e) => ({ message, target_type: "student", student_id: e.student_id, institute_id: instituteId }));
  if (notifRows.length) {
    await supabase.from("notifications").insert(notifRows);
    (enrolled || []).forEach((e) => triggerPush({ type: "student", studentId: e.student_id }, message));
  }

  return exam.id;
}

export async function fetchMcqExams(instituteId) {
  const { data, error } = await supabase
    .from("mcq_exams")
    .select("id, subject_id, teacher_id, group_id, title, time_limit_minutes, created_at, mcq_questions(id)")
    .eq("institute_id", instituteId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data.map((e) => ({
    id: e.id,
    subjectId: e.subject_id,
    teacherId: e.teacher_id,
    groupId: e.group_id,
    title: e.title,
    timeLimitMinutes: e.time_limit_minutes,
    createdAt: e.created_at,
    questionCount: (e.mcq_questions || []).length,
  }));
}

export async function deleteMcqExam(examId) {
  const { error } = await supabase.from("mcq_exams").delete().eq("id", examId);
  if (error) throw error;
}

export async function fetchMcqExamForStudent(examId, studentId) {
  const [examRes, questionsRes, submissionRes] = await Promise.all([
    supabase.from("mcq_exams").select("id, title, time_limit_minutes, subject_id").eq("id", examId).single(),
    supabase.from("mcq_questions").select("id, question_text, options, order_index").eq("exam_id", examId).order("order_index"),
    supabase.from("mcq_submissions").select("id, score, total, submitted_at").eq("exam_id", examId).eq("student_id", studentId).maybeSingle(),
  ]);
  if (examRes.error) throw examRes.error;
  if (questionsRes.error) throw questionsRes.error;
  return {
    id: examRes.data.id,
    title: examRes.data.title,
    timeLimitMinutes: examRes.data.time_limit_minutes,
    subjectId: examRes.data.subject_id,
    questions: questionsRes.data.map((q) => ({ id: q.id, text: q.question_text, options: q.options })),
    submission: submissionRes.data
      ? { score: submissionRes.data.score, total: submissionRes.data.total, submittedAt: submissionRes.data.submitted_at }
      : null,
  };
}

export async function submitMcqAnswers(instituteId, examId, studentId, answers) {
  const { data: questions, error: qErr } = await supabase.from("mcq_questions").select("id, correct_index").eq("exam_id", examId);
  if (qErr) throw qErr;

  let score = 0;
  questions.forEach((q) => {
    if (answers[q.id] === q.correct_index) score += 1;
  });
  const total = questions.length;

  const { error: sErr } = await supabase.from("mcq_submissions").insert({
    exam_id: examId,
    student_id: studentId,
    institute_id: instituteId,
    answers,
    score,
    total,
    submitted_at: new Date().toISOString(),
  });
  if (sErr) throw sErr;

  const { data: exam } = await supabase.from("mcq_exams").select("title").eq("id", examId).single();
  const message = `نتيجتك بامتحان ${exam?.title || ""}: ${score}/${total}`;
  await supabase.from("notifications").insert({ message, target_type: "student", student_id: studentId, institute_id: instituteId });
  triggerPush({ type: "student", studentId }, message);

  return { score, total };
}

export async function fetchMcqSubmissions(examId) {
  const { data, error } = await supabase
    .from("mcq_submissions")
    .select("id, student_id, score, total, submitted_at")
    .eq("exam_id", examId)
    .order("submitted_at");
  if (error) throw error;
  return data.map((s) => ({ id: s.id, studentId: s.student_id, score: s.score, total: s.total, submittedAt: s.submitted_at }));
}

/* ---------- امتحانات بالصورة ---------- */

export async function addPhotoExam(instituteId, { subjectId, teacherId, groupId, title, timeLimitMinutes, examImageBlob }) {
  const examImageUrl = await uploadExamPhoto(examImageBlob);
  const { data: exam, error } = await supabase
    .from("photo_exams")
    .insert({ institute_id: instituteId, subject_id: subjectId, teacher_id: teacherId, group_id: groupId, title, time_limit_minutes: timeLimitMinutes || null, exam_image_url: examImageUrl })
    .select()
    .single();
  if (error) throw error;

  const { data: enrolled } = await supabase
    .from("enrollments")
    .select("student_id")
    .eq("subject_id", subjectId)
    .eq("teacher_id", teacherId)
    .eq("group_id", groupId);
  const subjectName = SUBJECT_NAMES[subjectId] || subjectId;
  const message = `امتحان جديد بالصورة متاح: ${title} (${subjectName})`;
  const notifRows = (enrolled || []).map((e) => ({ message, target_type: "student", student_id: e.student_id, institute_id: instituteId }));
  if (notifRows.length) {
    await supabase.from("notifications").insert(notifRows);
    (enrolled || []).forEach((e) => triggerPush({ type: "student", studentId: e.student_id }, message));
  }

  return exam.id;
}

export async function fetchPhotoExams(instituteId) {
  const { data, error } = await supabase
    .from("photo_exams")
    .select("id, subject_id, teacher_id, group_id, title, time_limit_minutes, exam_image_url, created_at")
    .eq("institute_id", instituteId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data.map((e) => ({
    id: e.id,
    subjectId: e.subject_id,
    teacherId: e.teacher_id,
    groupId: e.group_id,
    title: e.title,
    timeLimitMinutes: e.time_limit_minutes,
    examImageUrl: e.exam_image_url,
    createdAt: e.created_at,
  }));
}

export async function deletePhotoExam(photoExamId) {
  const { error } = await supabase.from("photo_exams").delete().eq("id", photoExamId);
  if (error) throw error;
}

export async function fetchPhotoExamSubmissionForStudent(photoExamId, studentId) {
  const { data, error } = await supabase
    .from("photo_exam_submissions")
    .select("id, answer_image_url, corrected_image_url, submitted_at, corrected_at")
    .eq("photo_exam_id", photoExamId)
    .eq("student_id", studentId)
    .maybeSingle();
  if (error) throw error;
  return data
    ? { id: data.id, answerImageUrl: data.answer_image_url, correctedImageUrl: data.corrected_image_url, submittedAt: data.submitted_at, correctedAt: data.corrected_at }
    : null;
}

export async function submitPhotoAnswer(instituteId, photoExamId, studentId, answerImageBlob) {
  const answerImageUrl = await uploadExamPhoto(answerImageBlob);
  const { error } = await supabase.from("photo_exam_submissions").upsert(
    { photo_exam_id: photoExamId, student_id: studentId, institute_id: instituteId, answer_image_url: answerImageUrl, submitted_at: new Date().toISOString() },
    { onConflict: "photo_exam_id,student_id" }
  );
  if (error) throw error;
  return answerImageUrl;
}

export async function fetchPhotoExamSubmissions(photoExamId) {
  const { data, error } = await supabase
    .from("photo_exam_submissions")
    .select("id, student_id, answer_image_url, corrected_image_url, submitted_at, corrected_at")
    .eq("photo_exam_id", photoExamId)
    .order("submitted_at");
  if (error) throw error;
  return data.map((s) => ({
    id: s.id,
    studentId: s.student_id,
    answerImageUrl: s.answer_image_url,
    correctedImageUrl: s.corrected_image_url,
    submittedAt: s.submitted_at,
    correctedAt: s.corrected_at,
  }));
}

export async function uploadCorrectedPhoto(instituteId, submissionId, studentId, correctedImageBlob) {
  const correctedImageUrl = await uploadExamPhoto(correctedImageBlob);
  const { error } = await supabase
    .from("photo_exam_submissions")
    .update({ corrected_image_url: correctedImageUrl, corrected_at: new Date().toISOString() })
    .eq("id", submissionId);
  if (error) throw error;

  const message = "تم تصحيح ورقة امتحانك — تقدر تشوفها الحين";
  await supabase.from("notifications").insert({ message, target_type: "student", student_id: studentId, institute_id: instituteId });
  triggerPush({ type: "student", studentId }, message);

  return correctedImageUrl;
}

export async function savePushSubscription(recipientId, subscription, role = "student") {
  const row = {
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
  };
  if (role === "teacher") row.teacher_id = recipientId;
  else row.student_id = recipientId;
  const { error } = await supabase.from("push_subscriptions").upsert(row, { onConflict: "endpoint" });
  if (error) throw error;
}

/* ---------- رمز دخول المدرس + الرسائل ---------- */

export async function loginTeacherByCode(code) {
  const { data, error } = await supabase
    .from("teachers")
    .select("id, name, subject_id, institute_id")
    .eq("access_code", code.trim())
    .maybeSingle();
  if (error) throw error;
  return data ? { id: data.id, name: data.name, subjectId: data.subject_id, instituteId: data.institute_id } : null;
}

export async function fetchTeacherConversations(instituteId, teacherId) {
  const { data, error } = await supabase
    .from("teacher_messages")
    .select("student_id, sender, message, created_at, students(name)")
    .eq("institute_id", instituteId)
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const byStudent = new Map();
  for (const m of data) {
    if (!byStudent.has(m.student_id)) {
      byStudent.set(m.student_id, {
        studentId: m.student_id,
        studentName: m.students?.name || "طالب",
        lastMessage: m.message,
        lastSender: m.sender,
        lastAt: m.created_at,
      });
    }
  }
  return Array.from(byStudent.values());
}

export async function fetchAllTeacherMessages(instituteId) {
  const { data, error } = await supabase
    .from("teacher_messages")
    .select("teacher_id, student_id, sender, message, created_at")
    .eq("institute_id", instituteId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const byPair = new Map();
  for (const m of data) {
    const key = `${m.teacher_id}:${m.student_id}`;
    if (!byPair.has(key)) {
      byPair.set(key, { teacherId: m.teacher_id, studentId: m.student_id, lastMessage: m.message, lastSender: m.sender, lastAt: m.created_at });
    }
  }
  return Array.from(byPair.values());
}

export async function fetchConversation(teacherId, studentId) {
  const { data, error } = await supabase
    .from("teacher_messages")
    .select("id, sender, message, created_at")
    .eq("teacher_id", teacherId)
    .eq("student_id", studentId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data.map((m) => ({ id: m.id, sender: m.sender, message: m.message, createdAt: m.created_at }));
}

export async function sendMessageAsStudent(instituteId, teacherId, studentId, message) {
  const { error } = await supabase.from("teacher_messages").insert({
    institute_id: instituteId,
    teacher_id: teacherId,
    student_id: studentId,
    sender: "student",
    message,
  });
  if (error) throw error;
  triggerPush({ type: "teacher", teacherId }, `سؤال جديد من طالب: ${message.slice(0, 80)}`);
}

export async function sendMessageAsTeacher(instituteId, teacherId, studentId, message) {
  const { error } = await supabase.from("teacher_messages").insert({
    institute_id: instituteId,
    teacher_id: teacherId,
    student_id: studentId,
    sender: "teacher",
    message,
  });
  if (error) throw error;

  const { data: teacher } = await supabase.from("teachers").select("name").eq("id", teacherId).single();
  const notifMsg = `رد جديد من الأستاذ ${teacher?.name || ""}`;
  await supabase.from("notifications").insert({ message: notifMsg, target_type: "student", student_id: studentId, institute_id: instituteId });
  triggerPush({ type: "student", studentId }, notifMsg);
}

