import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";

const LINK_HOSTS = new Set(["skwad.link", "www.skwad.link"]);

function hostNames(request: NextRequest) {
  const names = new Set<string>();
  for (const header of ["host", "x-forwarded-host"] as const) {
    const raw = request.headers.get(header) ?? "";
    for (const part of raw.split(",")) {
      const host = part.trim().toLowerCase().replace(/:\d+$/, "");
      if (host) names.add(host);
    }
  }
  return names;
}

/** 301 skwad.link and www.skwad.link to the same path on getskwad.com. */
export function skwadLinkRedirect(request: NextRequest) {
  const alias = [...hostNames(request)].some((host) => LINK_HOSTS.has(host));
  if (!alias) return null;
  const destination = new URL(
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
    "https://getskwad.com",
  );
  return NextResponse.redirect(destination, 301);
}

export function proxy(request: NextRequest) {
  const alias = skwadLinkRedirect(request);
  if (alias) return alias;

  const session = request.cookies.get(SESSION_COOKIE);
  const path = request.nextUrl.pathname.replace(/\/+$/, "") || "/";
  const boardHome = path === "/board";
  if (path.startsWith("/board") && !boardHome && !session) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
