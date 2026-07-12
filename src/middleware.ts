import { auth } from "./lib/auth";
import { NextResponse } from "next/server";

/**
 * Every route except the login page and Auth.js endpoints requires a session.
 * Fine-grained permission checks happen in server actions via requirePermission.
 */
export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  const isPublic =
    pathname === "/" || pathname.startsWith("/api/auth");

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
