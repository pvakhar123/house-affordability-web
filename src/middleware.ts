import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const ADMIN_EMAILS = process.env.ADMIN_EMAILS
  ? process.env.ADMIN_EMAILS.split(",").map((e) => e.trim().toLowerCase())
  : null;

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Only protect /admin routes
  if (!pathname.startsWith("/admin")) return NextResponse.next();

  const email = req.auth?.user?.email?.toLowerCase();

  // Not signed in → redirect to home
  if (!email) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Signed in but not an admin → redirect to home
  if (ADMIN_EMAILS && !ADMIN_EMAILS.includes(email)) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*"],
};
