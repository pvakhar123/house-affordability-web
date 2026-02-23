import { NextRequest, NextResponse } from "next/server";
import { isDbAvailable, getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { getStripe } from "@/lib/stripe";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  if (!isDbAvailable) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const { id: userId } = await params;
    const db = getDb();

    const [user] = await db
      .select({
        stripeCustomerId: users.stripeCustomerId,
        stripeSubscriptionId: users.stripeSubscriptionId,
      })
      .from(users)
      .where(eq(users.id, userId));

    if (!user?.stripeCustomerId) {
      return NextResponse.json({ error: "No Stripe customer" }, { status: 404 });
    }

    const stripe = getStripe();

    // Fetch subscription and invoices in parallel
    const [subscription, invoiceList] = await Promise.allSettled([
      user.stripeSubscriptionId
        ? stripe.subscriptions.retrieve(user.stripeSubscriptionId)
        : Promise.resolve(null),
      stripe.invoices.list({ customer: user.stripeCustomerId, limit: 10 }),
    ]);

    const sub = subscription.status === "fulfilled" ? subscription.value : null;
    const invoices = invoiceList.status === "fulfilled" ? invoiceList.value.data : [];

    // Get default payment method
    let paymentMethod: { brand: string; last4: string } | null = null;
    if (sub && typeof sub?.default_payment_method === "string") {
      try {
        const pm = await stripe.paymentMethods.retrieve(sub.default_payment_method);
        if (pm.card) {
          paymentMethod = { brand: pm.card.brand, last4: pm.card.last4 };
        }
      } catch {
        // ignore — payment method might not be accessible
      }
    }

    // current_period_start/end are on subscription items in newer Stripe API
    const firstItem = sub?.items?.data?.[0];
    const periodStart = firstItem?.current_period_start;
    const periodEnd = firstItem?.current_period_end;

    return NextResponse.json({
      subscription: sub
        ? {
            status: sub.status,
            currentPeriodStart: periodStart ? new Date(periodStart * 1000).toISOString() : null,
            currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
            cancelAt: sub.cancel_at ? new Date(sub.cancel_at * 1000).toISOString() : null,
          }
        : null,
      invoices: invoices.map((inv) => ({
        id: inv.id,
        date: new Date((inv.created ?? 0) * 1000).toISOString(),
        amount: inv.amount_paid ?? 0,
        status: inv.status ?? "unknown",
        url: inv.hosted_invoice_url ?? null,
      })),
      paymentMethod,
    });
  } catch (err) {
    console.error("Admin billing error:", err);
    return NextResponse.json({ error: "Failed to load billing" }, { status: 500 });
  }
}
