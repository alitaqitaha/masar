import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";

// هذا المسار يشتغل تلقائياً كل شهر (راجع vercel.json).
// يمسح بس سجلات "إشعارات" (notifications) الأقدم من 6 أشهر —
// ما يلمس أبداً سجلات الحضور أو الدرجات أو أي بيانات أخرى.
export async function GET(request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const { error, count } = await supabaseAdmin
      .from("notifications")
      .delete({ count: "exact" })
      .lt("created_at", sixMonthsAgo.toISOString());
    if (error) throw error;

    return Response.json({ deleted: count || 0 });
  } catch (e) {
    console.error("cleanup-notifications error:", e);
    return Response.json({ error: (e && e.message) || "cleanup failed" }, { status: 500 });
  }
}
