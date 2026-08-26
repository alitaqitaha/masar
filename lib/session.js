import { createHmac, timingSafeEqual } from "crypto";

// نظام جلسة موقّعة (Signed Session) — يشتغل فقط على السيرفر.
// السيرفر هو اللي يقرر "مين يسأل" من الجلسة الموقّعة، مو من بيانات يرسلها المتصفح.

function base64url(input) {
  return Buffer.from(input).toString("base64url");
}
function base64urlDecode(input) {
  return Buffer.from(input, "base64url").toString("utf8");
}

export function createSessionToken(payload, expiresInSeconds = 60 * 60 * 24 * 30) {
  const secret = process.env.SESSION_SECRET;
  const body = { ...payload, exp: Math.floor(Date.now() / 1000) + expiresInSeconds };
  const payloadB64 = base64url(JSON.stringify(body));
  const sig = createHmac("sha256", secret).update(payloadB64).digest("base64url");
  return `${payloadB64}.${sig}`;
}

export function verifySessionToken(token) {
  const secret = process.env.SESSION_SECRET;
  if (!token || !secret || !token.includes(".")) return null;
  const [payloadB64, sig] = token.split(".");
  const expectedSig = createHmac("sha256", secret).update(payloadB64).digest("base64url");
  try {
    const sigBuf = Buffer.from(sig);
    const expectedBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) return null;
  } catch (e) {
    return null;
  }
  let body;
  try {
    body = JSON.parse(base64urlDecode(payloadB64));
  } catch (e) {
    return null;
  }
  if (body.exp && body.exp < Math.floor(Date.now() / 1000)) return null;
  return body;
}
