import { scryptSync, randomBytes, timingSafeEqual } from "crypto";

// هذا الملف يستخدم فقط داخل مسارات API (server-side) — لا يستورد أبداً بملف يشتغل بالمتصفح.

export function hashPassword(plainPassword) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(plainPassword, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(plainPassword, stored) {
  if (!stored || !stored.includes(":")) return false;
  const [salt, hash] = stored.split(":");
  try {
    const candidateHash = scryptSync(plainPassword, salt, 64);
    const storedHash = Buffer.from(hash, "hex");
    if (candidateHash.length !== storedHash.length) return false;
    return timingSafeEqual(candidateHash, storedHash);
  } catch (e) {
    return false;
  }
}
