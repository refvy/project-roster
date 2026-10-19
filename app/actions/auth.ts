"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requestMagicLinkForEmail, logoutOrganiser } from "@/lib/auth";
import { publicAppOrigin } from "@/lib/env";
import { resolveClientIp } from "@/lib/rate-limit";

export type MagicLinkState = {
  ok: boolean;
  error?: string;
  debugUrl?: string;
  mailed?: boolean;
  rateLimited?: boolean;
} | null;

export async function requestMagicLink(
  _prev: MagicLinkState,
  formData: FormData,
): Promise<NonNullable<MagicLinkState>> {
  const email = String(formData.get("email") ?? "");
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const proto = headerStore.get("x-forwarded-proto") ?? "http";
  const requestOrigin = host ? `${proto}://${host}` : undefined;
  const origin = publicAppOrigin(requestOrigin);
  const result = await requestMagicLinkForEmail(
    email,
    origin,
    resolveClientIp(headerStore),
  );
  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
      rateLimited: "rateLimited" in result ? result.rateLimited : undefined,
    };
  }
  return {
    ok: true,
    debugUrl: "debugUrl" in result ? result.debugUrl : undefined,
    mailed: "mailed" in result ? result.mailed : undefined,
  };
}

export async function logoutAction() {
  await logoutOrganiser();
  redirect("/");
}
