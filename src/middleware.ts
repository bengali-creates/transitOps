import { auth } from "./lib/auth";
import { NextResponse } from "next/server";


export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  const isPublic =
    pathname === "/" || pathname.startsWith("/api/auth");
  const isInternal = pathname.startsWith("/api/internal");
  const isCron = pathname.startsWith("/api/cron");

  if (isInternal) {
    const apiKey = req.headers.get("x-api-key");
    const internalSecret = process.env.INTERNAL_SERVICE_SECRET;
    if (!internalSecret || apiKey !== internalSecret) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.next();
  }

  if (isCron) {
    return NextResponse.next();
  }

  if (!isLoggedIn && !isPublic) {
    const url = new URL("/", req.nextUrl.origin);
    return NextResponse.redirect(url);
  }

  if (isLoggedIn && pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
