import { NextResponse } from "next/server";

export function middleware(req) {
  const { pathname } = req.nextUrl;

  // ✅ allow public admin routes (NO AUTH REQUIRED)
  if (
    pathname === "/admin" ||
    pathname.startsWith("/admin/confirm") ||
    pathname.startsWith("/admin/pair")
  ) {
    return NextResponse.next();
  }

  // 🔒 protect the rest of /admin/*
  if (pathname.startsWith("/admin")) {
    const hasDevice = req.cookies.get("admin_device");
    const hasMsSession = req.cookies.get("ms_session");

    if (!hasDevice && !hasMsSession) {
      return NextResponse.redirect(
        new URL("/admin/login", req.url)
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
