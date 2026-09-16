import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  consumeMagicLink,
  sessionCookieOptions,
  signedSessionCookie,
} from "@/lib/auth";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const origin = request.nextUrl.origin;
  if (!token) {
    return NextResponse.redirect(new URL("/?error=missing-link", origin));
  }
  const result = await consumeMagicLink(token);
  if (!result) {
    return NextResponse.redirect(new URL("/?error=expired-link", origin));
  }
  const response = NextResponse.redirect(new URL("/board", origin));
  response.cookies.set(
    SESSION_COOKIE,
    signedSessionCookie(result.sessionToken),
    sessionCookieOptions(),
  );
  return response;
}
