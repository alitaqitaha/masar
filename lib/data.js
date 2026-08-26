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

async function secureRead(action, payload) {
  const res = await fetch("/api/data/secure-read", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ action, payload }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "read failed");
  return json;
}

export async function fetchInstitutes() {
  return secureRead("fetchInstitutes");
}

async function ownerAction(action, payload) {
  const res = await fetch("/api/data/owner-action", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ action, payload }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "action failed");
  return json;
}

export async function addInstitute({ name, adminUsername, adminPassword }) {
  await ownerAction("addInstitute", { name, adminUsername, adminPassword });
}

export async function toggleInstituteStatus(instituteId, newStatus) {
  await ownerAction("toggleInstituteStatus", { instituteId, newStatus });
}

export async function deleteInstitute(instituteId) {
  await ownerAction("deleteInstitute", { instituteId });
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

async function teacherAction(action, payload) {
  const res = await fetch("/api/data/teacher-action", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ action, payload }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "action failed");
  return json;
}

export async function addMcqExam(instituteId, { subjectId, teacherId, groupId, title, timeLimitMinutes, questions }) {
  const result = await teacherAction("addMcqExam", { subjectId, groupId, title, timeLimitMinutes, questions });
  return result.id;
}

export async function fetchMcqExams(instituteId) {
  return secureRead("fetchMcqExams");
}

export async function deleteMcqExam(examId) {
  await teacherAction("deleteMcqExam", { examId });
}

export async function fetchMcqExamForStudent(examId, studentId) {
  return secureRead("fetchMcqExamForStudent", { examId });
}


export async function submitMcqAnswers(instituteId, examId, studentId, answers) {
  return studentAction("submitMcqAnswers", { examId, answers });
}


export async function fetchMcqSubmissions(examId) {
  return secureRead("fetchMcqSubmissions", { examId });
}

/* ---------- امتحانات بالصورة ---------- */

export async function addPhotoExam(instituteId, { subjectId, teacherId, groupId, title, timeLimitMinutes, examImageBlob }) {
  const examImageUrl = await uploadExamPhoto(examImageBlob);
  const result = await teacherAction("addPhotoExam", { subjectId, groupId, title, timeLimitMinutes, examImageUrl });
  return result.id;
}


export async function fetchPhotoExams(instituteId) {
  return secureRead("fetchPhotoExams");
}

export async function deletePhotoExam(photoExamId) {
  await teacherAction("deletePhotoExam", { photoExamId });
}

export async function fetchPhotoExamSubmissionForStudent(photoExamId, studentId) {
  return secureRead("fetchPhotoExamSubmissionForStudent", { photoExamId });
}

export async function submitPhotoAnswer(instituteId, photoExamId, studentId, answerImageBlob) {
  const answerImageUrl = await uploadExamPhoto(answerImageBlob);
  await studentAction("submitPhotoAnswer", { photoExamId, answerImageUrl });
  return answerImageUrl;
}

export async function fetchPhotoExamSubmissions(photoExamId) {
  return secureRead("fetchPhotoExamSubmissions", { photoExamId });
}

export async function uploadCorrectedPhoto(instituteId, submissionId, studentId, correctedImageBlob) {
  const correctedImageUrl = await uploadExamPhoto(correctedImageBlob);
  await teacherAction("uploadCorrectedPhoto", { submissionId, studentId, correctedImageUrl });
  return correctedImageUrl;
}

export async function savePushSubscription(recipientId, subscription, role = "student") {
  if (role === "student") {
    await studentAction("savePushSubscription", { subscription });
    return;
  }
  await teacherAction("savePushSubscription", { subscription });
}

/* ---------- رمز دخول المدرس + الرسائل ---------- */

export async function fetchGroupsForTeacher(teacherId) {
  return secureRead("fetchGroupsForTeacher");
}

export async function fetchTeacherConversations(instituteId, teacherId) {
  return secureRead("fetchTeacherConversations");
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
  return secureRead("fetchConversation", { teacherId, studentId });
}

export async function sendMessageAsStudent(instituteId, teacherId, studentId, message) {
  await studentAction("sendMessageAsStudent", { teacherId, message });
}

export async function sendMessageAsTeacher(instituteId, teacherId, studentId, message) {
  await teacherAction("sendMessageAsTeacher", { studentId, message });
}

