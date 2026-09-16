import { NextRequest, NextResponse } from "next/server";
import { consumeMagicLink } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const origin = request.nextUrl.origin;
  if (!token) {
    return NextResponse.redirect(new URL("/?error=missing-link", origin));
  }
  const organiser = await consumeMagicLink(token);
  if (!organiser) {
    return NextResponse.redirect(new URL("/?error=expired-link", origin));
  }
  return NextResponse.redirect(new URL("/board", origin));
}
