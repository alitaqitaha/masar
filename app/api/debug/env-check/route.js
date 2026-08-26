export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    sessionSecretSet: Boolean(process.env.SESSION_SECRET),
    sessionSecretLength: process.env.SESSION_SECRET ? process.env.SESSION_SECRET.length : 0,
    ownerPasswordHashSet: Boolean(process.env.OWNER_PASSWORD_HASH),
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV || "unknown",
  });
}
