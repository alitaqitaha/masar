import webpush from "web-push";
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin";

function ensureVapid() {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub) throw new Error("NEXT_PUBLIC_VAPID_PUBLIC_KEY غير موجود بمتغيرات البيئة");
  if (!priv) throw new Error("VAPID_PRIVATE_KEY غير موجود بمتغيرات البيئة");
  webpush.setVapidDetails("mailto:no-reply@masar.app", pub, priv);
}

async function resolveStudentIds(supabaseAdmin, target) {
  if (target.type === "student" && target.studentId) {
    return [target.studentId];
  }
  if (target.type === "group" && target.subjectId && target.teacherId && target.groupId) {
    const { data, error } = await supabaseAdmin
      .from("enrollments")
      .select("student_id")
      .eq("subject_id", target.subjectId)
      .eq("teacher_id", target.teacherId)
      .eq("group_id", target.groupId);
    if (error) return [];
    return data.map((r) => r.student_id);
  }
  // "all"
  const { data, error } = await supabaseAdmin.from("students").select("id");
  if (error) return [];
  return data.map((r) => r.id);
}

export async function POST(request) {
  try {
    ensureVapid();
    const supabaseAdmin = getSupabaseAdmin();

    const { title, body, target } = await request.json();
    if (!body || !target) {
      return Response.json({ error: "missing fields" }, { status: 400 });
    }

    const studentIds = await resolveStudentIds(supabaseAdmin, target);
    if (studentIds.length === 0) {
      return Response.json({ sent: 0 });
    }

    const { data: subs, error: subsErr } = await supabaseAdmin
      .from("push_subscriptions")
      .select("id, student_id, endpoint, p256dh, auth")
      .in("student_id", studentIds);
    if (subsErr) throw subsErr;

    const payload = JSON.stringify({ title: title || "مسار", body });

    let sent = 0;
    await Promise.all(
      (subs || []).map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload
          );
          sent += 1;
        } catch (err) {
          // اشتراك منتهي أو غير صالح — احذفه
          if (err.statusCode === 404 || err.statusCode === 410) {
            await supabaseAdmin.from("push_subscriptions").delete().eq("id", sub.id);
          }
        }
      })
    );

    return Response.json({ sent });
  } catch (e) {
    return Response.json({ error: e.message || "send-push failed" }, { status: 500 });
  }
}
