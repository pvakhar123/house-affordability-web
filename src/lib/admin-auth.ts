import { NextResponse } from "next/server";
import { auth } from "./auth";

/**
 * Comma-separated list of emails allowed to access /admin.
 * If not set, any authenticated user can access admin.
 */
const ADMIN_EMAILS = process.env.ADMIN_EMAILS
  ? process.env.ADMIN_EMAILS.split(",").map((e) => e.trim().toLowerCase())
  : null;

/**
 * Checks session and returns 401/403 if not authorized.
 * Returns null if the user is an authorized admin.
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (ADMIN_EMAILS && !ADMIN_EMAILS.includes(session.user.email.toLowerCase())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return null;
}
