// جدولة Netlify — يستدعي نفس مسار التنظيف الموجود أصلاً (app/api/cron/cleanup-notifications)
// بدل ما يكرر المنطق، بس يشغّله بالجدول الشهري الصحيح.
export default async (req) => {
  const site = process.env.URL || process.env.DEPLOY_PRIME_URL;
  try {
    const res = await fetch(`${site}/api/cron/cleanup-notifications`, {
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
    });
    const data = await res.json();
    console.log("cleanup result:", data);
  } catch (e) {
    console.error("scheduled cleanup failed:", e);
  }
};

export const config = {
  schedule: "0 3 1 * *", // أول كل شهر، الساعة 3 فجراً UTC — نفس جدولة Vercel القديمة
};
