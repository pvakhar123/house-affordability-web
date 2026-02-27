import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getStripe, getStripePrices } from "@/lib/stripe";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.tier === "pro") {
      return NextResponse.json({ error: "Already on Pro plan" }, { status: 400 });
    }

    const body = await req.json();
    const interval = body.interval as "monthly" | "annual";
    if (!interval || !["monthly", "annual"].includes(interval)) {
      return NextResponse.json({ error: "Invalid interval" }, { status: 400 });
    }

    const stripe = getStripe();
    const prices = getStripePrices();
    const priceId = interval === "monthly" ? prices.monthly : prices.annual;

    if (!priceId) {
      console.error("Missing Stripe price ID for interval:", interval);
      return NextResponse.json({ error: "Payment configuration error. Please contact support." }, { status: 500 });
    }

    const db = getDb();
    const [user] = await db
      .select({ stripeCustomerId: users.stripeCustomerId })
      .from(users)
      .where(eq(users.id, session.user.id));

    let customerId = user?.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: session.user.email,
        metadata: { userId: session.user.id },
      });
      customerId = customer.id;

      await db
        .update(users)
        .set({ stripeCustomerId: customerId })
        .where(eq(users.id, session.user.id));
    }

    const origin = req.headers.get("origin") || process.env.NEXTAUTH_URL || "";
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/?upgrade=success`,
      cancel_url: `${origin}/pricing?upgrade=cancelled`,
      metadata: { userId: session.user.id },
      subscription_data: {
        metadata: { userId: session.user.id },
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Checkout failed: ${message}` }, { status: 500 });
  }
}
