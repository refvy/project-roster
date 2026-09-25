import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import { getAuthSecret } from "./env";

export function randomToken(bytes = 32) {
  return randomBytes(bytes).toString("hex");
}

export function publicId() {
  return randomBytes(8).toString("base64url");
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function signValue(value: string) {
  const sig = createHmac("sha256", getAuthSecret()).update(value).digest("hex");
  return `${value}.${sig}`;
}

export function unsignValue(signed: string | undefined | null) {
  if (!signed) return null;
  const index = signed.lastIndexOf(".");
  if (index <= 0) return null;
  const value = signed.slice(0, index);
  const sig = signed.slice(index + 1);
  const expected = createHmac("sha256", getAuthSecret()).update(value).digest("hex");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  if (!timingSafeEqual(a, b)) return null;
  return value;
}
