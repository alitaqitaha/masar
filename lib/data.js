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
// جلب جزء واحد بس من بيانات المعهد — يمر عبر مسار محمي بالسيرفر يتحقق من
// هوية الجلسة بنفسه (Cookie موقّع)، بدل الاتصال المباشر بقاعدة البيانات
// بمفتاح anon المكشوف بالمتصفح. instituteId هنا يبقى فقط للتوافق مع بقية
// الكود — السيرفر يتجاهله ويعتمد على الجلسة الموقّعة حصراً.
export async function fetchParts(instituteId, parts) {
  const res = await fetch(`/api/data/institute?parts=${parts.join(",")}`, { credentials: "include" });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "fetch failed");
  return json;
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
  const res = await fetch("/api/data/institute", { credentials: "include" });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "fetch failed");
  return json;
}


/* ---------- writes (كل دالة الحين تاخذ instituteId وتربطه بالسطر الجديد) ---------- */
function generateAccessCode() {
  return Math.random().toString(36).slice(2, 10);
}

export async function addTeacher(instituteId, { name, subjectId }) {
  await mutate("addTeacher", { name, subjectId });
}

async function mutate(action, payload) {
  const res = await fetch("/api/data/mutate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ action, payload }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "mutation failed");
  return json;
}

async function studentAction(action, payload) {
  const res = await fetch("/api/data/student-action", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ action, payload }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "action failed");
  return json;
}

export async function addGroup(instituteId, teacherId, nextName) {
  await mutate("addGroup", { teacherId, nextName });
}

export async function updateTeacherName(teacherId, name) {
  await mutate("updateTeacherName", { teacherId, name });
}

export async function deleteTeacher(teacherId) {
  await mutate("deleteTeacher", { teacherId });
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
  await mutate("addAttendanceRecord", { subjectId, teacherId, groupId, presentIds, allGroupStudentIds });
}

export async function addGradeRecord(instituteId, { subjectId, teacherId, groupId, examName, examType, date, passScore, fullScore, results }) {
  await mutate("addGradeRecord", { subjectId, teacherId, groupId, examName, examType, date, passScore, fullScore, results });
}

export async function addInstallment(instituteId, { studentId, amountNumber, amountText, remaining, note, accountant }) {
  await mutate("addInstallment", { studentId, amountNumber, remaining, note, accountant });
}

export async function deleteInstallment(installmentId) {
  await mutate("deleteInstallment", { installmentId });
}

export async function addNotification(instituteId, { text, target }) {
  await mutate("addNotification", { text, target });
}


export async function updateEnrollment(instituteId, studentId, subjectId, teacherId, groupId) {
  await mutate("updateEnrollment", { studentId, subjectId, teacherId, groupId });
}

export async function deleteStudent(studentId) {
  await mutate("deleteStudent", { studentId });
}

export async function updateStudentInfo(studentId, { name, phone, parentPhone, photo }) {
  await mutate("updateStudentInfo", { studentId, name, phone, parentPhone, photo });
}

export async function updateGradeResult(instituteId, gradeRecordId, studentId, { status, score }) {
  await mutate("updateGradeResult", { gradeRecordId, studentId, status, score });
}

export async function updateAttendanceEntry(instituteId, attendanceRecordId, studentId, present) {
  await mutate("updateAttendanceEntry", { attendanceRecordId, studentId, present });
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
    supabase.from("mcq_questions").select("id, question_text, options, correct_index, order_index").eq("exam_id", examId).order("order_index"),
    supabase.from("mcq_submissions").select("id, answers, score, total, submitted_at").eq("exam_id", examId).eq("student_id", studentId).maybeSingle(),
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

  return {
    id: examRes.data.id,
    title: examRes.data.title,
    timeLimitMinutes: examRes.data.time_limit_minutes,
    subjectId: examRes.data.subject_id,
    // ما نرسل الجواب الصحيح للطالب إلا بعد ما يسلّم — يمنع الغش
    questions: questionsRes.data.map((q) => ({ id: q.id, text: q.question_text, options: q.options })),
    submission: hasSubmission
      ? { score: submissionRes.data.score, total: submissionRes.data.total, submittedAt: submissionRes.data.submitted_at, breakdown }
      : null,
  };
}

export async function submitMcqAnswers(instituteId, examId, studentId, answers) {
  return studentAction("submitMcqAnswers", { examId, answers });
}


export async function fetchMcqSubmissions(examId) {
  const { data, error } = await supabase
    .from("mcq_submissions")
    .select("id, student_id, score, total, submitted_at, students(name)")
    .eq("exam_id", examId)
    .order("submitted_at");
  if (error) throw error;
  return data.map((s) => ({ id: s.id, studentId: s.student_id, studentName: s.students?.name || "طالب", score: s.score, total: s.total, submittedAt: s.submitted_at }));
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
  await studentAction("submitPhotoAnswer", { photoExamId, answerImageUrl });
  return answerImageUrl;
}

export async function fetchPhotoExamSubmissions(photoExamId) {
  const { data, error } = await supabase
    .from("photo_exam_submissions")
    .select("id, student_id, answer_image_url, corrected_image_url, submitted_at, corrected_at, students(name)")
    .eq("photo_exam_id", photoExamId)
    .order("submitted_at");
  if (error) throw error;
  return data.map((s) => ({
    id: s.id,
    studentId: s.student_id,
    studentName: s.students?.name || "طالب",
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
  if (role === "student") {
    await studentAction("savePushSubscription", { subscription });
    return;
  }
  // ملاحظة: جلسة المدرس لسه ما تحولت لنظام الكوكيز الآمن (مرحلة لاحقة) — تبقى بالطريقة الحالية مؤقتاً
  const row = {
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
    teacher_id: recipientId,
  };
  const { error } = await supabase.from("push_subscriptions").upsert(row, { onConflict: "endpoint" });
  if (error) throw error;
}

/* ---------- رمز دخول المدرس + الرسائل ---------- */

export async function fetchGroupsForTeacher(teacherId) {
  const { data, error } = await supabase.from("groups").select("id, name").eq("teacher_id", teacherId).order("name");
  if (error) throw error;
  return data;
}

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
  await studentAction("sendMessageAsStudent", { teacherId, message });
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

