import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";

export function proxy(request: NextRequest) {
  const session = request.cookies.get(SESSION_COOKIE);
  if (request.nextUrl.pathname.startsWith("/board") && !session) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/board/:path*"],
};
