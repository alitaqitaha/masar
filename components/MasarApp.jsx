"use client";
/**
 * مسار (Masar) — نظام إدارة المعاهد
 * جميع الحقوق محفوظة لـ علي تقي © 2026
 * يُمنع نسخ أو إعادة توزيع هذا الكود دون إذن مسبق من المالك.
 */
import React, { useState, useEffect } from "react";
import {
  fetchAll,
  fetchParts,
  fetchAttendanceRecordsPage as dbFetchAttendanceRecordsPage,
  fetchGradeRecordsPage as dbFetchGradeRecordsPage,
  addTeacher as dbAddTeacher,
  updateTeacherName as dbUpdateTeacherName,
  deleteTeacher as dbDeleteTeacher,
  addGroup as dbAddGroup,
  addStudent as dbAddStudent,
  addAttendanceRecord as dbAddAttendanceRecord,
  addGradeRecord as dbAddGradeRecord,
  addInstallment as dbAddInstallment,
  deleteInstallment as dbDeleteInstallment,
  addNotification as dbAddNotification,
  savePushSubscription as dbSavePushSubscription,
  uploadStudentPhoto as dbUploadStudentPhoto,
  addMcqExam as dbAddMcqExam,
  fetchMcqExams as dbFetchMcqExams,
  deleteMcqExam as dbDeleteMcqExam,
  fetchMcqExamForStudent as dbFetchMcqExamForStudent,
  submitMcqAnswers as dbSubmitMcqAnswers,
  fetchMcqSubmissions as dbFetchMcqSubmissions,
  addPhotoExam as dbAddPhotoExam,
  fetchPhotoExams as dbFetchPhotoExams,
  deletePhotoExam as dbDeletePhotoExam,
  fetchPhotoExamSubmissionForStudent as dbFetchPhotoExamSubmissionForStudent,
  submitPhotoAnswer as dbSubmitPhotoAnswer,
  fetchPhotoExamSubmissions as dbFetchPhotoExamSubmissions,
  uploadCorrectedPhoto as dbUploadCorrectedPhoto,
  loginTeacherByCode as dbLoginTeacherByCode,
  fetchTeacherConversations as dbFetchTeacherConversations,
  fetchAllTeacherMessages as dbFetchAllTeacherMessages,
  fetchConversation as dbFetchConversation,
  sendMessageAsStudent as dbSendMessageAsStudent,
  sendMessageAsTeacher as dbSendMessageAsTeacher,
  updateEnrollment as dbUpdateEnrollment,
  updateStudentInfo as dbUpdateStudentInfo,
  updateGradeResult as dbUpdateGradeResult,
  updateAttendanceEntry as dbUpdateAttendanceEntry,
  deleteStudent as dbDeleteStudent,
  loginUnified as dbLoginUnified,
  fetchInstitutes as dbFetchInstitutes,
  addInstitute as dbAddInstitute,
  deleteInstitute as dbDeleteInstitute,
  toggleInstituteStatus as dbToggleInstituteStatus,
} from "../lib/data";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { QRCodeSVG } from "qrcode.react";
import {
  ClipboardCheck,
  ClipboardList,
  UserPlus,
  GraduationCap,
  UsersRound,
  Wallet,
  Archive,
  Bell,
  Lock,
  Eye,
  EyeOff,
  LogOut,
  X,
  Users,
  Layers,
  User,
  Plus,
  ListChecks,
  FileImage,
  Clock,
  Hash,
  Calculator,
  Languages,
  FlaskConical,
  Atom,
  BookMarked,
  Leaf,
  BookOpen,
  ChevronLeft,
  CheckCircle2,
  XCircle,
  Search,
  Camera,
  Send,
  AlertTriangle,
  MessageCircle,
  Printer,
  Trash2,
  Download,
  FileDown,
  Pencil,
  Check,
  Zap,
  ZapOff,
  ScanLine,
} from "lucide-react";

/* ============================== tokens ============================== */
const FONT_IMPORT = `
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@600;700;800&family=IBM+Plex+Sans+Arabic:wght@400;500;600&display=swap');
`;
const INK = "#16211D";
const INK_MUTED = "#6B7570";
const ACCENT = "#1F4B43";
const ACCENT_SOFT = "#E8EFEC";
const BORDER = "#E7E9E7";
const SURFACE = "#F7F8F7";
const DANGER = "#B3423A";
const SANS = "'IBM Plex Sans Arabic', sans-serif";
const DISPLAY = "Cairo, sans-serif";

let idCounter = 1000;
const uid = (prefix) => `${prefix}-${idCounter++}`;
const today = () => new Date().toISOString().slice(0, 10);

function compressImageFile(file, maxDim = 400, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("تعذرت قراءة الملف"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("تعذر فتح الصورة"));
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("تعذر ضغط الصورة"))), "image/jpeg", quality);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

const SUBJECTS = [
  { id: "ar", name: "اللغة العربية", icon: BookOpen },
  { id: "math", name: "الرياضيات", icon: Calculator },
  { id: "en", name: "اللغة الانكليزية", icon: Languages },
  { id: "chem", name: "الكيمياء", icon: FlaskConical },
  { id: "phys", name: "الفيزياء", icon: Atom },
  { id: "isl", name: "الإسلامية", icon: BookMarked },
  { id: "bio", name: "الأحياء", icon: Leaf },
];
const getSubject = (id) => SUBJECTS.find((s) => s.id === id);

const DAILY_ITEMS = [
  { id: "attendance", label: "تسجيل حضور", icon: ClipboardCheck, code: false },
  { id: "grades", label: "تسجيل درجات", icon: ClipboardList, code: false },
  { id: "notifications", label: "الإشعارات", icon: Bell, code: false },
  { id: "notify-parent", label: "تبليغ ولي الأمر", icon: MessageCircle, code: false },
];
const MANAGEMENT_ITEMS = [
  { id: "add-student", label: "إضافة طالب", icon: UserPlus, code: true },
  { id: "add-teacher", label: "إضافة مدرس", icon: GraduationCap, code: true },
  { id: "add-group", label: "إضافة مجموعة", icon: UsersRound, code: true },
  { id: "exams", label: "الامتحانات", icon: ListChecks, code: true },
  { id: "teacher-messages", label: "أسئلة الطلاب", icon: MessageCircle, code: true },
  { id: "installments", label: "الأقساط", icon: Wallet, code: true },
  { id: "archive", label: "أرشيف الطلاب", icon: Archive, code: true },
  { id: "backup", label: "نسخة احتياطية", icon: Download, code: true },
];
const ALL_ITEMS = [...DAILY_ITEMS, ...MANAGEMENT_ITEMS];
const MANAGEMENT_CODE = "72954108"; // رمز الآيتمات المحمية

/* ============================== primitives ============================== */
function MasarMark({ size = 40, on = "dark" }) {
  const stroke = on === "dark" ? "#FFFFFF" : ACCENT;
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <path d="M6 30 C6 22, 14 22, 16 16 C18 10, 26 10, 26 6" stroke={stroke} strokeWidth="3.2" strokeLinecap="round" opacity="0.45" />
      <path d="M6 34 C10 34, 12 27, 18 24 C24 21, 27 15, 27 9" stroke={stroke} strokeWidth="3.2" strokeLinecap="round" />
      <circle cx="27" cy="9" r="3" fill={stroke} />
    </svg>
  );
}
function LogoBadge({ size = 44 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: size * 0.28, background: ACCENT, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <MasarMark size={size * 0.6} on="dark" />
    </div>
  );
}
function PathDivider() {
  return (
    <div className="flex items-center gap-1.5 py-1" aria-hidden="true">
      <span style={{ width: 6, height: 6, borderRadius: 999, background: ACCENT }} />
      <span style={{ flex: 1, height: 1, backgroundImage: `repeating-linear-gradient(to left, ${BORDER} 0 6px, transparent 6px 12px)` }} />
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="mb-4">
      {label && <label className="block text-sm mb-1.5" style={{ color: INK, fontFamily: SANS }}>{label}</label>}
      {children}
    </div>
  );
}
const inputStyle = { borderColor: BORDER, color: INK, fontFamily: SANS };
function TextInput(props) {
  return (
    <input
      {...props}
      className={"w-full rounded-xl px-4 py-3 text-sm outline-none border transition-colors " + (props.className || "")}
      style={inputStyle}
      onFocus={(e) => (e.target.style.borderColor = ACCENT)}
      onBlur={(e) => (e.target.style.borderColor = BORDER)}
    />
  );
}
function Select(props) {
  return (
    <select
      {...props}
      className={"w-full rounded-xl px-4 py-3 text-sm outline-none border bg-white " + (props.className || "")}
      style={inputStyle}
    >
      {props.children}
    </select>
  );
}
function PrimaryButton({ children, ...props }) {
  return (
    <button {...props} className={"w-full rounded-xl py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40 " + (props.className || "")} style={{ background: ACCENT, fontFamily: SANS }}>
      {children}
    </button>
  );
}
function Chip({ active, children, ...props }) {
  return (
    <button
      {...props}
      className="px-3.5 py-2 rounded-full text-xs font-medium border transition-colors"
      style={{
        borderColor: active ? ACCENT : BORDER,
        background: active ? ACCENT_SOFT : "#fff",
        color: active ? ACCENT : INK_MUTED,
        fontFamily: SANS,
      }}
    >
      {children}
    </button>
  );
}
function SuccessNote({ children }) {
  return (
    <div className="flex items-center gap-2 rounded-xl px-4 py-3 mb-4" style={{ background: ACCENT_SOFT, fontFamily: SANS }}>
      <Check size={15} style={{ color: ACCENT }} />
      <span className="text-xs" style={{ color: ACCENT }}>{children}</span>
    </div>
  );
}
function BackHeader({ title, onBack }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <button onClick={onBack} style={{ color: ACCENT }} aria-label="رجوع">
        <ChevronLeft size={20} />
      </button>
      <h2 className="text-lg" style={{ fontFamily: DISPLAY, fontWeight: 700, color: INK }}>{title}</h2>
    </div>
  );
}
function ScreenShell({ title, onBack, children }) {
  return (
    <div dir="rtl" className="min-h-screen px-5 py-6 pb-16" style={{ background: "#FFFFFF", fontFamily: SANS }}>
      <BackHeader title={title} onBack={onBack} />
      {children}
    </div>
  );
}

/* ============================== login ============================== */
function RoleToggle({ role, setRole }) {
  return (
    <div className="flex p-1 rounded-xl mb-6" style={{ background: SURFACE, fontFamily: SANS }}>
      {[{ id: "admin", label: "دخول الإدارة" }, { id: "student", label: "دخول الطالب" }].map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => setRole(opt.id)}
          className="flex-1 text-xs py-2.5 rounded-lg font-medium transition-colors"
          style={{ background: role === opt.id ? "#fff" : "transparent", color: role === opt.id ? INK : INK_MUTED, boxShadow: role === opt.id ? "0 1px 2px rgba(22,33,29,0.08)" : "none" }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
function LoginScreen({ onLogin }) {
  const [role, setRole] = useState("admin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [teacherMode, setTeacherMode] = useState(false);
  const [teacherCode, setTeacherCode] = useState("");
  const [teacherError, setTeacherError] = useState("");
  const [teacherSubmitting, setTeacherSubmitting] = useState(false);

  const submitTeacherCode = async (e) => {
    e.preventDefault();
    setTeacherError("");
    setTeacherSubmitting(true);
    try {
      const teacher = await dbLoginTeacherByCode(teacherCode.trim());
      if (teacher) {
        await onLogin("teacher", { teacher, code: teacherCode.trim() });
      } else {
        setTeacherError("الرمز غير صحيح");
      }
    } catch (e2) {
      setTeacherError("تعذر الاتصال — حاول مرة ثانية");
    } finally {
      setTeacherSubmitting(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    const u = username.trim();
    const p = password.trim();
    setSubmitting(true);
    try {
      if (role === "admin") {
        const result = await dbLoginUnified("admin", u, p);
        if (result && result.role === "owner") {
          await onLogin("owner", null);
          return;
        }
        if (result && result.role === "institute-admin") {
          await onLogin("institute-admin", { instituteId: result.instituteId, instituteName: result.instituteName, logoUrl: result.logoUrl });
          return;
        }
        setError("اسم المستخدم أو كلمة المرور غير صحيحة");
      } else {
        const result = await dbLoginUnified("student", u, p);
        if (result && result.role === "student") {
          await onLogin("student", { studentId: result.studentId, instituteId: result.instituteId });
          return;
        }
        setError("اسم المستخدم أو كلمة المرور غير صحيحة");
      }
    } catch (e2) {
      if (e2 && e2.suspended) {
        setError("هذا المعهد موقوف مؤقتاً — تواصل مع إدارة مسار");
      } else {
        setError("تعذر الاتصال — تأكد من الإنترنت وحاول مرة ثانية");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen flex items-center justify-center px-5 py-10" style={{ background: "#FFFFFF" }}>
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <LogoBadge size={60} />
          <h1 className="mt-4 text-3xl" style={{ fontFamily: DISPLAY, fontWeight: 800, color: INK }}>مسار</h1>
          <div className="w-24 mt-2"><PathDivider /></div>
          <p className="mt-2 text-sm" style={{ fontFamily: SANS, color: INK_MUTED }}>نظام إدارة المعاهد</p>
        </div>

        <form onSubmit={submit} className="border rounded-2xl p-6" style={{ borderColor: BORDER, fontFamily: SANS }}>
          <RoleToggle role={role} setRole={(r) => { setRole(r); setError(""); }} />
          <label className="block text-sm mb-1.5" style={{ color: INK }}>اسم المستخدم</label>
          <input required value={username} onChange={(e) => setUsername(e.target.value)} placeholder="أدخل اسم المستخدم"
            autoCapitalize="off" autoCorrect="off" spellCheck="false" autoComplete="username"
            className="w-full mb-4 rounded-xl px-4 py-3 text-sm outline-none border transition-colors" style={{ borderColor: BORDER, color: INK }}
            onFocus={(e) => (e.target.style.borderColor = ACCENT)} onBlur={(e) => (e.target.style.borderColor = BORDER)} />
          <label className="block text-sm mb-1.5" style={{ color: INK }}>كلمة المرور</label>
          <div className="relative mb-2">
            <input required type={showPass ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="أدخل كلمة المرور"
              autoCapitalize="off" autoCorrect="off" spellCheck="false" autoComplete="current-password"
              className="w-full rounded-xl px-4 py-3 pl-11 text-sm outline-none border transition-colors" style={{ borderColor: BORDER, color: INK }}
              onFocus={(e) => (e.target.style.borderColor = ACCENT)} onBlur={(e) => (e.target.style.borderColor = BORDER)} />
            <button type="button" onClick={() => setShowPass((s) => !s)} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: INK_MUTED }} aria-label="إظهار">
              {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {error && <p className="text-xs mb-4" style={{ color: DANGER }}>{error}</p>}
          <div className="mt-4">
            <PrimaryButton type="submit" disabled={submitting}>{submitting ? "جارِ الدخول…" : "تسجيل الدخول"}</PrimaryButton>
          </div>
        </form>

        {!teacherMode ? (
          <button
            onClick={() => setTeacherMode(true)}
            className="w-full text-center text-xs mt-4"
            style={{ color: ACCENT, fontFamily: SANS }}
          >
            دخول كمدرس؟
          </button>
        ) : (
          <form onSubmit={submitTeacherCode} className="border rounded-2xl p-6 mt-4" style={{ borderColor: BORDER, fontFamily: SANS }}>
            <p className="text-sm mb-3" style={{ color: INK }}>أدخل رمز الدخول الخاص فيك</p>
            <input
              required
              value={teacherCode}
              onChange={(e) => setTeacherCode(e.target.value)}
              placeholder="الرمز"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck="false"
              className="w-full mb-3 rounded-xl px-4 py-3 text-sm outline-none border transition-colors"
              style={{ borderColor: BORDER, color: INK }}
              onFocus={(e) => (e.target.style.borderColor = ACCENT)}
              onBlur={(e) => (e.target.style.borderColor = BORDER)}
            />
            {teacherError && <p className="text-xs mb-3" style={{ color: DANGER }}>{teacherError}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={() => { setTeacherMode(false); setTeacherError(""); }} className="flex-1 rounded-xl py-2.5 text-sm font-semibold border" style={{ borderColor: BORDER, color: INK }}>
                إلغاء
              </button>
              <button type="submit" disabled={teacherSubmitting} className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-40" style={{ background: ACCENT }}>
                {teacherSubmitting ? "جارِ الدخول…" : "دخول"}
              </button>
            </div>
          </form>
        )}

        <p className="text-center text-xs mt-6" style={{ color: INK_MUTED, fontFamily: SANS }}>جميع الحقوق محفوظة © 2026 مسار</p>
        <p className="text-center text-xs mt-1" style={{ color: INK_MUTED, fontFamily: SANS }}>تطوير: علي تقي</p>
      </div>
    </div>
  );
}

/* ============================== code gate ============================== */
function CodeModal({ item, onClose, onSuccess }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const locked = attempts >= 5;

  const submit = (e) => {
    e.preventDefault();
    if (locked) return;
    if (code === MANAGEMENT_CODE) onSuccess();
    else {
      setError(true);
      setAttempts((a) => a + 1);
    }
  };

  return (
    <div dir="rtl" className="fixed inset-0 z-50 flex items-center justify-center px-5" style={{ background: "rgba(22,33,29,0.35)" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-xs bg-white rounded-2xl p-6 border" style={{ borderColor: BORDER, fontFamily: SANS }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2"><Lock size={16} style={{ color: ACCENT }} /><span className="text-sm font-semibold" style={{ color: INK }}>رمز الوصول</span></div>
          <button onClick={onClose} style={{ color: INK_MUTED }} aria-label="إغلاق"><X size={18} /></button>
        </div>
        <p className="text-xs mb-4" style={{ color: INK_MUTED }}>هذا القسم محمي. أدخل رمز الوصول للمتابعة إلى «{item.label}».</p>
        <form onSubmit={submit}>
          <input autoFocus disabled={locked} value={code} onChange={(e) => { setCode(e.target.value); setError(false); }} placeholder="••••••••"
            className="w-full text-center tracking-widest rounded-xl px-4 py-3 text-sm outline-none border mb-1" style={{ borderColor: error ? DANGER : BORDER, color: INK }} />
          {error && !locked && <p className="text-xs mb-3" style={{ color: DANGER }}>الرمز غير صحيح ({5 - attempts} محاولات متبقية)</p>}
          {locked && <p className="text-xs mb-3" style={{ color: DANGER }}>تم إيقاف المحاولات مؤقتاً بعد عدة رموز خاطئة. أغلق وحاول لاحقاً.</p>}
          <PrimaryButton type="submit" className="mt-3" disabled={locked}>دخول</PrimaryButton>
        </form>
      </div>
    </div>
  );
}

/* ============================== admin: small widgets ============================== */
function StatCard({ icon: Icon, value, label }) {
  return (
    <div className="flex-1 rounded-2xl border p-4 flex flex-col gap-2.5" style={{ borderColor: BORDER }}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: ACCENT_SOFT }}><Icon size={15} style={{ color: ACCENT }} /></div>
      <div>
        <p className="text-xl leading-none" style={{ fontFamily: DISPLAY, fontWeight: 700, color: INK }}>{value}</p>
        <p className="text-xs mt-1" style={{ color: INK_MUTED }}>{label}</p>
      </div>
    </div>
  );
}
function ItemRow({ item, locked, onClick }) {
  const Icon = item.icon;
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl border text-right transition-colors" style={{ borderColor: BORDER, fontFamily: SANS }}>
      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: SURFACE }}><Icon size={19} style={{ color: ACCENT }} /></div>
      <span className="flex-1 text-sm font-medium" style={{ color: INK }}>{item.label}</span>
      {locked && <Lock size={14} style={{ color: INK_MUTED }} />}
    </button>
  );
}
function TeacherPicker({ teachers, value, onChange }) {
  return (
    <div className="flex flex-col gap-2.5 mb-5">
      {teachers.length === 0 && <p className="text-xs" style={{ color: INK_MUTED }}>ما فيه مدرسين مضافين بعد.</p>}
      {teachers.map((t) => {
        const subj = getSubject(t.subjectId);
        const Icon = subj.icon;
        return (
          <button key={t.id} onClick={() => onChange(t.id)} className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl border text-right"
            style={{ borderColor: value === t.id ? ACCENT : BORDER, background: value === t.id ? ACCENT_SOFT : "#fff" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#fff" }}><Icon size={17} style={{ color: ACCENT }} /></div>
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: INK }}>{t.name}</p>
              <p className="text-xs mt-0.5" style={{ color: INK_MUTED }}>{subj.name}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
function GroupPicker({ groups, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2 mb-5">
      {groups.map((g) => <Chip key={g.id} active={value === g.id} onClick={() => onChange(g.id)}>{g.name}</Chip>)}
    </div>
  );
}

/* ============================== add teacher ============================== */
/* ============================== امتحانات MCQ (إدارة) ============================== */
function ExamsAdminScreen({ store, onBack }) {
  const [teacherId, setTeacherId] = useState("");
  const [groupId, setGroupId] = useState("");
  const [exams, setExams] = useState(null);
  const [openExam, setOpenExam] = useState(null);
  const [creating, setCreating] = useState(false);

  const teacher = store.teachers.find((t) => t.id === teacherId);

  const reload = () => {
    setExams(null);
    Promise.all([dbFetchMcqExams(store.instituteId), dbFetchPhotoExams(store.instituteId)]).then(([mcq, photo]) => {
      const merged = [
        ...mcq.map((e) => ({ ...e, type: "mcq" })),
        ...photo.map((e) => ({ ...e, type: "photo" })),
      ]
        .filter((e) => e.teacherId === teacherId && e.groupId === groupId)
        .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
      setExams(merged);
    });
  };

  useEffect(() => {
    if (!teacherId || !groupId) return;
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teacherId, groupId, store.instituteId]);

  if (!teacherId) {
    return (
      <ScreenShell title="الامتحانات" onBack={onBack}>
        <p className="text-xs font-semibold mb-3" style={{ color: INK_MUTED }}>اختر المدرس</p>
        <TeacherPicker teachers={store.teachers} value={teacherId} onChange={setTeacherId} />
      </ScreenShell>
    );
  }
  if (!groupId) {
    return (
      <ScreenShell title={teacher.name} onBack={() => setTeacherId("")}>
        <p className="text-xs font-semibold mb-3" style={{ color: INK_MUTED }}>اختر المجموعة</p>
        <GroupPicker groups={teacher.groups} value={groupId} onChange={setGroupId} />
      </ScreenShell>
    );
  }
  if (creating) {
    return (
      <ExamCreateScreen
        store={store}
        teacher={teacher}
        groupId={groupId}
        onBack={() => setCreating(false)}
        onDone={() => {
          setCreating(false);
          reload();
        }}
      />
    );
  }
  if (openExam) {
    return openExam.type === "mcq" ? (
      <McqExamResultsScreen store={store} examId={openExam.id} onBack={() => setOpenExam(null)} />
    ) : (
      <PhotoExamSubmissionsScreen store={store} examId={openExam.id} onBack={() => setOpenExam(null)} />
    );
  }

  const groupName = teacher.groups.find((g) => g.id === groupId)?.name || "";
  return (
    <ScreenShell title={`${teacher.name} · ${groupName}`} onBack={() => setGroupId("")}>
      <button onClick={() => setCreating(true)} className="w-full flex items-center justify-center gap-2 rounded-xl py-3 mb-6 text-sm font-semibold text-white" style={{ background: ACCENT }}>
        <Plus size={16} /> امتحان جديد
      </button>
      <p className="text-xs font-semibold mb-3" style={{ color: INK_MUTED }}>الامتحانات السابقة</p>
      {exams === null && <p className="text-xs" style={{ color: INK_MUTED }}>جارِ التحميل…</p>}
      {exams && exams.length === 0 && <p className="text-xs" style={{ color: INK_MUTED }}>ما فيه امتحانات بعد.</p>}
      <div className="flex flex-col gap-2.5">
        {exams && exams.map((e) => (
          <button key={e.id} onClick={() => setOpenExam(e)} className="w-full flex items-center gap-3 p-3.5 rounded-2xl border text-right" style={{ borderColor: BORDER }}>
            {e.type === "photo" ? (
              <img src={e.examImageUrl} alt="" className="w-11 h-11 rounded-lg object-cover flex-shrink-0" style={{ background: SURFACE }} />
            ) : (
              <div className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: ACCENT_SOFT }}>
                <ListChecks size={18} style={{ color: ACCENT }} />
              </div>
            )}
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: INK }}>{e.title}</p>
              <p className="text-xs mt-0.5" style={{ color: INK_MUTED }}>
                {e.type === "mcq" ? `MCQ · ${e.questionCount} سؤال` : "بالصورة"}{e.timeLimitMinutes ? ` · ${e.timeLimitMinutes} دقيقة` : ""}
              </p>
            </div>
            <ChevronLeft size={16} style={{ color: INK_MUTED }} />
          </button>
        ))}
      </div>
    </ScreenShell>
  );
}

function ExamCreateScreen({ store, teacher, groupId, onBack, onDone }) {
  const [type, setType] = useState("mcq"); // "mcq" | "photo"
  const [title, setTitle] = useState("");
  const [timeLimit, setTimeLimit] = useState("20");
  const [questions, setQuestions] = useState([{ text: "", options: ["", "", "", ""], correctIndex: 0 }]);
  const [imageBlob, setImageBlob] = useState(null);
  const [preview, setPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const updateQuestion = (i, patch) => setQuestions((prev) => prev.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));
  const updateOption = (qi, oi, value) =>
    setQuestions((prev) => prev.map((q, idx) => (idx === qi ? { ...q, options: q.options.map((o, j) => (j === oi ? value : o)) } : q)));
  const addQuestion = () => setQuestions((prev) => [...prev, { text: "", options: ["", "", "", ""], correctIndex: 0 }]);
  const removeQuestion = (i) => setQuestions((prev) => prev.filter((_, idx) => idx !== i));

  const handleImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    compressImageFile(file, 1000, 0.8).then((blob) => {
      setImageBlob(blob);
      setPreview(URL.createObjectURL(blob));
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!title.trim()) {
      setError("أدخل اسم الامتحان");
      return;
    }
    if (type === "mcq" && questions.some((q) => !q.text.trim() || q.options.some((o) => !o.trim()))) {
      setError("أكمل كل الأسئلة والخيارات قبل الحفظ");
      return;
    }
    if (type === "photo" && !imageBlob) {
      setError("ارفع صورة ورقة الأسئلة قبل الحفظ");
      return;
    }
    setSubmitting(true);
    try {
      if (type === "mcq") {
        await dbAddMcqExam(store.instituteId, {
          subjectId: teacher.subjectId,
          teacherId: teacher.id,
          groupId,
          title: title.trim(),
          timeLimitMinutes: Number(timeLimit) || 20,
          questions,
        });
      } else {
        await dbAddPhotoExam(store.instituteId, {
          subjectId: teacher.subjectId,
          teacherId: teacher.id,
          groupId,
          title: title.trim(),
          timeLimitMinutes: timeLimit ? Number(timeLimit) : null,
          examImageBlob: imageBlob,
        });
      }
      onDone();
    } catch (e2) {
      setError("تعذر حفظ الامتحان — حاول مرة ثانية");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenShell title="امتحان جديد" onBack={onBack}>
      <form onSubmit={submit}>
        <p className="text-xs font-semibold mb-2.5" style={{ color: INK_MUTED }}>نوع الامتحان</p>
        <div className="flex gap-2 mb-5">
          <Chip active={type === "mcq"} onClick={() => setType("mcq")}>اختيارات (MCQ)</Chip>
          <Chip active={type === "photo"} onClick={() => setType("photo")}>بالصورة</Chip>
        </div>

        <Field label="اسم الامتحان"><TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثال: امتحان الفصل الأول" required /></Field>
        <Field label={type === "mcq" ? "الوقت المحدد (بالدقائق)" : "الوقت المحدد (بالدقائق) — اختياري"}>
          <TextInput type="number" value={timeLimit} onChange={(e) => setTimeLimit(e.target.value)} required={type === "mcq"} />
        </Field>

        {type === "mcq" ? (
          <>
            <p className="text-xs font-semibold mt-6 mb-3" style={{ color: INK_MUTED }}>الأسئلة</p>
            <div className="flex flex-col gap-4">
              {questions.map((q, qi) => (
                <div key={qi} className="p-3.5 rounded-2xl border" style={{ borderColor: BORDER }}>
                  <div className="flex items-center justify-between mb-2.5">
                    <p className="text-xs font-semibold" style={{ color: ACCENT }}>سؤال {qi + 1}</p>
                    {questions.length > 1 && (
                      <button type="button" onClick={() => removeQuestion(qi)} style={{ color: DANGER }} aria-label="حذف السؤال">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  <TextInput value={q.text} onChange={(e) => updateQuestion(qi, { text: e.target.value })} placeholder="نص السؤال" className="mb-3" />
                  <div className="flex flex-col gap-2">
                    {q.options.map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateQuestion(qi, { correctIndex: oi })}
                          className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 border"
                          style={{ borderColor: q.correctIndex === oi ? ACCENT : BORDER, background: q.correctIndex === oi ? ACCENT : "#fff" }}
                          aria-label="الإجابة الصحيحة"
                        >
                          {q.correctIndex === oi && <Check size={12} color="#fff" />}
                        </button>
                        <input
                          value={opt}
                          onChange={(e) => updateOption(qi, oi, e.target.value)}
                          placeholder={`خيار ${oi + 1}`}
                          className="flex-1 rounded-lg px-3 py-2 text-sm outline-none border"
                          style={{ borderColor: BORDER, color: INK }}
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-xs mt-2" style={{ color: INK_MUTED }}>اضغط الدائرة يمين الخيار الصحيح لتحديده</p>
                </div>
              ))}
            </div>
            <button type="button" onClick={addQuestion} className="w-full mt-4 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold border" style={{ borderColor: ACCENT, color: ACCENT }}>
              <Plus size={15} /> إضافة سؤال
            </button>
          </>
        ) : (
          <>
            <p className="text-xs font-semibold mb-2.5 mt-4" style={{ color: INK_MUTED }}>صورة ورقة الأسئلة</p>
            <label className="block cursor-pointer mb-2">
              <div className="rounded-2xl border-2 border-dashed flex flex-col items-center justify-center py-8" style={{ borderColor: BORDER }}>
                {preview ? (
                  <img src={preview} alt="" className="max-h-52 rounded-xl object-contain" />
                ) : (
                  <>
                    <Camera size={22} style={{ color: INK_MUTED }} />
                    <p className="text-xs mt-2" style={{ color: INK_MUTED }}>اضغط لرفع صورة ورقة الأسئلة</p>
                  </>
                )}
              </div>
              <input type="file" accept="image/*" onChange={handleImage} className="hidden" />
            </label>
          </>
        )}

        {error && <p className="text-xs mt-4" style={{ color: DANGER }}>{error}</p>}
        <div className="mt-6">
          <PrimaryButton type="submit" disabled={submitting}>{submitting ? "جارِ الحفظ…" : "إرسال"}</PrimaryButton>
        </div>
      </form>
    </ScreenShell>
  );
}

function McqExamResultsScreen({ store, examId, onBack }) {
  const [submissions, setSubmissions] = useState(null);

  useEffect(() => {
    dbFetchMcqSubmissions(examId).then(setSubmissions);
  }, [examId]);

  return (
    <ScreenShell title="نتائج الامتحان" onBack={onBack}>
      {submissions === null && <p className="text-xs" style={{ color: INK_MUTED }}>جارِ التحميل…</p>}
      {submissions && submissions.length === 0 && <p className="text-xs" style={{ color: INK_MUTED }}>ما فيه طلاب حلّوا الامتحان بعد.</p>}
      <div className="flex flex-col gap-2.5">
        {submissions && submissions.map((s) => {
          const student = store.students.find((st) => st.id === s.studentId);
          return (
            <div key={s.id} className="flex items-center justify-between p-3.5 rounded-2xl border" style={{ borderColor: BORDER }}>
              <p className="text-sm" style={{ color: INK }}>{student?.name || "طالب"}</p>
              <p className="text-sm" style={{ fontFamily: DISPLAY, fontWeight: 700, color: ACCENT }}>{s.score}/{s.total}</p>
            </div>
          );
        })}
      </div>
    </ScreenShell>
  );
}

function PhotoExamSubmissionsScreen({ store, examId, onBack }) {
  const [submissions, setSubmissions] = useState(null);
  const [uploadingFor, setUploadingFor] = useState(null);

  const reload = () => dbFetchPhotoExamSubmissions(examId).then(setSubmissions);
  useEffect(() => { reload(); }, [examId]);

  const handleCorrectedUpload = (submissionId, studentId, file) => {
    setUploadingFor(submissionId);
    compressImageFile(file, 1000, 0.8)
      .then((blob) => dbUploadCorrectedPhoto(store.instituteId, submissionId, studentId, blob))
      .then(reload)
      .finally(() => setUploadingFor(null));
  };

  return (
    <ScreenShell title="أوراق الطلاب" onBack={onBack}>
      {submissions === null && <p className="text-xs" style={{ color: INK_MUTED }}>جارِ التحميل…</p>}
      {submissions && submissions.length === 0 && <p className="text-xs" style={{ color: INK_MUTED }}>ما فيه طلاب رفعوا أوراقهم بعد.</p>}
      <div className="flex flex-col gap-3">
        {submissions && submissions.map((s) => {
          const student = store.students.find((st) => st.id === s.studentId);
          return (
            <div key={s.id} className="p-3.5 rounded-2xl border" style={{ borderColor: BORDER }}>
              <p className="text-sm font-medium mb-2.5" style={{ color: INK }}>{student?.name || "طالب"}</p>
              <a href={s.answerImageUrl} target="_blank" rel="noreferrer" className="text-xs mb-3 inline-block" style={{ color: ACCENT }}>
                عرض ورقة الطالب
              </a>
              {s.correctedImageUrl ? (
                <p className="text-xs flex items-center gap-1.5" style={{ color: ACCENT }}><CheckCircle2 size={13} /> تم رفع التصحيح</p>
              ) : (
                <label className="block cursor-pointer">
                  <div className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold border" style={{ borderColor: ACCENT, color: ACCENT }}>
                    {uploadingFor === s.id ? "جارِ الرفع…" : "رفع صورة مصححة"}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingFor === s.id}
                    onChange={(e) => e.target.files?.[0] && handleCorrectedUpload(s.id, s.studentId, e.target.files[0])}
                  />
                </label>
              )}
            </div>
          );
        })}
      </div>
    </ScreenShell>
  );
}

/* ============================== أسئلة الطلاب (إدارة) ============================== */
function TeacherMessagesAdminScreen({ store, onBack }) {
  const [teacherId, setTeacherId] = useState("");
  const [conversations, setConversations] = useState(null);
  const [openStudentId, setOpenStudentId] = useState(null);
  const [copied, setCopied] = useState(false);

  const teacher = store.teachers.find((t) => t.id === teacherId);

  useEffect(() => {
    if (!teacherId) return;
    setConversations(null);
    dbFetchTeacherConversations(store.instituteId, teacherId).then(setConversations);
  }, [teacherId, store.instituteId]);

  const copyLink = () => {
    const link = `${window.location.origin}${window.location.pathname}?tcode=${teacher.accessCode}`;
    navigator.clipboard?.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!teacherId) {
    return (
      <ScreenShell title="أسئلة الطلاب" onBack={onBack}>
        <p className="text-xs font-semibold mb-3" style={{ color: INK_MUTED }}>اختر المدرس</p>
        <TeacherPicker teachers={store.teachers} value={teacherId} onChange={setTeacherId} />
      </ScreenShell>
    );
  }

  if (openStudentId) {
    const student = store.students.find((s) => s.id === openStudentId);
    return (
      <ConversationThreadScreen
        title={student?.name || "طالب"}
        onBack={() => setOpenStudentId(null)}
        fetchMessages={() => dbFetchConversation(teacherId, openStudentId)}
        onSend={(text) => dbSendMessageAsTeacher(store.instituteId, teacherId, openStudentId, text)}
        selfSender="teacher"
      />
    );
  }

  return (
    <ScreenShell title={teacher.name} onBack={() => setTeacherId("")}>
      <div className="p-3.5 rounded-2xl mb-6" style={{ background: ACCENT_SOFT }}>
        <p className="text-xs mb-2" style={{ color: ACCENT }}>رابط دخول خاص بهذا المدرس — يدخله مرة وحدة ويضل مسجل بجهازه</p>
        <button onClick={copyLink} className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold text-white" style={{ background: ACCENT }}>
          {copied ? "تم النسخ ✓" : "نسخ رابط الدخول"}
        </button>
      </div>

      <p className="text-xs font-semibold mb-3" style={{ color: INK_MUTED }}>المحادثات</p>
      {conversations === null && <p className="text-xs" style={{ color: INK_MUTED }}>جارِ التحميل…</p>}
      {conversations && conversations.length === 0 && <p className="text-xs" style={{ color: INK_MUTED }}>ما فيه أسئلة من الطلاب بعد.</p>}
      <div className="flex flex-col gap-2.5">
        {conversations && conversations.map((c) => {
          const student = store.students.find((s) => s.id === c.studentId);
          return (
            <button key={c.studentId} onClick={() => setOpenStudentId(c.studentId)} className="w-full flex items-center justify-between p-3.5 rounded-2xl border text-right" style={{ borderColor: BORDER }}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: INK }}>{student?.name || "طالب"}</p>
                <p className="text-xs mt-0.5 truncate" style={{ color: INK_MUTED }}>{c.lastSender === "teacher" ? "أنت: " : ""}{c.lastMessage}</p>
              </div>
              <ChevronLeft size={16} style={{ color: INK_MUTED, flexShrink: 0 }} />
            </button>
          );
        })}
      </div>
    </ScreenShell>
  );
}

function ConversationThreadScreen({ title, onBack, fetchMessages, onSend, selfSender, embedded }) {
  const [messages, setMessages] = useState(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const reload = () => fetchMessages().then(setMessages);
  useEffect(() => {
    reload();
    const interval = setInterval(reload, 4000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await onSend(text.trim());
      setText("");
      await reload();
    } finally {
      setSending(false);
    }
  };

  const body = (
    <>
      {messages === null && <p className="text-xs" style={{ color: INK_MUTED }}>جارِ التحميل…</p>}
      <div className="flex flex-col gap-2.5" style={{ marginBottom: embedded ? 84 : 96 }}>
        {messages && messages.length === 0 && <p className="text-xs" style={{ color: INK_MUTED }}>ما فيه رسائل بعد — ابدأ المحادثة.</p>}
        {messages && messages.map((m) => (
          <div key={m.id} className="flex" style={{ justifyContent: m.sender === selfSender ? "flex-start" : "flex-end" }}>
            <div
              className="max-w-[80%] px-3.5 py-2.5 rounded-2xl"
              style={{
                background: m.sender === selfSender ? ACCENT : SURFACE,
                color: m.sender === selfSender ? "#fff" : INK,
              }}
            >
              <p className="text-sm">{m.message}</p>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={submit} className="fixed bottom-0 inset-x-0 p-4 flex gap-2" style={{ background: "#FFFFFF", borderTop: `1px solid ${BORDER}` }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="اكتب رسالتك..."
          className="flex-1 rounded-xl px-4 py-3 text-sm outline-none border"
          style={{ borderColor: BORDER, color: INK }}
        />
        <button type="submit" disabled={sending} className="w-12 h-12 rounded-xl flex items-center justify-center text-white disabled:opacity-40 flex-shrink-0" style={{ background: ACCENT }}>
          <Send size={17} />
        </button>
      </form>
    </>
  );

  if (embedded) return body;
  return <ScreenShell title={title} onBack={onBack}>{body}</ScreenShell>;
}

function TeacherInboxScreen({ teacherSession, onLogout }) {
  const [conversations, setConversations] = useState(null);
  const [openStudentId, setOpenStudentId] = useState(null);
  const [pushStatus, setPushStatus] = useState(typeof Notification !== "undefined" ? Notification.permission : "unsupported");

  const reload = () => dbFetchTeacherConversations(teacherSession.instituteId, teacherSession.id).then(setConversations);
  useEffect(() => { reload(); }, []);

  const enablePush = async () => {
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setPushStatus("unsupported");
        return;
      }
      const registration = await navigator.serviceWorker.register("/sw.js");
      const permission = await Notification.requestPermission();
      setPushStatus(permission);
      if (permission !== "granted") return;
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) return;
      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ||
        (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidKey) }));
      await dbSavePushSubscription(teacherSession.id, subscription.toJSON(), "teacher");
    } catch (e) {
      /* فشل الاشتراك — يقدر يعيد المحاولة */
    }
  };

  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "granted") enablePush();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (openStudentId) {
    const student = conversations.find((c) => c.studentId === openStudentId);
    return (
      <ConversationThreadScreen
        title={student?.studentName || "طالب"}
        onBack={() => { setOpenStudentId(null); reload(); }}
        fetchMessages={() => dbFetchConversation(teacherSession.id, openStudentId)}
        onSend={(text) => dbSendMessageAsTeacher(teacherSession.instituteId, teacherSession.id, openStudentId, text)}
        selfSender="teacher"
      />
    );
  }

  return (
    <div dir="rtl" className="min-h-screen pb-10" style={{ background: "#FFFFFF", fontFamily: SANS }}>
      <header className="px-5 pt-6 pb-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <LogoBadge size={44} />
            <div>
              <p className="text-base" style={{ fontFamily: DISPLAY, fontWeight: 700, color: INK }}>{teacherSession.name}</p>
              <p className="text-xs" style={{ color: INK_MUTED }}>أسئلة الطلاب</p>
            </div>
          </div>
          <button onClick={onLogout} className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border" style={{ borderColor: BORDER, color: INK_MUTED, fontFamily: SANS }}>
            <LogOut size={14} />خروج
          </button>
        </div>
        <div style={{ fontFamily: SANS }}><PathDivider /></div>
      </header>

      <main className="px-5">
        {pushStatus !== "granted" && pushStatus !== "unsupported" && (
          <button onClick={enablePush} className="w-full flex items-center gap-3 p-3.5 rounded-2xl mb-6 text-right" style={{ background: ACCENT_SOFT }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#fff" }}>
              <Bell size={18} style={{ color: ACCENT }} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: ACCENT }}>فعّل إشعارات الموبايل</p>
              <p className="text-xs mt-0.5" style={{ color: INK_MUTED }}>خل أسئلة الطلاب توصلك مباشرة لجهازك</p>
            </div>
          </button>
        )}

        <p className="text-xs font-semibold mb-3" style={{ color: INK_MUTED }}>الأسئلة</p>
        {conversations === null && <p className="text-xs" style={{ color: INK_MUTED }}>جارِ التحميل…</p>}
        {conversations && conversations.length === 0 && <p className="text-xs" style={{ color: INK_MUTED }}>ما فيه أسئلة من الطلاب بعد.</p>}
        <div className="flex flex-col gap-2.5">
          {conversations && conversations.map((c) => (
            <button key={c.studentId} onClick={() => setOpenStudentId(c.studentId)} className="w-full flex items-center justify-between p-3.5 rounded-2xl border text-right" style={{ borderColor: BORDER }}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: INK }}>{c.studentName}</p>
                <p className="text-xs mt-0.5 truncate" style={{ color: INK_MUTED }}>{c.lastSender === "teacher" ? "أنت: " : ""}{c.lastMessage}</p>
              </div>
              <ChevronLeft size={16} style={{ color: INK_MUTED, flexShrink: 0 }} />
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}

function formatTime(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString("ar-IQ", { hour: "2-digit", minute: "2-digit" });
  } catch (e) {
    return "";
  }
}

function TeacherAttendanceLogScreen({ store, teacher, onBack }) {
  const PAGE_SIZE = 20;
  const [records, setRecords] = useState([]);
  const [openRecordId, setOpenRecordId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const loadPage = async (offset) => {
    const page = await dbFetchAttendanceRecordsPage(store.instituteId, teacher.id, offset, PAGE_SIZE);
    setHasMore(page.length === PAGE_SIZE);
    return page;
  };

  useEffect(() => {
    setLoading(true);
    loadPage(0)
      .then(setRecords)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teacher.id]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const more = await loadPage(records.length);
      setRecords((prev) => [...prev, ...more]);
    } finally {
      setLoadingMore(false);
    }
  };

  const openRecord = records.find((r) => r.id === openRecordId);
  if (openRecord) {
    const groupName = teacher.groups.find((g) => g.id === openRecord.groupId)?.name || "";
    const students = openRecord.allGroupStudentIds.map((id) => store.students.find((s) => s.id === id)).filter(Boolean);
    return (
      <AttendanceResultsShareScreen
        subjectName={getSubject(teacher.subjectId).name}
        teacherName={teacher.name}
        groupName={groupName}
        date={openRecord.date}
        time={formatTime(openRecord.createdAt)}
        students={students}
        presentIds={openRecord.presentIds}
        instituteName={store.instituteName}
        onBack={() => setOpenRecordId(null)}
      />
    );
  }

  return (
    <ScreenShell title={`سجلات حضور ${teacher.name}`} onBack={onBack}>
      {loading && <p className="text-xs" style={{ color: INK_MUTED }}>جارِ التحميل…</p>}
      {!loading && records.length === 0 && <p className="text-xs" style={{ color: INK_MUTED }}>ما فيه جلسات حضور مسجلة بعد.</p>}
      <div className="flex flex-col gap-2.5">
        {records.map((r) => {
          const groupName = teacher.groups.find((g) => g.id === r.groupId)?.name || "";
          return (
            <button key={r.id} onClick={() => setOpenRecordId(r.id)} className="w-full flex items-center justify-between p-3.5 rounded-2xl border text-right" style={{ borderColor: BORDER }}>
              <div>
                <p className="text-sm font-medium" style={{ color: INK }}>{groupName}</p>
                <p className="text-xs mt-0.5" style={{ color: INK_MUTED }}>{r.date}{r.createdAt ? ` · ${formatTime(r.createdAt)}` : ""} · {r.presentIds.length}/{r.allGroupStudentIds.length} حاضر</p>
              </div>
              <ChevronLeft size={16} style={{ color: INK_MUTED }} />
            </button>
          );
        })}
      </div>
      {!loading && hasMore && (
        <button onClick={loadMore} disabled={loadingMore} className="w-full mt-4 rounded-xl py-2.5 text-xs font-semibold border disabled:opacity-40" style={{ borderColor: BORDER, color: ACCENT }}>
          {loadingMore ? "جارِ التحميل…" : "تحميل المزيد"}
        </button>
      )}
    </ScreenShell>
  );
}

function TeacherExamLogScreen({ store, teacher, onBack }) {
  const PAGE_SIZE = 20;
  const [records, setRecords] = useState([]);
  const [openRecordId, setOpenRecordId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const loadPage = async (offset) => {
    const page = await dbFetchGradeRecordsPage(store.instituteId, teacher.id, offset, PAGE_SIZE);
    setHasMore(page.length === PAGE_SIZE);
    return page;
  };

  useEffect(() => {
    setLoading(true);
    loadPage(0)
      .then(setRecords)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teacher.id]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const more = await loadPage(records.length);
      setRecords((prev) => [...prev, ...more]);
    } finally {
      setLoadingMore(false);
    }
  };

  const openRecord = records.find((r) => r.id === openRecordId);
  if (openRecord) {
    const groupName = teacher.groups.find((g) => g.id === openRecord.groupId)?.name || "";
    const roster = Object.keys(openRecord.results).map((id) => store.students.find((s) => s.id === id)).filter(Boolean);
    return (
      <ExamResultsShareScreen
        subjectName={getSubject(teacher.subjectId).name}
        teacherName={teacher.name}
        groupName={groupName}
        examName={openRecord.examName}
        examType={openRecord.examType}
        date={openRecord.date}
        time={formatTime(openRecord.createdAt)}
        fullScore={openRecord.fullScore}
        roster={roster}
        results={openRecord.results}
        instituteName={store.instituteName}
        onBack={() => setOpenRecordId(null)}
      />
    );
  }

  return (
    <ScreenShell title={`سجلات امتحانات ${teacher.name}`} onBack={onBack}>
      {loading && <p className="text-xs" style={{ color: INK_MUTED }}>جارِ التحميل…</p>}
      {!loading && records.length === 0 && <p className="text-xs" style={{ color: INK_MUTED }}>ما فيه امتحانات مسجلة بعد.</p>}
      <div className="flex flex-col gap-2.5">
        {records.map((r) => {
          const groupName = teacher.groups.find((g) => g.id === r.groupId)?.name || "";
          return (
            <button key={r.id} onClick={() => setOpenRecordId(r.id)} className="w-full flex items-center justify-between p-3.5 rounded-2xl border text-right" style={{ borderColor: BORDER }}>
              <div>
                <p className="text-sm font-medium" style={{ color: INK }}>{r.examName}</p>
                <p className="text-xs mt-0.5" style={{ color: INK_MUTED }}>{groupName} · {r.examType} · {r.date}{r.createdAt ? ` · ${formatTime(r.createdAt)}` : ""}</p>
              </div>
              <ChevronLeft size={16} style={{ color: INK_MUTED }} />
            </button>
          );
        })}
      </div>
      {!loading && hasMore && (
        <button onClick={loadMore} disabled={loadingMore} className="w-full mt-4 rounded-xl py-2.5 text-xs font-semibold border disabled:opacity-40" style={{ borderColor: BORDER, color: ACCENT }}>
          {loadingMore ? "جارِ التحميل…" : "تحميل المزيد"}
        </button>
      )}
    </ScreenShell>
  );
}

function TeacherDetailScreen({ store, teacher, onBack, onDeleted }) {
  const subj = getSubject(teacher.subjectId);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(teacher.name);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [openLog, setOpenLog] = useState(null); // null | "attendance" | "exams"

  const saveName = () => {
    if (!name.trim()) return;
    store.updateTeacherName(teacher.id, name.trim());
    setEditing(false);
  };

  if (openLog === "attendance") return <TeacherAttendanceLogScreen store={store} teacher={teacher} onBack={() => setOpenLog(null)} />;
  if (openLog === "exams") return <TeacherExamLogScreen store={store} teacher={teacher} onBack={() => setOpenLog(null)} />;

  return (
    <ScreenShell title={editing ? "تعديل اسم المدرس" : teacher.name} onBack={onBack}>
      {editing ? (
        <div className="mb-6 p-3.5 rounded-2xl border" style={{ borderColor: BORDER }}>
          <Field label="اسم المدرس"><TextInput value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <div className="flex gap-2">
            <button onClick={() => { setEditing(false); setName(teacher.name); }} className="flex-1 rounded-xl py-2.5 text-sm font-semibold border" style={{ borderColor: BORDER, color: INK }}>إلغاء</button>
            <button onClick={saveName} className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white" style={{ background: ACCENT }}>حفظ</button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-xs" style={{ color: INK_MUTED }}>
            <subj.icon size={14} style={{ color: ACCENT }} />
            {subj.name} · {teacher.groups.length} مجموعة
          </div>
          <button onClick={() => setEditing(true)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: SURFACE }} aria-label="تعديل الاسم">
            <Pencil size={13} style={{ color: ACCENT }} />
          </button>
        </div>
      )}

      <div className="flex gap-2 mb-6">
        <button onClick={() => setOpenLog("attendance")} className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold border" style={{ borderColor: BORDER, color: INK }}>
          <ClipboardCheck size={14} style={{ color: ACCENT }} /> سجلات الحضور
        </button>
        <button onClick={() => setOpenLog("exams")} className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold border" style={{ borderColor: BORDER, color: INK }}>
          <ClipboardList size={14} style={{ color: ACCENT }} /> سجلات الامتحانات
        </button>
      </div>

      <div className="flex flex-col gap-4 mb-8">
        {teacher.groups.map((g) => {
          const groupStudents = store.students.filter((s) => s.enrollments[teacher.subjectId]?.teacherId === teacher.id && s.enrollments[teacher.subjectId]?.groupId === g.id);
          return (
            <div key={g.id}>
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-sm font-semibold" style={{ color: INK, fontFamily: DISPLAY }}>{g.name}</p>
                <span className="text-xs" style={{ color: INK_MUTED }}>{groupStudents.length} طالب</span>
              </div>
              <div className="flex flex-col gap-2">
                {groupStudents.length === 0 && <p className="text-xs" style={{ color: INK_MUTED }}>ما فيه طلاب بهذي المجموعة بعد.</p>}
                {groupStudents.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl border" style={{ borderColor: BORDER }}>
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0" style={{ background: SURFACE }}>
                      {s.photo ? <img src={s.photo} alt="" className="w-full h-full object-cover" /> : <span style={{ fontFamily: DISPLAY, fontWeight: 700, color: ACCENT, fontSize: 12 }}>{s.name[0]}</span>}
                    </div>
                    <div>
                      <p className="text-sm" style={{ color: INK }}>{s.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: INK_MUTED }}>{s.serial}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {!confirmDelete ? (
        <button
          onClick={() => setConfirmDelete(true)}
          className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold border"
          style={{ borderColor: DANGER, color: DANGER, fontFamily: SANS }}
        >
          <Trash2 size={15} /> حذف المدرس
        </button>
      ) : (
        <div className="rounded-xl border p-3.5" style={{ borderColor: DANGER, background: "#FBEAE8" }}>
          <p className="text-xs mb-3" style={{ color: DANGER, fontFamily: SANS }}>حذف المدرس يحذف كل مجموعاته وسجلات درجاته وحضوره المرتبطة. متأكد؟</p>
          <div className="flex gap-2">
            <button onClick={() => setConfirmDelete(false)} className="flex-1 rounded-lg py-2.5 text-xs font-semibold border" style={{ borderColor: BORDER, color: INK }}>إلغاء</button>
            <button
              onClick={() => { store.deleteTeacher(teacher.id); onDeleted?.(); }}
              className="flex-1 rounded-lg py-2.5 text-xs font-semibold text-white"
              style={{ background: DANGER }}
            >
              تأكيد الحذف
            </button>
          </div>
        </div>
      )}
    </ScreenShell>
  );
}

function AddTeacherScreen({ store, onBack }) {
  const [name, setName] = useState("");
  const [subjectId, setSubjectId] = useState(SUBJECTS[0].id);
  const [done, setDone] = useState(false);
  const [openTeacherId, setOpenTeacherId] = useState(null);

  const submit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    store.addTeacher({ name: name.trim(), subjectId });
    setName("");
    setDone(true);
    setTimeout(() => setDone(false), 2500);
  };

  const openTeacher = store.teachers.find((t) => t.id === openTeacherId);
  if (openTeacher) {
    return <TeacherDetailScreen store={store} teacher={openTeacher} onBack={() => setOpenTeacherId(null)} onDeleted={() => setOpenTeacherId(null)} />;
  }

  return (
    <ScreenShell title="إضافة مدرس" onBack={onBack}>
      {done && <SuccessNote>تمت إضافة المدرس، وتوفرت له مجموعة M1 تلقائياً.</SuccessNote>}
      <form onSubmit={submit}>
        <Field label="اسم المدرس"><TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: أحمد الزيادي" required /></Field>
        <Field label="المادة">
          <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            {SUBJECTS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </Field>
        <PrimaryButton type="submit">إضافة المدرس</PrimaryButton>
      </form>

      <p className="text-xs font-semibold mt-8 mb-3" style={{ color: INK_MUTED }}>المدرسون الحاليون</p>
      <div className="flex flex-col gap-2.5">
        {store.teachers.map((t) => {
          const subj = getSubject(t.subjectId);
          return (
            <button key={t.id} onClick={() => setOpenTeacherId(t.id)} className="w-full flex items-center justify-between p-3.5 rounded-2xl border text-right" style={{ borderColor: BORDER }}>
              <div>
                <p className="text-sm font-medium" style={{ color: INK }}>{t.name}</p>
                <p className="text-xs mt-0.5" style={{ color: INK_MUTED }}>{subj.name} · {t.groups.length} مجموعة</p>
              </div>
              <ChevronLeft size={16} style={{ color: INK_MUTED }} />
            </button>
          );
        })}
      </div>
    </ScreenShell>
  );
}

/* ============================== add group ============================== */
function AddGroupScreen({ store, onBack }) {
  const [teacherId, setTeacherId] = useState(store.teachers[0]?.id || "");
  const [done, setDone] = useState(false);
  const teacher = store.teachers.find((t) => t.id === teacherId);

  const submit = () => {
    if (!teacherId) return;
    store.addGroup(teacherId);
    setDone(true);
    setTimeout(() => setDone(false), 2000);
  };

  return (
    <ScreenShell title="إضافة مجموعة" onBack={onBack}>
      {done && <SuccessNote>تمت إضافة مجموعة جديدة للمدرس.</SuccessNote>}
      <p className="text-xs font-semibold mb-3" style={{ color: INK_MUTED }}>اختر المدرس</p>
      <TeacherPicker teachers={store.teachers} value={teacherId} onChange={setTeacherId} />
      {teacher && (
        <>
          <p className="text-xs font-semibold mb-3" style={{ color: INK_MUTED }}>مجموعات {teacher.name} الحالية</p>
          <div className="flex flex-wrap gap-2 mb-6">{teacher.groups.map((g) => <Chip key={g.id}>{g.name}</Chip>)}</div>
          <PrimaryButton onClick={submit}>إضافة مجموعة جديدة</PrimaryButton>
        </>
      )}
    </ScreenShell>
  );
}

/* ============================== add student ============================== */
/* ============================== student ID card ============================== */

function IDField({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2.5" dir="rtl">
      <Icon size={15} style={{ color: ACCENT, flexShrink: 0 }} />
      <p style={{ fontSize: 13, color: INK }}>
        <span style={{ fontWeight: 700 }}>{label}:</span> {value}
      </p>
    </div>
  );
}

function IDCardPrintScreen({ student, instituteName, onBack }) {
  return (
    <div dir="rtl" className="min-h-screen px-5 py-6 pb-12" style={{ background: "#FFFFFF", fontFamily: SANS }}>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #id-card-print, #id-card-print * { visibility: visible; }
          #id-card-wrap { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; }
          #id-card-print { transform: none !important; box-shadow: none !important; }
        }
      `}</style>

      <button onClick={onBack} className="text-sm mb-6 no-print" style={{ color: ACCENT }}>→ رجوع</button>

      {/* preview wrapper: scales the true-size card up for on-screen legibility; print CSS removes the scale */}
      <div id="id-card-wrap" className="flex justify-center" style={{ paddingBottom: "112mm" }}>
        <div
          id="id-card-print"
          className="relative overflow-hidden"
          style={{
            width: "85.6mm",
            height: "53.98mm",
            background: "#fff",
            boxShadow: "0 16px 32px rgba(22,33,29,0.2)",
            borderRadius: "3.2mm",
            transform: "scale(3)",
            transformOrigin: "top center",
          }}
        >
          {/* header */}
          <div className="flex items-center gap-1.5 px-2" style={{ height: "8mm", background: ACCENT }} dir="rtl">
            <MasarMark size={14} on="dark" />
            <p style={{ fontFamily: DISPLAY, fontWeight: 800, color: "#fff", fontSize: "3.2mm", whiteSpace: "nowrap" }}>{instituteName || "معهد"}</p>
          </div>

          {/* body */}
          <div className="flex items-center gap-2 px-2" style={{ height: "34mm" }} dir="rtl">
            {/* photo */}
            <div
              className="flex-shrink-0 rounded-md overflow-hidden flex items-center justify-center"
              style={{ width: "13mm", height: "16mm", border: `0.4mm solid ${ACCENT}`, background: SURFACE }}
            >
              {student.photo ? (
                <img src={student.photo} alt="" className="w-full h-full object-cover" />
              ) : (
                <span style={{ fontFamily: DISPLAY, fontWeight: 700, color: ACCENT, fontSize: "4mm" }}>{student.name[0]}</span>
              )}
            </div>

            {/* fields */}
            <div className="flex-1 flex flex-col gap-1.5 min-w-0">
              <p style={{ fontFamily: DISPLAY, fontWeight: 700, color: INK, fontSize: "3.4mm", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {student.name}
              </p>
              <div className="flex items-center gap-1" style={{ whiteSpace: "nowrap" }}>
                <Hash size={7} style={{ color: ACCENT, flexShrink: 0 }} />
                <p style={{ fontSize: "2.6mm", color: INK }}>{student.serial}</p>
              </div>
              <div className="flex items-center gap-1" style={{ whiteSpace: "nowrap" }}>
                <Layers size={7} style={{ color: ACCENT, flexShrink: 0 }} />
                <p style={{ fontSize: "2.6mm", color: INK }}>السادس الإعدادي</p>
              </div>
            </div>

            {/* QR */}
            <div className="flex-shrink-0 rounded-md p-1" style={{ border: `0.3mm solid ${ACCENT}` }}>
              <QRCodeSVG value={student.serial} size={13 * 3.78} fgColor={INK} bgColor="#ffffff" style={{ width: "13mm", height: "13mm" }} />
            </div>
          </div>

          {/* footer */}
          <div className="flex items-center justify-center px-2" style={{ height: "12mm", background: ACCENT }}>
            <p style={{ fontSize: "2.3mm", color: "rgba(255,255,255,0.9)", textAlign: "center", lineHeight: 1.3 }}>
              هذه البطاقة وثيقة رسمية ملك لـ{instituteName || "المعهد"} ويجب إبرازها عند الطلب
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-[360px] mx-auto mt-6 no-print">
        <button
          onClick={() => window.print()}
          className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white"
          style={{ background: ACCENT }}
        >
          <Printer size={16} /> طباعة / حفظ كملف PDF
        </button>
        <p className="text-xs text-center mt-3" style={{ color: INK_MUTED }}>
          الحجم مضبوط بالضبط على مقاس بطاقة RFID القياسي (85.6×54 ملم) — المعاينة مكبّرة للوضوح بس، الطباعة تصير بالحجم الحقيقي تلقائياً. بعد الضغط، اختر «حفظ كـ PDF» بدل الطابعة، بعدها تقدر تشارك الملف مباشرة بتلغرام أو واتساب.
        </p>
      </div>
    </div>
  );
}

function AddStudentScreen({ store, onBack }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [photo, setPhoto] = useState(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [enroll, setEnroll] = useState({});
  const [done, setDone] = useState(null);
  const [showCard, setShowCard] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [photoUploading, setPhotoUploading] = useState(false);
  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUploading(true);
    compressImageFile(file)
      .then((blob) => dbUploadStudentPhoto(blob))
      .then(setPhoto)
      .catch(() => {})
      .finally(() => setPhotoUploading(false));
  };

  const setSubjectTeacher = (subjectId, teacherId) => {
    setEnroll((prev) => ({ ...prev, [subjectId]: teacherId ? { teacherId, groupId: "" } : undefined }));
  };
  const setSubjectGroup = (subjectId, groupId) => {
    setEnroll((prev) => ({ ...prev, [subjectId]: { ...prev[subjectId], groupId } }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !username.trim() || !password.trim()) return;
    setSubmitError("");
    setSubmitting(true);
    const enrollments = {};
    Object.entries(enroll).forEach(([subjectId, v]) => {
      if (v && v.teacherId && v.groupId) enrollments[subjectId] = v;
    });
    try {
      const serial = await store.addStudent({ name: name.trim(), phone, parentPhone, photo, username: username.trim(), password: password.trim(), enrollments });
      setDone(serial);
      setName(""); setPhone(""); setParentPhone(""); setPhoto(null); setUsername(""); setPassword(""); setEnroll({});
    } catch (err) {
      const msg = (err && err.message) || "";
      if (msg.includes("duplicate") || msg.includes("unique")) {
        setSubmitError("اسم المستخدم هذا مستخدم أصلاً — جرب اسم مستخدم ثاني");
      } else {
        setSubmitError("تعذر حفظ الطالب — حاول مرة ثانية");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const newStudent = done ? store.students.find((s) => s.serial === done) : null;

  if (showCard && newStudent) {
    return <IDCardPrintScreen student={newStudent} instituteName={store.instituteName} onBack={() => setShowCard(false)} />;
  }

  return (
    <ScreenShell title="إضافة طالب" onBack={onBack}>
      {done && (
        <div className="rounded-xl px-4 py-3 mb-4" style={{ background: ACCENT_SOFT }}>
          <div className="flex items-center gap-2 mb-2.5">
            <Check size={15} style={{ color: ACCENT }} />
            <span className="text-xs" style={{ color: ACCENT }}>تمت إضافة الطالب بالرقم التسلسلي {done}.</span>
          </div>
          <button
            onClick={() => setShowCard(true)}
            className="w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold text-white"
            style={{ background: ACCENT, fontFamily: SANS }}
          >
            <Printer size={14} /> طباعة هوية الطالب
          </button>
        </div>
      )}
      <form onSubmit={submit}>
        <div className="flex items-center gap-4 mb-5">
          <label className="relative cursor-pointer">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
              {photo ? <img src={photo} alt="" className="w-full h-full object-cover" /> : <Camera size={20} style={{ color: INK_MUTED }} />}
            </div>
            <input type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
          </label>
          <p className="text-xs" style={{ color: INK_MUTED }}>اضغط لرفع صورة الطالب</p>
        </div>

        <Field label="الاسم الثلاثي"><TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: مصطفى علاء حسين" required /></Field>
        <Field label="رقم الطالب"><TextInput value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07xxxxxxxxx" /></Field>
        <Field label="رقم ولي الأمر"><TextInput value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} placeholder="07xxxxxxxxx" /></Field>

        <p className="text-xs font-semibold mb-3 mt-2" style={{ color: INK_MUTED }}>المواد والمدرسون</p>
        <div className="flex flex-col gap-3 mb-2">
          {SUBJECTS.map((subj) => {
            const teachersForSubject = store.teachers.filter((t) => t.subjectId === subj.id);
            const current = enroll[subj.id];
            const currentTeacher = teachersForSubject.find((t) => t.id === current?.teacherId);
            return (
              <div key={subj.id} className="p-3.5 rounded-2xl border" style={{ borderColor: BORDER }}>
                <p className="text-sm font-medium mb-2.5" style={{ color: INK }}>{subj.name}</p>
                <Select value={current?.teacherId || ""} onChange={(e) => setSubjectTeacher(subj.id, e.target.value)} className="mb-2">
                  <option value="">— غير مسجل —</option>
                  {teachersForSubject.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </Select>
                {currentTeacher && (
                  <Select value={current?.groupId || ""} onChange={(e) => setSubjectGroup(subj.id, e.target.value)}>
                    <option value="">اختر المجموعة</option>
                    {currentTeacher.groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </Select>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-xs font-semibold mb-3 mt-4" style={{ color: INK_MUTED }}>بيانات الدخول</p>
        <Field label="اسم المستخدم"><TextInput value={username} onChange={(e) => setUsername(e.target.value)} placeholder="اسم مستخدم الطالب" required /></Field>
        <Field label="كلمة المرور"><TextInput value={password} onChange={(e) => setPassword(e.target.value)} placeholder="كلمة مرور الطالب" required /></Field>

        {submitError && <p className="text-xs mb-3" style={{ color: DANGER }}>{submitError}</p>}
        <PrimaryButton type="submit" disabled={submitting}>{submitting ? "جارِ الحفظ…" : "حفظ الطالب"}</PrimaryButton>
      </form>
    </ScreenShell>
  );
}

/* ============================== early warning + whatsapp ============================== */
function getAtRiskStudents(store) {
  const flags = [];
  store.students.forEach((student) => {
    Object.entries(student.enrollments).forEach(([subjectId, enr]) => {
      const attRecords = store.attendanceRecords
        .filter((r) => r.subjectId === subjectId && r.teacherId === enr.teacherId && r.groupId === enr.groupId && r.allGroupStudentIds.includes(student.id))
        .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
      let consecutiveAbsences = 0;
      for (const r of attRecords) {
        if (!r.presentIds.includes(student.id)) consecutiveAbsences++;
        else break;
      }
      if (consecutiveAbsences >= 3) {
        flags.push({ studentId: student.id, subjectId, type: "absence", detail: `${consecutiveAbsences} غيابات متتالية` });
      }

      const gradeRecs = store.gradeRecords
        .filter((r) => r.subjectId === subjectId && r.teacherId === enr.teacherId && r.groupId === enr.groupId && r.results[student.id])
        .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
        .slice(0, 2);
      if (gradeRecs.length === 2) {
        const bothLow = gradeRecs.every((r) => {
          const res = r.results[student.id];
          return res.status === "طبيعي" && res.score !== "" && r.passScore && Number(res.score) < Number(r.passScore);
        });
        if (bothLow) {
          const latest = gradeRecs[0];
          flags.push({
            studentId: student.id,
            subjectId,
            type: "decline",
            detail: `آخر درجة: ${latest.results[student.id].score}/${latest.fullScore}`,
            score: latest.results[student.id].score,
            fullScore: latest.fullScore,
          });
        }
      }
    });
  });
  return flags;
}

function buildParentMessage(type, studentName, subjectName, score, fullScore, instituteName) {
  const inst = instituteName || "المعهد";
  if (type === "absence") {
    return `السلام عليكم أستاذي

نود إعلامكم من إدارة ${inst} بأن الطالب ${studentName} لم يحضر اليوم إلى محاضرة ${subjectName}.

نرجو منكم التفضل بالاطلاع على سبب الغياب، ومتابعة التزام الطالب بالمحاضرات حرصاً على مستواه الدراسي.

مع التقدير والاحترام
إدارة ${inst}`;
  }
  return `السلام عليكم أستاذي

نود إعلامكم من إدارة ${inst} بأن نتائج الطالب ${studentName} بمادة ${subjectName} شهدت تراجعاً، حيث حصل على درجة ${score}${fullScore ? `/${fullScore}` : ""} بآخر امتحان.

نرجو منكم متابعة الطالب ومساعدته لتجاوز هذه المرحلة حرصاً على مستواه الدراسي.

مع التقدير والاحترام
إدارة ${inst}`;
}

function normalizePhone(phone) {
  if (!phone) return null;
  let p = phone.replace(/[^\d+]/g, "");
  if (p.startsWith("+")) p = p.slice(1);
  if (p.startsWith("0")) p = "964" + p.slice(1);
  else if (!p.startsWith("964")) p = "964" + p;
  return p;
}

function openWhatsapp(phone, message) {
  const normalized = normalizePhone(phone);
  if (!normalized) {
    alert("رقم ولي الأمر غير مسجل لهذا الطالب");
    return;
  }
  window.open(`https://wa.me/${normalized}?text=${encodeURIComponent(message)}`, "_blank");
}

/* ============================== attendance ============================== */
function studentsInGroup(students, subjectId, teacherId, groupId) {
  return students.filter((s) => s.enrollments[subjectId]?.teacherId === teacherId && s.enrollments[subjectId]?.groupId === groupId);
}
function BarcodeScanStep({ roster, presentIds, onScan, onFinish }) {
  const videoRef = React.useRef(null);
  const streamRef = React.useRef(null);
  const scanControlsRef = React.useRef(null);
  const scanLockRef = React.useRef(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [flashOn, setFlashOn] = useState(false);
  const [flashSupported, setFlashSupported] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [feedback, setFeedback] = useState(null); // { ok: bool, text: string }

  const rosterRef = React.useRef(roster);
  const presentIdsRef = React.useRef(presentIds);
  rosterRef.current = roster;
  presentIdsRef.current = presentIds;

  const scanStudent = (student) => {
    if (presentIdsRef.current.includes(student.id)) {
      setFeedback({ ok: false, text: `${student.name} مسجل حاضر مسبقاً` });
    } else {
      onScan(student.id);
      setFeedback({ ok: true, text: `تم تسجيل ${student.name} حاضراً` });
    }
    setManualCode("");
    setTimeout(() => setFeedback(null), 2200);
  };

  const handleDetectedCode = (text) => {
    if (scanLockRef.current) return;
    const code = (text || "").trim();
    if (!code) return;
    const lower = code.toLowerCase();
    const student = rosterRef.current.find((s) => s.serial.toLowerCase() === lower || s.serial.toLowerCase().endsWith(lower));
    if (!student) return; // unrecognized code while scanning — ignore silently, no spam
    scanLockRef.current = true;
    scanStudent(student);
    setTimeout(() => { scanLockRef.current = false; }, 1500);
  };

  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (!window.isSecureContext) throw new Error("الموقع مو على اتصال آمن (HTTPS) — الكاميرا تحتاج اتصال آمن");
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error("هذا المتصفح ما يدعم الوصول للكاميرا");
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (!active) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          try {
            await videoRef.current.play();
          } catch (playErr) {
            /* some browsers need a user gesture; ignore and let element remain paused */
          }
        }
        setCameraOn(true);
        const track = stream.getVideoTracks()[0];
        const caps = track.getCapabilities ? track.getCapabilities() : {};
        setFlashSupported(Boolean(caps.torch));

        try {
          const reader = new BrowserMultiFormatReader();
          const controls = await reader.decodeFromVideoElement(videoRef.current, (result) => {
            if (result) handleDetectedCode(result.getText());
          });
          scanControlsRef.current = controls;
        } catch (readerErr) {
          /* barcode auto-read unavailable on this browser — manual entry still works */
        }
      } catch (e) {
        setCameraOn(false);
        setCameraError(e && (e.name || e.message) ? `${e.name || ""} ${e.message || ""}`.trim() : "خطأ غير معروف");
      }
    })();
    return () => {
      active = false;
      scanControlsRef.current?.stop?.();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const toggleFlash = async () => {
    const track = streamRef.current?.getVideoTracks?.()[0];
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: !flashOn }] });
      setFlashOn((f) => !f);
    } catch (e) {
      /* not supported on this device */
    }
  };

  const submitCode = (e) => {
    e?.preventDefault();
    const code = manualCode.trim();
    if (!code) return;
    const lower = code.toLowerCase();
    const student = roster.find((s) => s.serial.toLowerCase() === lower || s.serial.toLowerCase().endsWith(lower)) || roster.find((s) => s.name.includes(code));
    if (!student) {
      setFeedback({ ok: false, text: "ما لقيت هذا الاسم أو الرقم بهالمجموعة" });
      setManualCode("");
      setTimeout(() => setFeedback(null), 2200);
    } else {
      scanStudent(student);
    }
  };

  const suggestions = manualCode.trim()
    ? roster.filter((s) => !presentIds.includes(s.id) && (s.name.includes(manualCode.trim()) || s.serial.includes(manualCode.trim()))).slice(0, 5)
    : [];

  const scannedList = roster.filter((s) => presentIds.includes(s.id));

  return (
    <>
      <div className="rounded-2xl overflow-hidden mb-3 relative" style={{ background: INK, aspectRatio: "4/3" }}>
        <video ref={videoRef} autoPlay playsInline muted onLoadedMetadata={(e) => e.target.play().catch(() => {})} className="w-full h-full object-cover" />
        {!cameraOn && (
          <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center gap-2 px-4 text-center" style={{ background: INK }}>
            <ScanLine size={26} color="#fff" opacity={0.6} />
            <p className="text-xs" style={{ color: "#fff", opacity: 0.6, fontFamily: SANS }}>بانتظار إذن الكاميرا…</p>
            {cameraError && (
              <p className="text-xs" style={{ color: "#FCA5A5", fontFamily: SANS }}>{cameraError}</p>
            )}
          </div>
        )}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center pointer-events-none">
          <div style={{ width: "70%", height: 2, background: ACCENT, opacity: 0.85, boxShadow: `0 0 8px ${ACCENT}` }} />
        </div>
        {cameraOn && (
          <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: "rgba(0,0,0,0.4)" }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: ACCENT }} />
            <span className="text-xs" style={{ color: "#fff", fontFamily: SANS }}>يبحث عن باركود…</span>
          </div>
        )}
        {flashSupported && (
          <button onClick={toggleFlash} className="absolute bottom-3 left-3 w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.15)" }} aria-label="فلاش">
            {flashOn ? <Zap size={16} color="#fff" /> : <ZapOff size={16} color="#fff" />}
          </button>
        )}
      </div>

      {feedback && (
        <div className="rounded-xl px-4 py-2.5 mb-3 text-xs" style={{ background: feedback.ok ? ACCENT_SOFT : "#FBEAE8", color: feedback.ok ? ACCENT : DANGER, fontFamily: SANS }}>
          {feedback.text}
        </div>
      )}

      <form onSubmit={submitCode} className="flex gap-2 mb-2">
        <input
          value={manualCode}
          onChange={(e) => setManualCode(e.target.value)}
          placeholder="أو اكتب اسم الطالب أو رقمه التسلسلي"
          className="flex-1 rounded-xl px-4 py-3 text-sm outline-none border"
          style={{ borderColor: BORDER, color: INK, fontFamily: SANS }}
        />
        <button type="submit" className="px-4 rounded-xl text-white text-sm font-semibold" style={{ background: ACCENT }}>تسجيل</button>
      </form>

      {suggestions.length > 0 && (
        <div className="flex flex-col gap-2 mb-4">
          {suggestions.map((s) => (
            <button
              key={s.id}
              onClick={() => scanStudent(s)}
              className="w-full flex items-center justify-between p-3 rounded-xl border text-right"
              style={{ borderColor: BORDER, fontFamily: SANS }}
            >
              <div>
                <p className="text-sm font-medium" style={{ color: INK }}>{s.name}</p>
                <p className="text-xs mt-0.5" style={{ color: INK_MUTED }}>{s.serial}</p>
              </div>
              <span className="text-xs" style={{ color: ACCENT }}>تسجيل حضور</span>
            </button>
          ))}
        </div>
      )}
      <div className="mb-4" />

      <p className="text-xs font-semibold mb-3" style={{ color: INK_MUTED }}>سُجّلوا حاضرين بهذي الجلسة ({scannedList.length}/{roster.length})</p>
      <div className="flex flex-col gap-2.5 mb-6">
        {scannedList.length === 0 && <p className="text-xs" style={{ color: INK_MUTED }}>ما فيه أحد لسه.</p>}
        {scannedList.map((s) => (
          <div key={s.id} className="flex items-center justify-between p-3.5 rounded-2xl border" style={{ borderColor: ACCENT, background: ACCENT_SOFT }}>
            <div>
              <p className="text-sm font-medium" style={{ color: INK }}>{s.name}</p>
              <p className="text-xs mt-0.5" style={{ color: INK_MUTED }}>{s.serial}</p>
            </div>
            <CheckCircle2 size={16} style={{ color: ACCENT }} />
          </div>
        ))}
      </div>

      {roster.length > 0 && <PrimaryButton onClick={onFinish}>تم</PrimaryButton>}
    </>
  );
}

function AttendanceScreen({ store, onBack }) {
  const [teacherId, setTeacherId] = useState("");
  const [groupId, setGroupId] = useState("");
  const [presentIds, setPresentIds] = useState([]);
  const [done, setDone] = useState(false);
  const teacher = store.teachers.find((t) => t.id === teacherId);
  const roster = teacher && groupId ? studentsInGroup(store.students, teacher.subjectId, teacherId, groupId) : [];

  const finish = () => {
    store.addAttendanceRecord({ subjectId: teacher.subjectId, teacherId, groupId, presentIds, allGroupStudentIds: roster.map((s) => s.id) });
    setDone(true);
    setTimeout(() => { setDone(false); setTeacherId(""); setGroupId(""); setPresentIds([]); }, 2200);
  };

  if (done) {
    return (
      <ScreenShell title="تسجيل حضور" onBack={onBack}>
        <SuccessNote>تم حفظ الحضور، وأُرسل إشعار لكل طالب بحالته.</SuccessNote>
      </ScreenShell>
    );
  }

  if (!teacherId) {
    return (
      <ScreenShell title="تسجيل حضور" onBack={onBack}>
        <p className="text-xs font-semibold mb-3" style={{ color: INK_MUTED }}>اختر المدرس</p>
        <TeacherPicker teachers={store.teachers} value={teacherId} onChange={setTeacherId} />
      </ScreenShell>
    );
  }
  if (!groupId) {
    return (
      <ScreenShell title={teacher.name} onBack={() => setTeacherId("")}>
        <p className="text-xs font-semibold mb-3" style={{ color: INK_MUTED }}>اختر المجموعة</p>
        <GroupPicker groups={teacher.groups} value={groupId} onChange={setGroupId} />
      </ScreenShell>
    );
  }
  return (
    <ScreenShell title={`${teacher.name} · ${teacher.groups.find((g) => g.id === groupId)?.name}`} onBack={() => setGroupId("")}>
      <BarcodeScanStep
        roster={roster}
        presentIds={presentIds}
        onScan={(id) => setPresentIds((prev) => [...prev, id])}
        onFinish={finish}
      />
    </ScreenShell>
  );
}

/* ============================== grades ============================== */
function ExamResultsShareScreen({ subjectName, teacherName, groupName, examName, examType, date, time, fullScore, roster, results, instituteName, onBack }) {
  const rows = roster.map((s) => ({ student: s, r: results[s.id] }));

  const shareText = [
    `نتائج ${examName} (${examType}) — ${subjectName}`,
    `${teacherName} · ${groupName} · ${date}${time ? ` · ${time}` : ""}`,
    "",
    ...rows.map(({ student, r }) => `${student.name}: ${r?.status === "طبيعي" ? `${r.score || 0}/${fullScore}` : r?.status || "—"}`),
  ].join("\n");

  const handleShareText = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank");
  };

  return (
    <div dir="rtl" className="min-h-screen px-5 py-6 pb-12" style={{ background: "#FFFFFF", fontFamily: SANS }}>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #exam-report-print, #exam-report-print * { visibility: visible; }
          #exam-report-print { position: fixed; inset: 0; margin: auto; }
        }
      `}</style>
      <button onClick={onBack} className="text-sm mb-6 no-print" style={{ color: ACCENT }}>→ رجوع</button>

      <div id="exam-report-print" className="mx-auto rounded-2xl overflow-hidden border" style={{ maxWidth: 420, borderColor: BORDER }}>
        <div className="flex items-center gap-3 px-5 py-4" style={{ background: ACCENT }}>
          <LogoBadge size={36} />
          <div>
            <p style={{ fontFamily: DISPLAY, fontWeight: 800, color: "#fff", fontSize: 15 }}>{instituteName || "مسار"}</p>
            <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 10 }}>نتائج امتحان · نظام مسار</p>
          </div>
        </div>
        <div className="p-5">
          <div className="mb-5 pb-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
            <p style={{ fontFamily: DISPLAY, fontWeight: 700, color: INK, fontSize: 16 }}>{examName}</p>
            <p style={{ fontSize: 11, color: INK_MUTED, marginTop: 2 }}>{subjectName} · {examType} · {date}{time ? ` · ${time}` : ""}</p>
            <p style={{ fontSize: 11, color: INK_MUTED, marginTop: 2 }}>{teacherName} · {groupName}</p>
          </div>
          <div className="flex flex-col gap-2">
            {rows.map(({ student, r }, i) => (
              <div key={i} className="flex items-center justify-between p-2.5 rounded-lg" style={{ background: SURFACE }}>
                <p style={{ fontSize: 12, color: INK }}>{student.name}</p>
                <p style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 13, color: r?.status === "غش" ? DANGER : ACCENT }}>
                  {r?.status === "طبيعي" ? `${r.score || 0}/${fullScore}` : r?.status || "—"}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="px-5 py-2.5 text-center" style={{ background: SURFACE, borderTop: `1px solid ${BORDER}` }}>
          <p style={{ fontSize: 9, color: INK_MUTED }}>تقرير صادر آلياً من نظام مسار</p>
        </div>
      </div>

      <div className="max-w-[420px] mx-auto mt-6 flex flex-col gap-2.5 no-print">
        <button onClick={() => window.print()} className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white" style={{ background: ACCENT, fontFamily: SANS }}>
          <Printer size={16} /> طباعة / حفظ كـ PDF
        </button>
        <button onClick={handleShareText} className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white" style={{ background: "#25D366", fontFamily: SANS }}>
          <MessageCircle size={16} /> مشاركة النتائج عبر واتساب
        </button>
        <p className="text-xs text-center leading-6" style={{ color: INK_MUTED }}>
          زر واتساب يفتح النتائج كنص جاهز تختار له كروب أولياء الأمور مباشرة. أو احفظ التقرير أعلاه كـ PDF من الزر الأول وأرفقه يدوياً لو حبيت شكل ملف.
        </p>
      </div>
    </div>
  );
}

function AttendanceResultsShareScreen({ subjectName, teacherName, groupName, date, time, students, presentIds, instituteName, onBack }) {
  const rows = students.map((s) => ({ student: s, present: presentIds.includes(s.id) }));
  const presentCount = rows.filter((r) => r.present).length;

  const shareText = [
    `تقرير حضور ${subjectName} — ${teacherName} · ${groupName}`,
    `${date}${time ? ` · ${time}` : ""}`,
    "",
    ...rows.map(({ student, present }) => `${student.name}: ${present ? "حاضر" : "غائب"}`),
  ].join("\n");

  const handleShareText = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank");
  };

  return (
    <div dir="rtl" className="min-h-screen px-5 py-6 pb-12" style={{ background: "#FFFFFF", fontFamily: SANS }}>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #attendance-report-print, #attendance-report-print * { visibility: visible; }
          #attendance-report-print { position: fixed; inset: 0; margin: auto; }
        }
      `}</style>
      <button onClick={onBack} className="text-sm mb-6 no-print" style={{ color: ACCENT }}>→ رجوع</button>

      <div id="attendance-report-print" className="mx-auto rounded-2xl overflow-hidden border" style={{ maxWidth: 420, borderColor: BORDER }}>
        <div className="flex items-center gap-3 px-5 py-4" style={{ background: ACCENT }}>
          <LogoBadge size={36} />
          <div>
            <p style={{ fontFamily: DISPLAY, fontWeight: 800, color: "#fff", fontSize: 15 }}>{instituteName || "مسار"}</p>
            <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 10 }}>تقرير حضور · نظام مسار</p>
          </div>
        </div>
        <div className="p-5">
          <div className="flex items-center justify-between mb-5 pb-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
            <div>
              <p style={{ fontFamily: DISPLAY, fontWeight: 700, color: INK, fontSize: 15 }}>{subjectName}</p>
              <p style={{ fontSize: 11, color: INK_MUTED, marginTop: 2 }}>{teacherName} · {groupName}</p>
            </div>
            <div className="text-left">
              <p style={{ fontSize: 11, color: INK_MUTED }}>{date}</p>
              {time && <p style={{ fontSize: 11, color: INK_MUTED }}>{time}</p>}
            </div>
          </div>
          <p style={{ fontSize: 11, color: ACCENT, marginBottom: 10 }}>{presentCount} حاضر من أصل {rows.length}</p>
          <div className="flex flex-col gap-2">
            {rows.map(({ student, present }, i) => (
              <div key={i} className="flex items-center justify-between p-2.5 rounded-lg" style={{ background: SURFACE }}>
                <p style={{ fontSize: 12, color: INK }}>{student.name}</p>
                <p style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 12, color: present ? ACCENT : DANGER }}>{present ? "حاضر" : "غائب"}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="px-5 py-2.5 text-center" style={{ background: SURFACE, borderTop: `1px solid ${BORDER}` }}>
          <p style={{ fontSize: 9, color: INK_MUTED }}>تقرير صادر آلياً من نظام مسار</p>
        </div>
      </div>

      <div className="max-w-[420px] mx-auto mt-6 flex flex-col gap-2.5 no-print">
        <button onClick={() => window.print()} className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white" style={{ background: ACCENT, fontFamily: SANS }}>
          <Printer size={16} /> طباعة / حفظ كـ PDF
        </button>
        <button onClick={handleShareText} className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white" style={{ background: "#25D366", fontFamily: SANS }}>
          <MessageCircle size={16} /> مشاركة عبر واتساب
        </button>
      </div>
    </div>
  );
}

function GradesScreen({ store, onBack }) {
  const [teacherId, setTeacherId] = useState("");
  const [groupId, setGroupId] = useState("");
  const [examName, setExamName] = useState("");
  const [examType, setExamType] = useState("يومي");
  const [date, setDate] = useState(today());
  const [passScore, setPassScore] = useState("");
  const [fullScore, setFullScore] = useState("");
  const [examConfirmed, setExamConfirmed] = useState(false);
  const [results, setResults] = useState({});
  const [query, setQuery] = useState("");
  const [done, setDone] = useState(false);
  const [showShare, setShowShare] = useState(false);

  const teacher = store.teachers.find((t) => t.id === teacherId);
  const roster = teacher && groupId ? studentsInGroup(store.students, teacher.subjectId, teacherId, groupId) : [];
  const filtered = roster.filter((s) => s.name.includes(query) || s.serial.includes(query));

  const setStatus = (id, status) => setResults((prev) => ({ ...prev, [id]: { status, score: status === "طبيعي" ? prev[id]?.score || "" : "" } }));
  const setScore = (id, score) => setResults((prev) => ({ ...prev, [id]: { ...prev[id], score } }));

  const finish = () => {
    store.addGradeRecord({ subjectId: teacher.subjectId, teacherId, groupId, examName, examType, date, passScore, fullScore, results });
    setDone(true);
  };

  const resetAll = () => {
    setDone(false); setShowShare(false); setTeacherId(""); setGroupId(""); setExamConfirmed(false); setExamName(""); setResults({});
  };

  if (done) {
    if (showShare) {
      const subj = getSubject(teacher.subjectId);
      const groupName = teacher.groups.find((g) => g.id === groupId)?.name || "";
      return (
        <ExamResultsShareScreen
          subjectName={subj.name}
          teacherName={teacher.name}
          groupName={groupName}
          examName={examName}
          examType={examType}
          date={date}
          fullScore={fullScore}
          roster={roster}
          results={results}
          instituteName={store.instituteName}
          onBack={() => setShowShare(false)}
        />
      );
    }
    return (
      <ScreenShell title="تسجيل درجات" onBack={resetAll}>
        <SuccessNote>تم حفظ درجات «{examName}».</SuccessNote>
        <div className="flex flex-col gap-2.5">
          <button
            onClick={() => setShowShare(true)}
            className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white"
            style={{ background: "#25D366", fontFamily: SANS }}
          >
            <MessageCircle size={16} /> مشاركة النتائج
          </button>
          <button onClick={resetAll} className="text-sm" style={{ color: ACCENT, fontFamily: SANS }}>تسجيل امتحان آخر</button>
        </div>
      </ScreenShell>
    );
  }

  if (!teacherId) {
    return (
      <ScreenShell title="تسجيل درجات" onBack={onBack}>
        <p className="text-xs font-semibold mb-3" style={{ color: INK_MUTED }}>اختر المدرس</p>
        <TeacherPicker teachers={store.teachers} value={teacherId} onChange={setTeacherId} />
      </ScreenShell>
    );
  }
  if (!groupId) {
    return (
      <ScreenShell title={teacher.name} onBack={() => setTeacherId("")}>
        <p className="text-xs font-semibold mb-3" style={{ color: INK_MUTED }}>اختر المجموعة</p>
        <GroupPicker groups={teacher.groups} value={groupId} onChange={setGroupId} />
      </ScreenShell>
    );
  }
  if (!examConfirmed) {
    return (
      <ScreenShell title="بيانات الامتحان" onBack={() => setGroupId("")}>
        <Field label="اسم الامتحان"><TextInput value={examName} onChange={(e) => setExamName(e.target.value)} placeholder="مثال: امتحان تراكمي 2" /></Field>
        <Field label="نوع الامتحان">
          <Select value={examType} onChange={(e) => setExamType(e.target.value)}>
            <option value="يومي">يومي</option>
            <option value="تراكمي">تراكمي</option>
            <option value="فاينل">فاينل</option>
          </Select>
        </Field>
        <Field label="التاريخ"><TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="درجة النجاح"><TextInput type="number" value={passScore} onChange={(e) => setPassScore(e.target.value)} placeholder="مثال: 15" /></Field>
          <Field label="الدرجة الكاملة"><TextInput type="number" value={fullScore} onChange={(e) => setFullScore(e.target.value)} placeholder="مثال: 30" /></Field>
        </div>
        <PrimaryButton
          disabled={!examName.trim() || !fullScore}
          onClick={() => {
            setResults((prev) => {
              const next = { ...prev };
              roster.forEach((s) => {
                if (!next[s.id]) next[s.id] = { status: "طبيعي", score: "" };
              });
              return next;
            });
            setExamConfirmed(true);
          }}
        >
          متابعة لقائمة الطلاب
        </PrimaryButton>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell title={examName} onBack={() => setExamConfirmed(false)}>
      <div className="relative mb-5">
        <Search size={16} style={{ color: INK_MUTED, position: "absolute", right: 14, top: 14 }} />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث باسم الطالب أو رقمه"
          className="w-full rounded-xl pr-11 pl-4 py-3 text-sm outline-none border" style={{ borderColor: BORDER, color: INK }} />
      </div>
      <div className="flex flex-col gap-3 mb-6">
        {filtered.map((s) => {
          const r = results[s.id];
          return (
            <div key={s.id} className="p-3.5 rounded-2xl border" style={{ borderColor: BORDER }}>
              <p className="text-sm font-medium mb-2.5" style={{ color: INK }}>{s.name}</p>
              <div className="flex flex-wrap gap-2 mb-2">
                {["طبيعي", "غش", "مجاز", "غائب"].map((st) => (
                  <Chip key={st} active={r?.status === st} onClick={() => setStatus(s.id, st)}>{st}</Chip>
                ))}
              </div>
              {r?.status === "طبيعي" && (
                <input type="number" placeholder={`الدرجة من ${fullScore || "؟"}`} value={r.score} onChange={(e) => setScore(s.id, e.target.value)}
                  className="w-full mt-1 rounded-xl px-3 py-2.5 text-sm outline-none border" style={{ borderColor: BORDER, color: INK }} />
              )}
            </div>
          );
        })}
      </div>
      <PrimaryButton onClick={finish}>تم</PrimaryButton>
    </ScreenShell>
  );
}

/* ============================== installments ============================== */
function InstallmentsScreen({ store, onBack }) {
  const [query, setQuery] = useState("");
  const [studentId, setStudentId] = useState("");
  const [amountNumber, setAmountNumber] = useState("");
  const [amountText, setAmountText] = useState("");
  const [remaining, setRemaining] = useState("");
  const [note, setNote] = useState("");
  const [accountant, setAccountant] = useState("");
  const [done, setDone] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const student = store.students.find((s) => s.id === studentId);
  const results = query ? store.students.filter((s) => s.name.includes(query) || s.serial.includes(query)) : [];
  const history = store.installments.filter((i) => i.studentId === studentId);

  const submit = (e) => {
    e.preventDefault();
    if (!studentId || !amountNumber) return;
    store.addInstallment({ studentId, amountNumber, amountText, remaining, note, accountant });
    setAmountNumber(""); setAmountText(""); setRemaining(""); setNote("");
    setDone(true);
    setTimeout(() => setDone(false), 2000);
  };

  return (
    <ScreenShell title="الأقساط" onBack={onBack}>
      {!studentId ? (
        <>
          <div className="relative mb-4">
            <Search size={16} style={{ color: INK_MUTED, position: "absolute", right: 14, top: 14 }} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث باسم الطالب أو رقمه التسلسلي"
              className="w-full rounded-xl pr-11 pl-4 py-3 text-sm outline-none border" style={{ borderColor: BORDER, color: INK }} />
          </div>
          <div className="flex flex-col gap-2.5">
            {results.map((s) => (
              <button key={s.id} onClick={() => setStudentId(s.id)} className="w-full flex items-center justify-between p-3.5 rounded-2xl border text-right" style={{ borderColor: BORDER }}>
                <div>
                  <p className="text-sm font-medium" style={{ color: INK }}>{s.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: INK_MUTED }}>{s.serial}</p>
                </div>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          {done && <SuccessNote>تم حفظ قسيمة الدفع.</SuccessNote>}
          <div className="flex items-center justify-between p-3.5 rounded-2xl mb-5" style={{ background: ACCENT_SOFT }}>
            <div>
              <p className="text-sm font-medium" style={{ color: INK }}>{student.name}</p>
              <p className="text-xs mt-0.5" style={{ color: INK_MUTED }}>{student.serial}</p>
            </div>
            <button onClick={() => setStudentId("")} className="text-xs" style={{ color: ACCENT }}>تغيير</button>
          </div>

          <p className="text-xs font-semibold mb-2.5" style={{ color: INK_MUTED }}>المواد المسجل بها</p>
          <div className="flex flex-wrap gap-2 mb-5">
            {SUBJECTS.map((subj) => {
              const enrolled = Boolean(student.enrollments[subj.id]);
              return (
                <span key={subj.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border" style={{ borderColor: enrolled ? ACCENT : BORDER, color: enrolled ? ACCENT : INK_MUTED, background: enrolled ? ACCENT_SOFT : "#fff" }}>
                  {enrolled && <Check size={12} />}{subj.name}
                </span>
              );
            })}
          </div>

          <form onSubmit={submit}>
            <div className="grid grid-cols-2 gap-3">
              <Field label="المبلغ (رقم)"><TextInput type="number" value={amountNumber} onChange={(e) => setAmountNumber(e.target.value)} placeholder="50000" required /></Field>
              <Field label="المبلغ (كتابة)"><TextInput value={amountText} onChange={(e) => setAmountText(e.target.value)} placeholder="خمسون ألف دينار" /></Field>
            </div>
            <Field label="المبلغ المتبقي"><TextInput value={remaining} onChange={(e) => setRemaining(e.target.value)} placeholder="مثال: 100000" /></Field>
            <Field label="اسم المحاسب"><TextInput value={accountant} onChange={(e) => setAccountant(e.target.value)} placeholder="اسم من استلم الدفعة" /></Field>
            <Field label="ملاحظات">
              <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="اختياري" rows={2}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none border resize-none" style={{ borderColor: BORDER, color: INK }} />
            </Field>
            <PrimaryButton type="submit">حفظ القسيمة</PrimaryButton>
          </form>

          {history.length > 0 && (
            <>
              <p className="text-xs font-semibold mt-8 mb-3" style={{ color: INK_MUTED }}>سجل القسائم</p>
              <div className="flex flex-col gap-2.5">
                {history.map((h) => (
                  <div key={h.id} className="p-3.5 rounded-2xl border" style={{ borderColor: BORDER }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-sm font-medium" style={{ color: INK }}>{Number(h.amountNumber).toLocaleString("ar")} د.ع</p>
                      <button onClick={() => setConfirmDeleteId(confirmDeleteId === h.id ? null : h.id)} style={{ color: DANGER }} aria-label="حذف">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <p className="text-xs" style={{ color: INK_MUTED }}>{h.date} · متبقي {h.remaining || "—"}</p>
                    {h.accountant && <p className="text-xs mt-1" style={{ color: INK_MUTED }}>المحاسب: {h.accountant}</p>}
                    {h.note && <p className="text-xs mt-1" style={{ color: INK }}>{h.note}</p>}
                    {confirmDeleteId === h.id && (
                      <div className="flex gap-2 mt-3">
                        <button onClick={() => setConfirmDeleteId(null)} className="flex-1 rounded-lg py-2 text-xs font-semibold border" style={{ borderColor: BORDER, color: INK }}>إلغاء</button>
                        <button
                          onClick={() => { store.deleteInstallment(h.id); setConfirmDeleteId(null); }}
                          className="flex-1 rounded-lg py-2 text-xs font-semibold text-white"
                          style={{ background: DANGER }}
                        >
                          تأكيد الحذف
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </ScreenShell>
  );
}

/* ============================== archive ============================== */
function StudentExamsTab({ store, studentId, subjectId, teacherId, groupId }) {
  const [mcqExams, setMcqExams] = useState(null);
  const [photoExams, setPhotoExams] = useState(null);
  const [takingExamId, setTakingExamId] = useState(null);
  const [viewingPhotoExam, setViewingPhotoExam] = useState(null);

  const reload = () => {
    dbFetchMcqExams(store.instituteId).then((all) => setMcqExams(all.filter((e) => e.teacherId === teacherId && e.groupId === groupId)));
    dbFetchPhotoExams(store.instituteId).then((all) => setPhotoExams(all.filter((e) => e.teacherId === teacherId && e.groupId === groupId)));
  };
  useEffect(() => { reload(); }, [teacherId, groupId]);

  if (takingExamId) {
    return <McqTakeScreen store={store} studentId={studentId} examId={takingExamId} onBack={() => { setTakingExamId(null); reload(); }} />;
  }
  if (viewingPhotoExam) {
    return <PhotoExamStudentScreen store={store} studentId={studentId} exam={viewingPhotoExam} onBack={() => { setViewingPhotoExam(null); reload(); }} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs font-semibold mb-3" style={{ color: INK_MUTED }}>امتحانات MCQ</p>
        {mcqExams === null && <p className="text-xs" style={{ color: INK_MUTED }}>جارِ التحميل…</p>}
        {mcqExams && mcqExams.length === 0 && <p className="text-xs" style={{ color: INK_MUTED }}>ما فيه امتحانات MCQ حالياً.</p>}
        <div className="flex flex-col gap-2.5">
          {mcqExams && mcqExams.map((e) => (
            <button key={e.id} onClick={() => setTakingExamId(e.id)} className="w-full flex items-center justify-between p-3.5 rounded-2xl border text-right" style={{ borderColor: BORDER }}>
              <div>
                <p className="text-sm font-medium" style={{ color: INK }}>{e.title}</p>
                <p className="text-xs mt-0.5" style={{ color: INK_MUTED }}>{e.questionCount} سؤال · {e.timeLimitMinutes} دقيقة</p>
              </div>
              <ChevronLeft size={16} style={{ color: INK_MUTED }} />
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold mb-3" style={{ color: INK_MUTED }}>امتحانات بالصورة</p>
        {photoExams === null && <p className="text-xs" style={{ color: INK_MUTED }}>جارِ التحميل…</p>}
        {photoExams && photoExams.length === 0 && <p className="text-xs" style={{ color: INK_MUTED }}>ما فيه امتحانات بالصورة حالياً.</p>}
        <div className="flex flex-col gap-2.5">
          {photoExams && photoExams.map((e) => (
            <button key={e.id} onClick={() => setViewingPhotoExam(e)} className="w-full flex items-center gap-3 p-3.5 rounded-2xl border text-right" style={{ borderColor: BORDER }}>
              <img src={e.examImageUrl} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" style={{ background: SURFACE }} />
              <div className="flex-1"><p className="text-sm font-medium" style={{ color: INK }}>{e.title}</p></div>
              <ChevronLeft size={16} style={{ color: INK_MUTED }} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function McqTakeScreen({ store, studentId, examId, onBack }) {
  const [exam, setExam] = useState(null);
  const [answers, setAnswers] = useState({});
  const [secondsLeft, setSecondsLeft] = useState(null);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    dbFetchMcqExamForStudent(examId, studentId).then((data) => {
      setExam(data);
      if (data.submission) setResult(data.submission);
      else setSecondsLeft(data.timeLimitMinutes * 60);
    });
  }, [examId, studentId]);

  const submit = React.useCallback(async () => {
    if (submitting || result) return;
    setSubmitting(true);
    try {
      const r = await dbSubmitMcqAnswers(store.instituteId, examId, studentId, answers);
      setResult(r);
    } finally {
      setSubmitting(false);
    }
  }, [submitting, result, store.instituteId, examId, studentId, answers]);

  useEffect(() => {
    if (secondsLeft === null || result) return;
    if (secondsLeft <= 0) {
      submit();
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft, result, submit]);

  if (!exam) {
    return (
      <div dir="rtl" className="min-h-screen flex items-center justify-center" style={{ background: "#FFFFFF" }}>
        <p className="text-sm" style={{ color: INK_MUTED, fontFamily: SANS }}>جارِ التحميل…</p>
      </div>
    );
  }

  if (result) {
    return (
      <div dir="rtl" className="min-h-screen px-5 py-10 flex flex-col items-center justify-center text-center" style={{ background: "#FFFFFF", fontFamily: SANS }}>
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: ACCENT_SOFT }}>
          <CheckCircle2 size={30} style={{ color: ACCENT }} />
        </div>
        <p className="text-sm mb-1" style={{ color: INK_MUTED }}>{exam.title}</p>
        <p className="text-2xl mb-6" style={{ fontFamily: DISPLAY, fontWeight: 800, color: INK }}>{result.score}/{result.total}</p>
        <button onClick={onBack} className="rounded-xl px-6 py-3 text-sm font-semibold text-white" style={{ background: ACCENT }}>رجوع</button>
      </div>
    );
  }

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  return (
    <div dir="rtl" className="min-h-screen px-5 py-6 pb-24" style={{ background: "#FFFFFF", fontFamily: SANS }}>
      <div className="flex items-center justify-between mb-6 sticky top-0 py-2" style={{ background: "#FFFFFF" }}>
        <p className="text-sm font-semibold" style={{ color: INK }}>{exam.title}</p>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: secondsLeft < 60 ? "#FBEAE8" : ACCENT_SOFT }}>
          <Clock size={14} style={{ color: secondsLeft < 60 ? DANGER : ACCENT }} />
          <span className="text-xs font-semibold" style={{ color: secondsLeft < 60 ? DANGER : ACCENT }}>
            {minutes}:{String(seconds).padStart(2, "0")}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-5">
        {exam.questions.map((q, qi) => (
          <div key={q.id} className="p-3.5 rounded-2xl border" style={{ borderColor: BORDER }}>
            <p className="text-sm font-medium mb-3" style={{ color: INK }}>{qi + 1}. {q.text}</p>
            <div className="flex flex-col gap-2">
              {q.options.map((opt, oi) => (
                <button
                  key={oi}
                  type="button"
                  onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: oi }))}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl border text-right"
                  style={{ borderColor: answers[q.id] === oi ? ACCENT : BORDER, background: answers[q.id] === oi ? ACCENT_SOFT : "#fff" }}
                >
                  <span
                    className="w-4 h-4 rounded-full flex-shrink-0 border"
                    style={{ borderColor: answers[q.id] === oi ? ACCENT : BORDER, background: answers[q.id] === oi ? ACCENT : "#fff" }}
                  />
                  <span className="text-sm" style={{ color: INK }}>{opt}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="fixed bottom-0 inset-x-0 p-4" style={{ background: "#FFFFFF", borderTop: `1px solid ${BORDER}` }}>
        <button onClick={submit} disabled={submitting} className="w-full rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-40" style={{ background: ACCENT }}>
          {submitting ? "جارِ التسليم…" : "تسليم الامتحان"}
        </button>
      </div>
    </div>
  );
}

function PhotoExamStudentScreen({ store, studentId, exam, onBack }) {
  const [submission, setSubmission] = useState(undefined); // undefined = جارِ التحميل
  const [uploading, setUploading] = useState(false);

  const reload = () => dbFetchPhotoExamSubmissionForStudent(exam.id, studentId).then(setSubmission);
  useEffect(() => { reload(); }, [exam.id, studentId]);

  const handleUpload = (file) => {
    setUploading(true);
    compressImageFile(file, 1000, 0.8)
      .then((blob) => dbSubmitPhotoAnswer(store.instituteId, exam.id, studentId, blob))
      .then(reload)
      .finally(() => setUploading(false));
  };

  return (
    <ScreenShell title={exam.title} onBack={onBack}>
      <p className="text-xs font-semibold mb-2.5" style={{ color: INK_MUTED }}>ورقة الأسئلة</p>
      <img src={exam.examImageUrl} alt="" className="w-full rounded-2xl mb-6" style={{ background: SURFACE }} />

      {submission === undefined ? (
        <p className="text-xs" style={{ color: INK_MUTED }}>جارِ التحميل…</p>
      ) : submission?.correctedImageUrl ? (
        <>
          <p className="text-xs font-semibold mb-2.5" style={{ color: ACCENT }}>ورقتك مصححة ✓</p>
          <img src={submission.correctedImageUrl} alt="" className="w-full rounded-2xl" style={{ background: SURFACE }} />
        </>
      ) : submission?.answerImageUrl ? (
        <div className="p-3.5 rounded-2xl" style={{ background: ACCENT_SOFT }}>
          <p className="text-xs" style={{ color: ACCENT }}>تم رفع ورقتك، بانتظار تصحيح المدرس.</p>
        </div>
      ) : (
        <label className="block cursor-pointer">
          <div className="rounded-2xl border-2 border-dashed flex flex-col items-center justify-center py-8" style={{ borderColor: BORDER }}>
            <Camera size={22} style={{ color: INK_MUTED }} />
            <p className="text-xs mt-2" style={{ color: INK_MUTED }}>{uploading ? "جارِ الرفع…" : "اضغط لرفع صورة إجابتك"}</p>
          </div>
          <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
        </label>
      )}
    </ScreenShell>
  );
}

function SubjectRecordView({ subject, records, editable, store, studentId, subjectId, teacherId, teacherName, groupId }) {
  const [tab, setTab] = useState("grades");
  const tabs = [{ id: "grades", label: "الدرجات" }, { id: "attendance", label: "الحضور" }];
  if (!editable) tabs.push({ id: "exams", label: "الامتحانات" }, { id: "ask", label: "اسأل الأستاذ" });
  return (
    <>
      <div className="flex p-1 rounded-xl mb-5" style={{ background: SURFACE }}>
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className="flex-1 text-xs py-2.5 rounded-lg font-medium transition-colors"
            style={{ background: tab === t.id ? "#fff" : "transparent", color: tab === t.id ? INK : INK_MUTED, boxShadow: tab === t.id ? "0 1px 2px rgba(22,33,29,0.08)" : "none" }}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === "ask" ? (
        <ConversationThreadScreen
          embedded
          title={`اسأل ${teacherName}`}
          fetchMessages={() => dbFetchConversation(teacherId, studentId)}
          onSend={(text) => dbSendMessageAsStudent(store.instituteId, teacherId, studentId, text)}
          selfSender="student"
        />
      ) : tab === "exams" ? (
        <StudentExamsTab store={store} studentId={studentId} subjectId={subjectId} teacherId={teacherId} groupId={groupId} />
      ) : tab === "grades" ? (
        <div className="flex flex-col gap-2.5">
          {records.grades.length === 0 && <p className="text-xs" style={{ color: INK_MUTED }}>ما فيه درجات مسجلة بعد.</p>}
          {records.grades.map((g, i) =>
            editable ? (
              <div key={i} className="p-3.5 rounded-2xl border" style={{ borderColor: BORDER }}>
                <div className="flex items-center justify-between mb-2.5">
                  <p className="text-sm font-medium" style={{ color: INK }}>{g.examName}</p>
                  <p className="text-xs" style={{ color: INK_MUTED }}>{g.examType} · {g.date}</p>
                </div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {["طبيعي", "غش", "مجاز", "غائب"].map((st) => (
                    <Chip key={st} active={g.status === st} onClick={() => store.updateGradeResult(g.recordId, studentId, { status: st, score: st === "طبيعي" ? g.score : "" })}>{st}</Chip>
                  ))}
                </div>
                {g.status === "طبيعي" && (
                  <input type="number" placeholder={`الدرجة من ${g.fullScore || "؟"}`} value={g.score || ""}
                    onChange={(e) => store.updateGradeResult(g.recordId, studentId, { status: g.status, score: e.target.value })}
                    className="w-full rounded-xl px-3 py-2.5 text-sm outline-none border" style={{ borderColor: BORDER, color: INK }} />
                )}
              </div>
            ) : (
              <div key={i} className="flex items-center justify-between p-3.5 rounded-2xl border" style={{ borderColor: BORDER }}>
                <div>
                  <p className="text-sm font-medium" style={{ color: INK }}>{g.examName}</p>
                  <p className="text-xs mt-0.5" style={{ color: INK_MUTED }}>{g.examType} · {g.date}</p>
                </div>
                <p className="text-sm" style={{ fontFamily: DISPLAY, fontWeight: 700, color: g.status === "غش" ? DANGER : ACCENT }}>
                  {g.status === "طبيعي" ? `${g.score || 0}/${g.fullScore}` : g.status}
                </p>
              </div>
            )
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {records.attendance.length === 0 && <p className="text-xs" style={{ color: INK_MUTED }}>ما فيه سجل حضور بعد.</p>}
          {records.attendance.map((a, i) => (
            <div key={i} className="flex items-center justify-between p-3.5 rounded-2xl border" style={{ borderColor: BORDER }}>
              <p className="text-sm" style={{ color: INK }}>{a.date}</p>
              {editable ? (
                <button
                  onClick={() => store.updateAttendanceEntry(a.recordId, studentId, !a.present)}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
                  style={{ background: a.present ? ACCENT_SOFT : "#FBEAE8", color: a.present ? ACCENT : DANGER }}
                >
                  {a.present ? <><CheckCircle2 size={14} /> حاضر</> : <><XCircle size={14} /> غائب</>}
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  {a.present ? <><span className="text-xs" style={{ color: ACCENT }}>حاضر</span><CheckCircle2 size={16} style={{ color: ACCENT }} /></>
                    : <><span className="text-xs" style={{ color: DANGER }}>غائب</span><XCircle size={16} style={{ color: DANGER }} /></>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
function studentSubjectRecords(store, student, subjectId) {
  const grades = store.gradeRecords
    .filter((r) => r.subjectId === subjectId && r.results[student.id])
    .map((r) => ({ recordId: r.id, examName: r.examName, examType: r.examType, date: r.date, fullScore: r.fullScore, ...r.results[student.id] }));
  const attendance = store.attendanceRecords
    .filter((r) => r.subjectId === subjectId && r.allGroupStudentIds.includes(student.id))
    .map((r) => ({ recordId: r.id, date: r.date, present: r.presentIds.includes(student.id) }));
  return { grades, attendance };
}
/* ============================== backup ============================== */
function BackupScreen({ store, onBack }) {
  const handleDownloadJSON = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      teachers: store.teachers,
      students: store.students,
      gradeRecords: store.gradeRecords,
      attendanceRecords: store.attendanceRecords,
      installments: store.installments,
      notifications: store.notifications,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `masar-backup-${today()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadInstallmentsCSV = () => {
    const header = ["الرقم التسلسلي", "اسم الطالب", "المبلغ (رقم)", "المبلغ (كتابة)", "المبلغ المتبقي", "اسم المحاسب", "ملاحظات", "التاريخ"];
    const rows = store.installments.map((i) => {
      const student = store.students.find((s) => s.id === i.studentId);
      return [
        student?.serial || "",
        student?.name || "",
        i.amountNumber || "",
        i.amountText || "",
        i.remaining || "",
        i.accountant || "",
        (i.note || "").replace(/[\r\n,]/g, " "),
        i.date || "",
      ];
    });
    const csv = "\uFEFF" + [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `masar-installments-${today()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const totalCollected = store.installments.reduce((sum, i) => sum + (Number(i.amountNumber) || 0), 0);

  return (
    <ScreenShell title="نسخة احتياطية" onBack={onBack}>
      <div className="rounded-2xl p-4 mb-6" style={{ background: ACCENT_SOFT }}>
        <p className="text-xs" style={{ color: ACCENT }}>إجمالي المبالغ المسجلة بكل القسائم</p>
        <p className="text-2xl mt-1" style={{ fontFamily: DISPLAY, fontWeight: 800, color: ACCENT }}>{totalCollected.toLocaleString("ar")} د.ع</p>
        <p className="text-xs mt-1" style={{ color: INK_MUTED }}>من {store.installments.length} قسيمة دفع</p>
      </div>

      <p className="text-xs font-semibold mb-2.5" style={{ color: INK_MUTED }}>سجل الأقساط (Excel)</p>
      <p className="text-xs mb-3 leading-6" style={{ color: INK_MUTED }}>
        ملف جدول يفتح مباشرة بـ Excel أو Google Sheets، فيه كل قسيمة دفع مسجلة: اسم الطالب، المبلغ، المتبقي، والتاريخ.
      </p>
      <button
        onClick={handleDownloadInstallmentsCSV}
        disabled={store.installments.length === 0}
        className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-40 mb-8"
        style={{ background: ACCENT, fontFamily: SANS }}
      >
        <FileDown size={16} /> تنزيل سجل الأقساط (Excel)
      </button>

      <p className="text-xs font-semibold mb-2.5" style={{ color: INK_MUTED }}>نسخة كاملة (كل البيانات)</p>
      <p className="text-xs mb-3 leading-6" style={{ color: INK_MUTED }}>
        يحمّل ملف يحتوي كل بيانات المعهد (المدرسين، الطلاب، الدرجات، الحضور، الأقساط، الإشعارات) بصيغة JSON — احتفظ فيه بمكان آمن كنسخة احتياطية دورية.
      </p>
      <button
        onClick={handleDownloadJSON}
        className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold border"
        style={{ borderColor: ACCENT, color: ACCENT, fontFamily: SANS }}
      >
        <Download size={16} /> تنزيل نسخة احتياطية كاملة
      </button>

      <div className="mt-8 rounded-2xl p-4 border" style={{ borderColor: BORDER }}>
        <p className="text-xs font-semibold mb-3" style={{ color: INK_MUTED }}>ملخص البيانات الحالية</p>
        <div className="grid grid-cols-2 gap-3">
          <p className="text-xs" style={{ color: INK }}>{store.students.length} طالب</p>
          <p className="text-xs" style={{ color: INK }}>{store.teachers.length} مدرس</p>
          <p className="text-xs" style={{ color: INK }}>{store.gradeRecords.length} سجل درجات</p>
          <p className="text-xs" style={{ color: INK }}>{store.attendanceRecords.length} سجل حضور</p>
          <p className="text-xs" style={{ color: INK }}>{store.installments.length} قسيمة دفع</p>
          <p className="text-xs" style={{ color: INK }}>{store.notifications.length} إشعار</p>
        </div>
      </div>
    </ScreenShell>
  );
}

/* ============================== student report ============================== */
function ReportScreen({ store, student, onBack }) {
  const enrolledSubjects = Object.keys(student.enrollments).map(getSubject);
  const [subjectId, setSubjectId] = useState(enrolledSubjects[0]?.id || "");
  const [month, setMonth] = useState(() => today().slice(0, 7));
  const [generated, setGenerated] = useState(false);

  if (!generated) {
    return (
      <ScreenShell title="تصدير تقرير" onBack={onBack}>
        {enrolledSubjects.length === 0 ? (
          <p className="text-xs" style={{ color: INK_MUTED }}>الطالب غير مسجل بأي مادة بعد.</p>
        ) : (
          <>
            <Field label="المادة">
              <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
                {enrolledSubjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </Field>
            <Field label="الشهر">
              <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none border" style={{ borderColor: BORDER, color: INK, fontFamily: SANS }} />
            </Field>
            <PrimaryButton disabled={!subjectId} onClick={() => setGenerated(true)}>إنشاء التقرير</PrimaryButton>
          </>
        )}
      </ScreenShell>
    );
  }

  const subj = getSubject(subjectId);
  const enrollment = student.enrollments[subjectId];
  const teacher = store.teachers.find((t) => t.id === enrollment.teacherId);

  const grades = store.gradeRecords.filter((r) => r.subjectId === subjectId && r.results[student.id] && (r.date || "").startsWith(month));
  const attendance = store.attendanceRecords.filter((r) => r.subjectId === subjectId && r.allGroupStudentIds.includes(student.id) && (r.date || "").startsWith(month));
  const presentCount = attendance.filter((r) => r.presentIds.includes(student.id)).length;
  const absentCount = attendance.length - presentCount;

  const shareText = `تقرير أداء ${student.name} — ${subj.name} — ${month}\n${store.instituteName || "مسار"} · نظام مسار`;
  const handleShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: "تقرير أداء الطالب", text: shareText }); } catch (e) {}
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank");
    }
  };

  return (
    <div dir="rtl" className="min-h-screen px-5 py-6 pb-12" style={{ background: "#FFFFFF", fontFamily: SANS }}>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #report-print, #report-print * { visibility: visible; }
          #report-print { position: fixed; inset: 0; margin: auto; }
        }
      `}</style>
      <button onClick={() => setGenerated(false)} className="text-sm mb-6" style={{ color: ACCENT }}>→ رجوع</button>

      <div id="report-print" className="mx-auto rounded-2xl overflow-hidden border" style={{ maxWidth: 420, borderColor: BORDER }}>
        <div className="flex items-center gap-3 px-5 py-4" style={{ background: ACCENT }}>
          <LogoBadge size={36} />
          <div>
            <p style={{ fontFamily: DISPLAY, fontWeight: 800, color: "#fff", fontSize: 15 }}>{store.instituteName || "مسار"}</p>
            <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 10 }}>تقرير أداء الطالب · نظام مسار</p>
          </div>
        </div>

        <div className="p-5">
          <div className="flex items-center justify-between mb-5 pb-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
            <div>
              <p style={{ fontFamily: DISPLAY, fontWeight: 700, color: INK, fontSize: 16 }}>{student.name}</p>
              <p style={{ fontSize: 11, color: INK_MUTED, marginTop: 2 }}>{student.serial} · {subj.name} · {teacher?.name}</p>
            </div>
            <p style={{ fontSize: 11, color: INK_MUTED }}>{month}</p>
          </div>

          <p style={{ fontSize: 12, fontWeight: 700, color: INK, marginBottom: 10 }}>الدرجات</p>
          {grades.length === 0 && <p style={{ fontSize: 11, color: INK_MUTED, marginBottom: 16 }}>ما فيه درجات مسجلة هذا الشهر.</p>}
          <div className="flex flex-col gap-2 mb-6">
            {grades.map((g, i) => {
              const r = g.results[student.id];
              return (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-lg" style={{ background: SURFACE }}>
                  <div>
                    <p style={{ fontSize: 12, color: INK }}>{g.examName}</p>
                    <p style={{ fontSize: 10, color: INK_MUTED }}>{g.examType} · {g.date}</p>
                  </div>
                  <p style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 13, color: r.status === "غش" ? DANGER : ACCENT }}>
                    {r.status === "طبيعي" ? `${r.score || 0}/${g.fullScore}` : r.status}
                  </p>
                </div>
              );
            })}
          </div>

          <p style={{ fontSize: 12, fontWeight: 700, color: INK, marginBottom: 10 }}>الحضور</p>
          {attendance.length === 0 ? (
            <p style={{ fontSize: 11, color: INK_MUTED }}>ما فيه سجل حضور هذا الشهر.</p>
          ) : (
            <div className="flex gap-3">
              <div className="flex-1 rounded-lg p-3 text-center" style={{ background: ACCENT_SOFT }}>
                <p style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 18, color: ACCENT }}>{presentCount}</p>
                <p style={{ fontSize: 10, color: INK_MUTED }}>يوم حضور</p>
              </div>
              <div className="flex-1 rounded-lg p-3 text-center" style={{ background: "#FBEAE8" }}>
                <p style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 18, color: DANGER }}>{absentCount}</p>
                <p style={{ fontSize: 10, color: INK_MUTED }}>يوم غياب</p>
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-2.5 text-center" style={{ background: SURFACE, borderTop: `1px solid ${BORDER}` }}>
          <p style={{ fontSize: 9, color: INK_MUTED }}>تقرير صادر آلياً من نظام مسار</p>
        </div>
      </div>

      <div className="max-w-[420px] mx-auto mt-6 flex flex-col gap-2.5">
        <button onClick={() => window.print()} className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white" style={{ background: ACCENT, fontFamily: SANS }}>
          <Printer size={16} /> طباعة / حفظ كـ PDF
        </button>
        <button onClick={handleShare} className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white" style={{ background: "#25D366", fontFamily: SANS }}>
          <MessageCircle size={16} /> مشاركة عبر واتساب
        </button>
        <p className="text-xs text-center leading-6" style={{ color: INK_MUTED }}>
          احفظ التقرير كـ PDF أولاً من الزر الأول، وبعدها اضغط «مشاركة عبر واتساب» وأرفق الملف المحفوظ من قائمة المشاركة.
        </p>
      </div>
    </div>
  );
}

function EnrollmentEditor({ store, student, subj }) {
  const enrollment = student.enrollments[subj.id];
  const teachersForSubject = store.teachers.filter((t) => t.subjectId === subj.id);
  const currentTeacher = teachersForSubject.find((t) => t.id === enrollment?.teacherId);
  const Icon = subj.icon;

  const handleTeacherChange = (teacherId) => {
    if (!teacherId) { store.updateEnrollment(student.id, subj.id, null, null); return; }
    const t = teachersForSubject.find((tt) => tt.id === teacherId);
    store.updateEnrollment(student.id, subj.id, teacherId, t.groups[0]?.id || "");
  };
  const handleGroupChange = (groupId) => {
    store.updateEnrollment(student.id, subj.id, currentTeacher.id, groupId);
  };

  return (
    <div className="p-3.5 rounded-2xl border" style={{ borderColor: BORDER }}>
      <div className="flex items-center gap-2.5 mb-2.5">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: SURFACE }}>
          <Icon size={16} style={{ color: ACCENT }} />
        </div>
        <p className="text-sm font-medium" style={{ color: INK }}>{subj.name}</p>
      </div>
      <Select value={enrollment?.teacherId || ""} onChange={(e) => handleTeacherChange(e.target.value)} className="mb-2">
        <option value="">— غير مسجل —</option>
        {teachersForSubject.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
      </Select>
      {currentTeacher && (
        <Select value={enrollment?.groupId || ""} onChange={(e) => handleGroupChange(e.target.value)}>
          {currentTeacher.groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </Select>
      )}
    </div>
  );
}

function StudentHeaderEditable({ store, student }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(student.name);
  const [phone, setPhone] = useState(student.phone || "");
  const [parentPhone, setParentPhone] = useState(student.parentPhone || "");
  const [photo, setPhoto] = useState(student.photo);

  React.useEffect(() => {
    setName(student.name);
    setPhone(student.phone || "");
    setParentPhone(student.parentPhone || "");
    setPhoto(student.photo);
    setEditing(false);
  }, [student.id]);

  const [photoUploading, setPhotoUploading] = useState(false);
  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUploading(true);
    compressImageFile(file)
      .then((blob) => dbUploadStudentPhoto(blob))
      .then(setPhoto)
      .catch(() => {})
      .finally(() => setPhotoUploading(false));
  };

  const save = () => {
    if (!name.trim()) return;
    store.updateStudentInfo(student.id, { name: name.trim(), phone, parentPhone, photo });
    setEditing(false);
  };

  if (!editing) {
    return (
      <>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden flex-shrink-0" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
            {student.photo ? <img src={student.photo} alt="" className="w-full h-full object-cover" /> : <span style={{ fontFamily: DISPLAY, fontWeight: 700, color: ACCENT, fontSize: 20 }}>{student.name[0]}</span>}
          </div>
          <div className="flex-1">
            <p className="text-base" style={{ fontFamily: DISPLAY, fontWeight: 700, color: INK }}>{student.name}</p>
            <p className="text-xs mt-0.5" style={{ color: INK_MUTED }}>الرقم التسلسلي: {student.serial}</p>
          </div>
          <button onClick={() => setEditing(true)} className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: SURFACE }} aria-label="تعديل">
            <Pencil size={15} style={{ color: ACCENT }} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="p-3 rounded-xl border" style={{ borderColor: BORDER }}>
            <p className="text-xs" style={{ color: INK_MUTED }}>رقم الطالب</p>
            <p className="text-sm mt-1" style={{ color: INK }}>{student.phone || "—"}</p>
          </div>
          <div className="p-3 rounded-xl border" style={{ borderColor: BORDER }}>
            <p className="text-xs" style={{ color: INK_MUTED }}>رقم ولي الأمر</p>
            <p className="text-sm mt-1" style={{ color: INK }}>{student.parentPhone || "—"}</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="mb-4 p-3.5 rounded-2xl border" style={{ borderColor: BORDER }}>
      <div className="flex items-center gap-4 mb-4">
        <label className="relative cursor-pointer">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden flex-shrink-0" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
            {photo ? <img src={photo} alt="" className="w-full h-full object-cover" /> : <Camera size={18} style={{ color: INK_MUTED }} />}
          </div>
          <input type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
        </label>
        <p className="text-xs" style={{ color: INK_MUTED }}>اضغط الصورة لتغييرها</p>
      </div>
      <Field label="الاسم"><TextInput value={name} onChange={(e) => setName(e.target.value)} /></Field>
      <Field label="رقم الطالب"><TextInput value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
      <Field label="رقم ولي الأمر"><TextInput value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} /></Field>
      <div className="flex gap-2 mt-1">
        <button onClick={() => setEditing(false)} className="flex-1 rounded-xl py-2.5 text-sm font-semibold border" style={{ borderColor: BORDER, color: INK }}>إلغاء</button>
        <button onClick={save} className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white" style={{ background: ACCENT }}>حفظ</button>
      </div>
    </div>
  );
}

function ArchiveScreen({ store, onBack }) {
  const [query, setQuery] = useState("");
  const [studentId, setStudentId] = useState("");
  const [subjectId, setSubjectId] = useState(null);
  const [showCard, setShowCard] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const results = query ? store.students.filter((s) => s.name.includes(query) || s.serial.includes(query)) : store.students;
  const student = store.students.find((s) => s.id === studentId);

  if (student && showCard) {
    return <IDCardPrintScreen student={student} instituteName={store.instituteName} onBack={() => setShowCard(false)} />;
  }

  if (student && showReport) {
    return <ReportScreen store={store} student={student} onBack={() => setShowReport(false)} />;
  }

  if (student && subjectId) {
    const subj = getSubject(subjectId);
    return (
      <ScreenShell title={subj.name} onBack={() => setSubjectId(null)}>
        <SubjectRecordView subject={subj} records={studentSubjectRecords(store, student, subjectId)} editable store={store} studentId={student.id} />
      </ScreenShell>
    );
  }

  if (student) {
    return (
      <ScreenShell title="ملف الطالب" onBack={() => { setStudentId(""); setConfirmDelete(false); }}>
        <StudentHeaderEditable store={store} student={student} />

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setShowCard(true)}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold text-white"
            style={{ background: ACCENT, fontFamily: SANS }}
          >
            <Printer size={14} /> طباعة الهوية
          </button>
          <button
            onClick={() => setShowReport(true)}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold border"
            style={{ borderColor: ACCENT, color: ACCENT, fontFamily: SANS }}
          >
            <FileDown size={14} /> تصدير تقرير
          </button>
        </div>

        <p className="text-xs font-semibold mb-3" style={{ color: INK_MUTED }}>المواد والمدرسون ({Object.keys(student.enrollments).length})</p>
        <p className="text-xs mb-3" style={{ color: INK_MUTED }}>غيّر المدرس أو المجموعة مباشرة من هنا — التغيير ينحفظ فوراً.</p>
        <div className="flex flex-col gap-2.5 mb-3">
          {SUBJECTS.map((subj) => <EnrollmentEditor key={subj.id} store={store} student={student} subj={subj} />)}
        </div>

        <p className="text-xs font-semibold mb-3 mt-2" style={{ color: INK_MUTED }}>سجل الدرجات والحضور</p>
        <div className="flex flex-col gap-2.5 mb-8">
          {SUBJECTS.filter((subj) => student.enrollments[subj.id]).map((subj) => (
            <button key={subj.id} onClick={() => setSubjectId(subj.id)} className="w-full flex items-center justify-between p-3.5 rounded-2xl border text-right" style={{ borderColor: BORDER }}>
              <span className="text-sm" style={{ color: INK }}>{subj.name}</span>
              <ChevronLeft size={16} style={{ color: INK_MUTED }} />
            </button>
          ))}
          {Object.keys(student.enrollments).length === 0 && <p className="text-xs" style={{ color: INK_MUTED }}>الطالب غير مسجل بأي مادة بعد.</p>}
        </div>

        <p className="text-xs font-semibold mb-3" style={{ color: INK_MUTED }}>الدفعات</p>
        <div className="flex flex-col gap-2.5 mb-8">
          {store.installments.filter((i) => i.studentId === student.id).length === 0 && (
            <p className="text-xs" style={{ color: INK_MUTED }}>ما فيه دفعات مسجلة لهذا الطالب.</p>
          )}
          {store.installments.filter((i) => i.studentId === student.id).map((h) => (
            <div key={h.id} className="p-3.5 rounded-2xl border" style={{ borderColor: BORDER }}>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-sm font-medium" style={{ color: INK }}>{Number(h.amountNumber).toLocaleString("ar")} د.ع</p>
                <button onClick={() => { if (confirm("حذف هذي الدفعة؟")) store.deleteInstallment(h.id); }} style={{ color: DANGER }} aria-label="حذف">
                  <Trash2 size={14} />
                </button>
              </div>
              <p className="text-xs" style={{ color: INK_MUTED }}>{h.date} · متبقي {h.remaining || "—"}</p>
              {h.accountant && <p className="text-xs mt-1" style={{ color: INK_MUTED }}>المحاسب: {h.accountant}</p>}
              {h.note && <p className="text-xs mt-1" style={{ color: INK }}>{h.note}</p>}
            </div>
          ))}
        </div>

        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold border"
            style={{ borderColor: DANGER, color: DANGER, fontFamily: SANS }}
          >
            <Trash2 size={15} /> حذف الطالب
          </button>
        ) : (
          <div className="rounded-xl border p-3.5" style={{ borderColor: DANGER, background: "#FBEAE8" }}>
            <p className="text-xs mb-3" style={{ color: DANGER, fontFamily: SANS }}>هذا الإجراء يحذف الطالب نهائياً ولا يمكن التراجع عنه. متأكد؟</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(false)} className="flex-1 rounded-lg py-2.5 text-xs font-semibold border" style={{ borderColor: BORDER, color: INK }}>إلغاء</button>
              <button
                onClick={() => { store.deleteStudent(student.id); setStudentId(""); setConfirmDelete(false); }}
                className="flex-1 rounded-lg py-2.5 text-xs font-semibold text-white"
                style={{ background: DANGER }}
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        )}
      </ScreenShell>
    );
  }

  return (
    <ScreenShell title="أرشيف الطلاب" onBack={onBack}>
      <div className="relative mb-5">
        <Search size={16} style={{ color: INK_MUTED, position: "absolute", right: 14, top: 14 }} />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث بالاسم أو الرقم التسلسلي"
          className="w-full rounded-xl pr-11 pl-4 py-3 text-sm outline-none border" style={{ borderColor: BORDER, color: INK }} />
      </div>
      <div className="flex flex-col gap-2.5">
        {results.map((s) => (
          <button key={s.id} onClick={() => setStudentId(s.id)} className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl border text-right" style={{ borderColor: BORDER }}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0" style={{ background: SURFACE }}>
              {s.photo ? <img src={s.photo} alt="" className="w-full h-full object-cover" /> : <span style={{ fontFamily: DISPLAY, fontWeight: 700, color: ACCENT }}>{s.name[0]}</span>}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: INK }}>{s.name}</p>
              <p className="text-xs mt-0.5" style={{ color: INK_MUTED }}>{s.serial}</p>
            </div>
            <ChevronLeft size={16} style={{ color: INK_MUTED }} />
          </button>
        ))}
      </div>
    </ScreenShell>
  );
}

/* ============================== notifications ============================== */
function NotificationsScreen({ store, onBack }) {
  const [text, setText] = useState("");
  const [targetType, setTargetType] = useState("all");
  const [teacherId, setTeacherId] = useState("");
  const [groupId, setGroupId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [studentQuery, setStudentQuery] = useState("");
  const [done, setDone] = useState(false);
  const teacher = store.teachers.find((t) => t.id === teacherId);
  const selectedStudent = store.students.find((s) => s.id === studentId);
  const studentResults = studentQuery ? store.students.filter((s) => s.name.includes(studentQuery) || s.serial.includes(studentQuery)) : store.students;

  const submit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    let target = { type: "all" };
    if (targetType === "group" && teacherId && groupId) target = { type: "group", subjectId: teacher.subjectId, teacherId, groupId };
    if (targetType === "student" && studentId) target = { type: "student", studentId };
    store.addNotification({ text: text.trim(), target });
    setText(""); setDone(true);
    setTimeout(() => setDone(false), 2000);
  };

  return (
    <ScreenShell title="الإشعارات" onBack={onBack}>
      {done && <SuccessNote>تم إرسال الإشعار.</SuccessNote>}
      <form onSubmit={submit}>
        <Field label="نص الإشعار">
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="اكتب نص التبليغ..."
            className="w-full rounded-xl px-4 py-3 text-sm outline-none border resize-none" style={{ borderColor: BORDER, color: INK }} />
        </Field>
        <p className="text-xs font-semibold mb-2.5" style={{ color: INK_MUTED }}>المستلمون</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {[{ id: "all", label: "الكل" }, { id: "group", label: "مجموعة معينة" }, { id: "student", label: "طالب معين" }].map((o) => (
            <Chip key={o.id} active={targetType === o.id} onClick={() => { setTargetType(o.id); setStudentId(""); setStudentQuery(""); }} type="button">{o.label}</Chip>
          ))}
        </div>
        {targetType === "group" && (
          <>
            <TeacherPicker teachers={store.teachers} value={teacherId} onChange={(id) => { setTeacherId(id); setGroupId(""); }} />
            {teacher && <GroupPicker groups={teacher.groups} value={groupId} onChange={setGroupId} />}
          </>
        )}
        {targetType === "student" && (
          <div className="mb-5">
            {selectedStudent ? (
              <div className="flex items-center justify-between p-3.5 rounded-2xl" style={{ background: ACCENT_SOFT }}>
                <div>
                  <p className="text-sm font-medium" style={{ color: INK }}>{selectedStudent.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: INK_MUTED }}>{selectedStudent.serial}</p>
                </div>
                <button type="button" onClick={() => setStudentId("")} className="text-xs" style={{ color: ACCENT }}>تغيير</button>
              </div>
            ) : (
              <>
                <div className="relative mb-3">
                  <Search size={16} style={{ color: INK_MUTED, position: "absolute", right: 14, top: 14 }} />
                  <input value={studentQuery} onChange={(e) => setStudentQuery(e.target.value)} placeholder="ابحث باسم الطالب أو رقمه التسلسلي"
                    className="w-full rounded-xl pr-11 pl-4 py-3 text-sm outline-none border" style={{ borderColor: BORDER, color: INK }} />
                </div>
                <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
                  {studentResults.map((s) => (
                    <button key={s.id} type="button" onClick={() => setStudentId(s.id)} className="w-full flex items-center justify-between p-3 rounded-xl border text-right" style={{ borderColor: BORDER }}>
                      <div>
                        <p className="text-sm font-medium" style={{ color: INK }}>{s.name}</p>
                        <p className="text-xs mt-0.5" style={{ color: INK_MUTED }}>{s.serial}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
        <PrimaryButton type="submit" className="flex items-center justify-center gap-2"><Send size={15} />إرسال الإشعار</PrimaryButton>
      </form>

      <p className="text-xs font-semibold mt-8 mb-3" style={{ color: INK_MUTED }}>الإشعارات المرسلة</p>
      <div className="flex flex-col gap-2.5">
        {[...store.notifications].reverse().map((n) => {
          let recipient = "الكل";
          if (n.target.type === "student") {
            const s = store.students.find((st) => st.id === n.target.studentId);
            recipient = s ? s.name : "طالب محذوف";
          } else if (n.target.type === "group") {
            const t = store.teachers.find((tt) => tt.id === n.target.teacherId);
            const g = t?.groups.find((gg) => gg.id === n.target.groupId);
            recipient = t ? `${t.name} · ${g?.name || ""}` : "مجموعة";
          }
          return (
            <div key={n.id} className="p-3.5 rounded-2xl border" style={{ borderColor: BORDER }}>
              <p className="text-sm" style={{ color: INK }}>{n.text}</p>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: ACCENT_SOFT, color: ACCENT }}>{recipient}</span>
                <p className="text-xs" style={{ color: INK_MUTED }}>{n.date}</p>
              </div>
            </div>
          );
        })}
      </div>
    </ScreenShell>
  );
}

/* ============================== admin dashboard root ============================== */
/* ============================== early warning + whatsapp screens ============================== */
function AtRiskScreen({ store, onBack }) {
  const flags = getAtRiskStudents(store);
  return (
    <ScreenShell title="طلاب يحتاجون متابعة" onBack={onBack}>
      {flags.length === 0 && <p className="text-xs" style={{ color: INK_MUTED }}>ما فيه طلاب متعثرين حالياً.</p>}
      <div className="flex flex-col gap-3">
        {flags.map((f, i) => {
          const student = store.students.find((s) => s.id === f.studentId);
          const subj = getSubject(f.subjectId);
          const message = buildParentMessage(f.type, student.name, subj.name, f.score, f.fullScore, store.instituteName);
          return (
            <div key={i} className="p-3.5 rounded-2xl border" style={{ borderColor: BORDER }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#FBEAE8" }}>
                  <AlertTriangle size={16} style={{ color: DANGER }} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{ color: INK }}>{student.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: INK_MUTED }}>{subj.name} · {f.detail}</p>
                </div>
              </div>
              <button
                onClick={() => openWhatsapp(student.parentPhone, message)}
                className="w-full flex items-center justify-center gap-2 text-xs py-2.5 rounded-lg text-white"
                style={{ background: "#25D366", fontFamily: SANS }}
              >
                <MessageCircle size={14} /> إرسال تحذير عبر واتساب
              </button>
            </div>
          );
        })}
      </div>
    </ScreenShell>
  );
}

function NotifyParentScreen({ store, onBack }) {
  const [query, setQuery] = useState("");
  const [studentId, setStudentId] = useState("");
  const [type, setType] = useState("absence");
  const [subjectId, setSubjectId] = useState("");
  const [score, setScore] = useState("");
  const [fullScore, setFullScore] = useState("");

  const student = store.students.find((s) => s.id === studentId);
  const results = query ? store.students.filter((s) => s.name.includes(query) || s.serial.includes(query)) : store.students;

  if (!studentId) {
    return (
      <ScreenShell title="تبليغ ولي الأمر" onBack={onBack}>
        <div className="relative mb-5">
          <Search size={16} style={{ color: INK_MUTED, position: "absolute", right: 14, top: 14 }} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث باسم الطالب أو رقمه التسلسلي"
            className="w-full rounded-xl pr-11 pl-4 py-3 text-sm outline-none border" style={{ borderColor: BORDER, color: INK }} />
        </div>
        <div className="flex flex-col gap-2.5">
          {results.map((s) => (
            <button key={s.id} onClick={() => setStudentId(s.id)} className="w-full flex items-center justify-between p-3.5 rounded-2xl border text-right" style={{ borderColor: BORDER }}>
              <div>
                <p className="text-sm font-medium" style={{ color: INK }}>{s.name}</p>
                <p className="text-xs mt-0.5" style={{ color: INK_MUTED }}>{s.serial}</p>
              </div>
            </button>
          ))}
        </div>
      </ScreenShell>
    );
  }

  const enrolledSubjects = Object.keys(student.enrollments).map(getSubject);
  const subj = subjectId ? getSubject(subjectId) : null;
  const canSend = subj && (type === "absence" || (type === "decline" && score !== ""));
  const message = canSend ? buildParentMessage(type, student.name, subj.name, score, fullScore, store.instituteName) : "";

  return (
    <ScreenShell title="تبليغ ولي الأمر" onBack={() => setStudentId("")}>
      <div className="flex items-center justify-between p-3.5 rounded-2xl mb-5" style={{ background: ACCENT_SOFT }}>
        <div>
          <p className="text-sm font-medium" style={{ color: INK }}>{student.name}</p>
          <p className="text-xs mt-0.5" style={{ color: INK_MUTED }}>{student.serial}</p>
        </div>
        <button onClick={() => setStudentId("")} className="text-xs" style={{ color: ACCENT }}>تغيير</button>
      </div>

      <p className="text-xs font-semibold mb-2.5" style={{ color: INK_MUTED }}>نوع التبليغ</p>
      <div className="flex flex-wrap gap-2 mb-5">
        <Chip active={type === "absence"} onClick={() => setType("absence")}>تبليغ غياب</Chip>
        <Chip active={type === "decline"} onClick={() => setType("decline")}>تبليغ تراجع مستوى</Chip>
      </div>

      <Field label="المادة">
        <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
          <option value="">اختر المادة</option>
          {enrolledSubjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
      </Field>

      {type === "decline" && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="الدرجة"><TextInput type="number" value={score} onChange={(e) => setScore(e.target.value)} placeholder="مثال: 12" /></Field>
          <Field label="الدرجة الكاملة"><TextInput type="number" value={fullScore} onChange={(e) => setFullScore(e.target.value)} placeholder="مثال: 30" /></Field>
        </div>
      )}

      {canSend && (
        <>
          <div className="p-3.5 rounded-2xl border mb-5 text-xs leading-6 whitespace-pre-line" style={{ borderColor: BORDER, color: INK_MUTED, fontFamily: SANS }}>
            {message}
          </div>
          <button
            onClick={() => openWhatsapp(student.parentPhone, message)}
            className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white"
            style={{ background: "#25D366", fontFamily: SANS }}
          >
            <MessageCircle size={15} /> فتح واتساب
          </button>
        </>
      )}
    </ScreenShell>
  );
}

function AdminDashboard({ store, onLogout }) {
  const [modalItem, setModalItem] = useState(null);
  const [unlockedIds, setUnlockedIds] = useState([]);
  const [openItemId, setOpenItemId] = useState(null);
  const institute = { name: store.instituteName || "معهد" };

  const handleItemClick = (item) => {
    if (item.code && !unlockedIds.includes(item.id)) setModalItem(item);
    else setOpenItemId(item.id);
  };
  const handleCodeSuccess = () => { setUnlockedIds((ids) => [...ids, modalItem.id]); setOpenItemId(modalItem.id); setModalItem(null); };
  const back = () => setOpenItemId(null);

  const screens = {
    "add-teacher": <AddTeacherScreen store={store} onBack={back} />,
    "add-group": <AddGroupScreen store={store} onBack={back} />,
    "add-student": <AddStudentScreen store={store} onBack={back} />,
    attendance: <AttendanceScreen store={store} onBack={back} />,
    grades: <GradesScreen store={store} onBack={back} />,
    installments: <InstallmentsScreen store={store} onBack={back} />,
    exams: <ExamsAdminScreen store={store} onBack={back} />,
    "teacher-messages": <TeacherMessagesAdminScreen store={store} onBack={back} />
    archive: <ArchiveScreen store={store} onBack={back} />,
    notifications: <NotificationsScreen store={store} onBack={back} />,
    "notify-parent": <NotifyParentScreen store={store} onBack={back} />,
    "at-risk": <AtRiskScreen store={store} onBack={back} />,
    backup: <BackupScreen store={store} onBack={back} />,
  };
  if (openItemId) return screens[openItemId];

  return (
    <div dir="rtl" className="min-h-screen pb-10" style={{ background: "#FFFFFF" }}>
      <header className="px-5 pt-6 pb-5">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <LogoBadge size={46} />
            <div>
              <p className="text-base" style={{ fontFamily: DISPLAY, fontWeight: 700, color: INK }}>{institute.name}</p>
              <p className="text-xs" style={{ color: INK_MUTED }}>لوحة تحكم مسار</p>
            </div>
          </div>
          <button onClick={onLogout} className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border" style={{ borderColor: BORDER, color: INK_MUTED, fontFamily: SANS }}>
            <LogOut size={14} />خروج
          </button>
        </div>
        <div className="flex gap-3">
          <StatCard icon={Users} value={store.students.length} label="طالب مسجل" />
          <StatCard icon={GraduationCap} value={store.teachers.length} label="مدرس" />
          <StatCard icon={Layers} value={store.teachers.reduce((n, t) => n + t.groups.length, 0)} label="مجموعة" />
        </div>
      </header>
      <main className="px-5" style={{ fontFamily: SANS }}>
        {(() => {
          const atRisk = getAtRiskStudents(store);
          const uniqueCount = new Set(atRisk.map((f) => f.studentId)).size;
          if (uniqueCount === 0) return null;
          return (
            <button
              onClick={() => setOpenItemId("at-risk")}
              className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl mb-6 text-right"
              style={{ background: "#FBEAE8", border: `1px solid ${DANGER}` }}
            >
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#fff" }}>
                <AlertTriangle size={19} style={{ color: DANGER }} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: DANGER }}>{uniqueCount} طالب يحتاج متابعة</p>
                <p className="text-xs mt-0.5" style={{ color: INK_MUTED }}>غياب متكرر أو تراجع بالدرجات</p>
              </div>
              <ChevronLeft size={16} style={{ color: DANGER }} />
            </button>
          );
        })()}
        <div className="mb-2">
          <p className="text-xs font-semibold mb-3" style={{ color: INK_MUTED }}>المهام اليومية</p>
          <div className="flex flex-col gap-2.5">{DAILY_ITEMS.map((item) => <ItemRow key={item.id} item={item} locked={false} onClick={() => handleItemClick(item)} />)}</div>
        </div>
        <div className="my-6"><PathDivider /></div>
        <div>
          <p className="text-xs font-semibold mb-3" style={{ color: INK_MUTED }}>الإدارة</p>
          <div className="flex flex-col gap-2.5">{MANAGEMENT_ITEMS.map((item) => <ItemRow key={item.id} item={item} locked={!unlockedIds.includes(item.id)} onClick={() => handleItemClick(item)} />)}</div>
        </div>
      </main>
      {modalItem && <CodeModal item={modalItem} onClose={() => setModalItem(null)} onSuccess={handleCodeSuccess} />}
    </div>
  );
}

/* ============================== student view ============================== */
function StudentSubjectDetail({ store, student, subjectId, onBack }) {
  const subj = getSubject(subjectId);
  const enrollment = student.enrollments[subjectId];
  const teacher = store.teachers.find((t) => t.id === enrollment.teacherId);
  const group = teacher.groups.find((g) => g.id === enrollment.groupId);
  return (
    <div dir="rtl" className="min-h-screen px-5 py-6 pb-12" style={{ background: "#FFFFFF", fontFamily: SANS }}>
      <button onClick={onBack} className="flex items-center gap-1 text-sm mb-6" style={{ color: ACCENT }}><ChevronLeft size={16} />موادي</button>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: ACCENT_SOFT }}><subj.icon size={21} style={{ color: ACCENT }} /></div>
        <div>
          <h2 className="text-lg" style={{ fontFamily: DISPLAY, fontWeight: 700, color: INK }}>{subj.name}</h2>
          <p className="text-xs" style={{ color: INK_MUTED }}>{teacher.name} · {group.name}</p>
        </div>
      </div>
      <SubjectRecordView
        subject={subj}
        records={studentSubjectRecords(store, student, subjectId)}
        store={store}
        studentId={student.id}
        subjectId={subjectId}
        teacherId={teacher.id}
        teacherName={teacher.name}
        groupId={group.id}
      />
    </div>
  );
}
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

function StudentDashboard({ store, studentId, onLogout }) {
  const [openSubject, setOpenSubject] = useState(null);
  const [pushStatus, setPushStatus] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "unsupported"
  );
  const student = store.students.find((s) => s.id === studentId) || store.students[0];

  const [pushError, setPushError] = useState(null);
  const enablePush = async () => {
    setPushError(null);
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setPushStatus("unsupported");
        return;
      }
      const registration = await navigator.serviceWorker.register("/sw.js");
      const permission = await Notification.requestPermission();
      setPushStatus(permission);
      if (permission !== "granted") return;
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) throw new Error("NEXT_PUBLIC_VAPID_PUBLIC_KEY غير موجود بالبناء الحالي");
      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        }));
      await store.savePushSubscription(student.id, subscription.toJSON());
    } catch (e) {
      console.error("enablePush failed:", e);
      setPushError((e && e.message) || String(e));
    }
  };

  React.useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "granted" && student) {
      enablePush();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student?.id]);

  if (!student) {
    return (
      <div dir="rtl" className="min-h-screen flex flex-col items-center justify-center px-5 text-center" style={{ background: "#FFFFFF", fontFamily: SANS }}>
        <p className="text-sm" style={{ color: INK_MUTED }}>ما فيه طلاب مسجلين بعد. سجل دخول كإدارة وأضف طالب أول.</p>
        <button onClick={onLogout} className="mt-4 text-sm" style={{ color: ACCENT }}>رجوع</button>
      </div>
    );
  }
  if (openSubject) return <StudentSubjectDetail store={store} student={student} subjectId={openSubject} onBack={() => setOpenSubject(null)} />;

  const myNotifications = store.notifications.filter((n) => {
    if (n.target.type === "all") return true;
    if (n.target.type === "student") return n.target.studentId === student.id;
    if (n.target.type === "group") return student.enrollments[n.target.subjectId]?.teacherId === n.target.teacherId && student.enrollments[n.target.subjectId]?.groupId === n.target.groupId;
    return false;
  });

  return (
    <div dir="rtl" className="min-h-screen pb-10" style={{ background: "#FFFFFF" }}>
      <header className="px-5 pt-6 pb-5">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center overflow-hidden flex-shrink-0" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
              {student.photo ? <img src={student.photo} alt="" className="w-full h-full object-cover" /> : <span style={{ fontFamily: DISPLAY, fontWeight: 700, color: ACCENT, fontSize: 20 }}>{student.name[0]}</span>}
            </div>
            <div>
              <p className="text-base" style={{ fontFamily: DISPLAY, fontWeight: 700, color: INK }}>{student.name}</p>
              <p className="text-xs mt-0.5" style={{ color: INK_MUTED, fontFamily: SANS }}>{student.serial}</p>
            </div>
          </div>
          <button onClick={onLogout} className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border" style={{ borderColor: BORDER, color: INK_MUTED, fontFamily: SANS }}>
            <LogOut size={14} />خروج
          </button>
        </div>
        <div style={{ fontFamily: SANS }}><PathDivider /></div>
      </header>
      <main className="px-5" style={{ fontFamily: SANS }}>
        {pushStatus !== "unsupported" && pushStatus !== "granted" && (
          <button
            onClick={enablePush}
            className="w-full flex items-center gap-3 p-3.5 rounded-2xl mb-2 text-right"
            style={{ background: ACCENT_SOFT }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#fff" }}>
              <Bell size={18} style={{ color: ACCENT }} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: ACCENT }}>فعّل إشعارات الموبايل</p>
              <p className="text-xs mt-0.5" style={{ color: INK_MUTED }}>خل درجاتك وحضورك توصلك مباشرة لجهازك</p>
            </div>
          </button>
        )}
        {pushError && (
          <div className="p-3.5 rounded-2xl mb-4" style={{ background: "#FBEAE8" }}>
            <p className="text-xs" style={{ color: DANGER }}>تعذر تفعيل الإشعارات: {pushError}</p>
            <button onClick={enablePush} className="text-xs mt-1.5 font-semibold" style={{ color: ACCENT }}>إعادة المحاولة</button>
          </div>
        )}
        <p className="text-xs font-semibold mb-3" style={{ color: INK_MUTED }}>موادي</p>
        <div className="flex flex-col gap-2.5 mb-8">
          {SUBJECTS.map((s) => {
            const enrollment = student.enrollments[s.id];
            const teacher = enrollment && store.teachers.find((t) => t.id === enrollment.teacherId);
            const group = teacher?.groups.find((g) => g.id === enrollment?.groupId);
            const Icon = s.icon;
            return (
              <button key={s.id} disabled={!enrollment} onClick={() => setOpenSubject(s.id)} className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl border text-right disabled:opacity-45" style={{ borderColor: BORDER }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: SURFACE }}><Icon size={19} style={{ color: ACCENT }} /></div>
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{ color: INK }}>{s.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: INK_MUTED }}>{enrollment ? `${teacher.name} · ${group?.name}` : "غير مسجل"}</p>
                </div>
                {enrollment && <ChevronLeft size={16} style={{ color: INK_MUTED }} />}
              </button>
            );
          })}
        </div>
        <p className="text-xs font-semibold mb-3" style={{ color: INK_MUTED }}>الإشعارات</p>
        <div className="flex flex-col gap-2.5">
          {myNotifications.length === 0 && <p className="text-xs" style={{ color: INK_MUTED }}>ما فيه إشعارات حالياً.</p>}
          {[...myNotifications].reverse().map((n) => (
            <div key={n.id} className="p-3.5 rounded-2xl border" style={{ borderColor: BORDER }}>
              <p className="text-sm" style={{ color: INK }}>{n.text}</p>
              <p className="text-xs mt-1.5" style={{ color: INK_MUTED }}>{n.date}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

/* ============================== root (Supabase-backed) ============================== */
function OwnerDashboard({ store, onLogout }) {
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submitAdd = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await store.addInstitute({ name: name.trim(), adminUsername: adminUsername.trim(), adminPassword: adminPassword.trim() });
      setName(""); setAdminUsername(""); setAdminPassword("");
      setShowAdd(false);
    } catch (e2) {
      setError(e2.message?.includes("duplicate") ? "اسم المستخدم هذا مستخدم أصلاً لمعهد ثاني" : "تعذر إضافة المعهد");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen pb-10" style={{ background: "#FFFFFF", fontFamily: SANS }}>
      <header className="px-5 pt-6 pb-5">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <LogoBadge size={46} />
            <div>
              <p className="text-base" style={{ fontFamily: DISPLAY, fontWeight: 700, color: INK }}>لوحة المالك</p>
              <p className="text-xs" style={{ color: INK_MUTED }}>كل المعاهد بمسار</p>
            </div>
          </div>
          <button onClick={onLogout} className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border" style={{ borderColor: BORDER, color: INK_MUTED, fontFamily: SANS }}>
            <LogOut size={14} />خروج
          </button>
        </div>
        <StatCard icon={Users} value={store.institutes.length} label="معهد مسجل" />
      </header>

      <main className="px-5">
        {!showAdd ? (
          <button
            onClick={() => setShowAdd(true)}
            className="w-full flex items-center justify-center gap-2 rounded-xl py-3 mb-6 text-sm font-semibold text-white"
            style={{ background: ACCENT }}
          >
            <Plus size={16} /> إضافة معهد جديد
          </button>
        ) : (
          <form onSubmit={submitAdd} className="mb-6 p-4 rounded-2xl border" style={{ borderColor: BORDER }}>
            <p className="text-sm font-semibold mb-3" style={{ color: INK }}>معهد جديد</p>
            <Field label="اسم المعهد"><TextInput value={name} onChange={(e) => setName(e.target.value)} required /></Field>
            <Field label="يوزر إدارة المعهد"><TextInput value={adminUsername} onChange={(e) => setAdminUsername(e.target.value)} required /></Field>
            <Field label="باسورد إدارة المعهد"><TextInput value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} required /></Field>
            {error && <p className="text-xs mb-3" style={{ color: DANGER }}>{error}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowAdd(false)} className="flex-1 rounded-xl py-2.5 text-sm font-semibold border" style={{ borderColor: BORDER, color: INK }}>إلغاء</button>
              <button type="submit" disabled={busy} className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-40" style={{ background: ACCENT }}>
                {busy ? "جارِ الإضافة…" : "إضافة"}
              </button>
            </div>
          </form>
        )}

        <p className="text-xs font-semibold mb-3" style={{ color: INK_MUTED }}>المعاهد</p>
        <div className="flex flex-col gap-2.5">
          {store.institutes.length === 0 && <p className="text-xs" style={{ color: INK_MUTED }}>ما فيه معاهد مسجلة بعد.</p>}
          {store.institutes.map((inst) => (
            <div key={inst.id} className="p-3.5 rounded-2xl border" style={{ borderColor: inst.status === "suspended" ? DANGER : BORDER }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium" style={{ color: INK }}>{inst.name}</p>
                    {inst.status === "suspended" && (
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#FBEAE8", color: DANGER }}>موقوف</span>
                    )}
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: INK_MUTED }}>يوزر الإدارة: {inst.adminUsername}</p>
                  <p className="text-xs mt-1" style={{ color: INK_MUTED }}>{inst.studentCount} طالب · {inst.teacherCount} مدرس</p>
                </div>
                <button onClick={() => setConfirmDeleteId(confirmDeleteId === inst.id ? null : inst.id)} style={{ color: DANGER }} aria-label="حذف">
                  <Trash2 size={15} />
                </button>
              </div>

              <button
                onClick={() => store.toggleInstituteStatus(inst.id, inst.status === "suspended" ? "active" : "suspended")}
                className="w-full mt-3 rounded-lg py-2 text-xs font-semibold border"
                style={{ borderColor: inst.status === "suspended" ? ACCENT : DANGER, color: inst.status === "suspended" ? ACCENT : DANGER }}
              >
                {inst.status === "suspended" ? "إعادة تفعيل المعهد" : "إيقاف المعهد مؤقتاً"}
              </button>

              {confirmDeleteId === inst.id && (
                <div className="flex gap-2 mt-3">
                  <button onClick={() => setConfirmDeleteId(null)} className="flex-1 rounded-lg py-2 text-xs font-semibold border" style={{ borderColor: BORDER, color: INK }}>إلغاء</button>
                  <button
                    onClick={() => { store.deleteInstitute(inst.id); setConfirmDeleteId(null); }}
                    className="flex-1 rounded-lg py-2 text-xs font-semibold text-white"
                    style={{ background: DANGER }}
                  >
                    حذف المعهد وكل بياناته نهائياً
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export default function MasarApp() {
  const [session, setSession] = useState(null); // null | "owner" | "institute-admin" | "student" | "teacher"
  const [instituteId, setInstituteId] = useState(null);
  const [instituteName, setInstituteName] = useState("");
  const [loggedInStudentId, setLoggedInStudentId] = useState(null);
  const [teacherSession, setTeacherSession] = useState(null); // { id, name, subjectId, instituteId }
  const [data, setData] = useState(null);
  const [institutesList, setInstitutesList] = useState(null);
  const [loading, setLoading] = useState(true); // بس أثناء التحقق الأولي من جلسة محفوظة
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const reloadInstituteData = async (id) => {
    try {
      const fresh = await fetchAll(id);
      setData(fresh);
      setError(null);
      return fresh;
    } catch (e) {
      setError(e.message || "تعذر الاتصال بقاعدة البيانات");
      return null;
    }
  };

  // يحدث بس الجداول المتأثرة بعملية معينة، بدل إعادة تحميل بيانات المعهد كاملة
  const reloadParts = async (id, parts) => {
    try {
      const fresh = await fetchParts(id, parts);
      setData((prev) => (prev ? { ...prev, ...fresh } : prev));
      setError(null);
    } catch (e) {
      setError(e.message || "تعذر الاتصال بقاعدة البيانات");
    }
  };

  const reloadInstitutesList = async () => {
    try {
      const fresh = await dbFetchInstitutes();
      setInstitutesList(fresh);
      setError(null);
    } catch (e) {
      setError(e.message || "تعذر الاتصال بقاعدة البيانات");
    }
  };

  // عند فتح التطبيق: تحقق من جلسة طالب محفوظة بس (مو إدارة/مالك، لأسباب أمنية)
  useEffect(() => {
    (async () => {
      try {
        // رمز مدرس بالرابط (يدخله مرة وحدة) أو محفوظ من زيارة سابقة
        const urlParams = new URLSearchParams(window.location.search);
        const urlCode = urlParams.get("tcode");
        const savedCode = window.localStorage.getItem("masar_teacher_code");
        const codeToTry = urlCode || savedCode;
        if (codeToTry) {
          const teacher = await dbLoginTeacherByCode(codeToTry);
          if (teacher) {
            setTeacherSession(teacher);
            setSession("teacher");
            window.localStorage.setItem("masar_teacher_code", codeToTry);
            if (urlCode) window.history.replaceState({}, "", window.location.pathname);
            setLoading(false);
            return;
          } else if (urlCode) {
            window.history.replaceState({}, "", window.location.pathname);
          }
        }

        const savedStudentId = window.localStorage.getItem("masar_student_id");
        const savedInstituteId = window.localStorage.getItem("masar_student_institute_id");
        if (savedStudentId && savedInstituteId) {
          const fresh = await fetchAll(savedInstituteId);
          if (fresh.students.some((s) => s.id === savedStudentId)) {
            setData(fresh);
            setSession("student");
            setLoggedInStudentId(savedStudentId);
            setInstituteId(savedInstituteId);
          } else {
            window.localStorage.removeItem("masar_student_id");
            window.localStorage.removeItem("masar_student_institute_id");
          }
        }
      } catch (e) {
        /* تعذر استرجاع الجلسة — يرجع لشاشة الدخول العادية */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const withReload = (fn, parts) => async (...args) => {
    setBusy(true);
    try {
      const result = await fn(...args);
      if (parts) await reloadParts(instituteId, parts);
      else await reloadInstituteData(instituteId);
      return result;
    } finally {
      setBusy(false);
    }
  };

  const withOwnerReload = (fn) => async (...args) => {
    setBusy(true);
    try {
      const result = await fn(...args);
      await reloadInstitutesList();
      return result;
    } finally {
      setBusy(false);
    }
  };

  const handleLogin = async (role, payload) => {
    if (role === "owner") {
      setSession("owner");
      await reloadInstitutesList();
    } else if (role === "institute-admin") {
      setInstituteId(payload.instituteId);
      setInstituteName(payload.instituteName);
      await reloadInstituteData(payload.instituteId);
      setSession("institute-admin");
    } else if (role === "student") {
      setInstituteId(payload.instituteId);
      await reloadInstituteData(payload.instituteId);
      setSession("student");
      setLoggedInStudentId(payload.studentId);
      try {
        window.localStorage.setItem("masar_student_id", payload.studentId);
        window.localStorage.setItem("masar_student_institute_id", payload.instituteId);
      } catch (e) {}
    } else if (role === "teacher") {
      setTeacherSession(payload.teacher);
      setSession("teacher");
      try {
        window.localStorage.setItem("masar_teacher_code", payload.code);
      } catch (e) {}
    }
  };

  const logout = () => {
    setSession(null);
    setInstituteId(null);
    setInstituteName("");
    setLoggedInStudentId(null);
    setTeacherSession(null);
    setData(null);
    setInstitutesList(null);
    try {
      window.localStorage.removeItem("masar_student_id");
      window.localStorage.removeItem("masar_student_institute_id");
      window.localStorage.removeItem("masar_teacher_code");
    } catch (e) {}
  };

  if (loading) {
    return (
      <div dir="rtl" className="min-h-screen flex items-center justify-center" style={{ background: "#FFFFFF" }}>
        <style>{FONT_IMPORT}</style>
        <p className="text-sm" style={{ color: INK_MUTED, fontFamily: SANS }}>جارِ التحميل…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div dir="rtl" className="min-h-screen flex flex-col items-center justify-center px-6 text-center gap-2" style={{ background: "#FFFFFF" }}>
        <style>{FONT_IMPORT}</style>
        <p className="text-sm font-semibold" style={{ color: DANGER, fontFamily: SANS }}>تعذر الاتصال بقاعدة البيانات</p>
        <p className="text-xs" style={{ color: INK_MUTED, fontFamily: SANS }}>{error}</p>
      </div>
    );
  }

  const ownerStore = institutesList
    ? {
        institutes: institutesList,
        addInstitute: withOwnerReload(dbAddInstitute),
        deleteInstitute: withOwnerReload(dbDeleteInstitute),
        toggleInstituteStatus: withOwnerReload(dbToggleInstituteStatus),
      }
    : null;

  const store = data
    ? {
        ...data,
        instituteId,
        instituteName,
        addTeacher: withReload((args) => dbAddTeacher(instituteId, args), ["teachers"]),
        updateTeacherName: withReload(dbUpdateTeacherName, ["teachers"]),
        deleteTeacher: withReload(dbDeleteTeacher, ["teachers"]),
        addGroup: withReload((teacherId) => {
          const teacher = data.teachers.find((t) => t.id === teacherId);
          const nextName = `M${teacher.groups.length + 1}`;
          return dbAddGroup(instituteId, teacherId, nextName);
        }, ["teachers"]),
        addStudent: async (studentData) => {
          const nextNumber = data.students.length + 1;
          const serial = String(nextNumber).padStart(4, "0");
          await withReload(() => dbAddStudent(instituteId, studentData, serial), ["students"])();
          return serial;
        },
        updateEnrollment: withReload((studentId, subjectId, teacherId, groupId) =>
          dbUpdateEnrollment(instituteId, studentId, subjectId, teacherId, groupId)
        , ["students"]),
        updateStudentInfo: withReload(dbUpdateStudentInfo, ["students"]),
        updateGradeResult: withReload((gradeRecordId, studentId, payload) =>
          dbUpdateGradeResult(instituteId, gradeRecordId, studentId, payload)
        , ["gradeRecords", "notifications"]),
        updateAttendanceEntry: withReload((attendanceRecordId, studentId, present) =>
          dbUpdateAttendanceEntry(instituteId, attendanceRecordId, studentId, present)
        , ["attendanceRecords", "notifications"]),
        deleteStudent: withReload(dbDeleteStudent, ["students"]),
        addAttendanceRecord: withReload((args) => dbAddAttendanceRecord(instituteId, args), ["attendanceRecords", "notifications"]),
        addGradeRecord: withReload((args) => dbAddGradeRecord(instituteId, args), ["gradeRecords", "notifications"]),
        addInstallment: withReload((args) => dbAddInstallment(instituteId, args), ["installments"]),
        deleteInstallment: withReload(dbDeleteInstallment, ["installments"]),
        addNotification: withReload((args) => dbAddNotification(instituteId, args), ["notifications"]),
        savePushSubscription: dbSavePushSubscription,
      }
    : null;

  return (
    <>
      <style>{FONT_IMPORT}</style>
      {busy && (
        <div className="fixed top-3 inset-x-0 flex justify-center z-50 pointer-events-none">
          <div className="px-3 py-1.5 rounded-full text-xs text-white" style={{ background: ACCENT, fontFamily: SANS }}>جارِ الحفظ…</div>
        </div>
      )}
      {session === "owner" &&
        (ownerStore ? (
          <OwnerDashboard store={ownerStore} onLogout={logout} />
        ) : (
          <div dir="rtl" className="min-h-screen flex items-center justify-center" style={{ background: "#FFFFFF" }}>
            <p className="text-sm" style={{ color: INK_MUTED, fontFamily: SANS }}>جارِ التحميل…</p>
          </div>
        ))}
      {session === "institute-admin" &&
        (store ? (
          <AdminDashboard store={store} onLogout={logout} />
        ) : (
          <div dir="rtl" className="min-h-screen flex items-center justify-center" style={{ background: "#FFFFFF" }}>
            <p className="text-sm" style={{ color: INK_MUTED, fontFamily: SANS }}>جارِ التحميل…</p>
          </div>
        ))}
      {session === "student" &&
        (store ? (
          <StudentDashboard store={store} studentId={loggedInStudentId} onLogout={logout} />
        ) : (
          <div dir="rtl" className="min-h-screen flex items-center justify-center" style={{ background: "#FFFFFF" }}>
            <p className="text-sm" style={{ color: INK_MUTED, fontFamily: SANS }}>جارِ التحميل…</p>
          </div>
        ))}
      {session === "teacher" && teacherSession && <TeacherInboxScreen teacherSession={teacherSession} onLogout={logout} />}
      {!session && <LoginScreen onLogin={handleLogin} />}
    </>
  );
}
