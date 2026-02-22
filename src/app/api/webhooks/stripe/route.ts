import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getDb } from "@/lib/db";
import { users, tierChangeLog } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type Stripe from "stripe";

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    console.error("[stripe-webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const db = getDb();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription") break;

        const userId = session.metadata?.userId;
        if (!userId) {
          console.error("[stripe-webhook] No userId in checkout session metadata");
          break;
        }

        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : (session.subscription as Stripe.Subscription | null)?.id;
        const customerId =
          typeof session.customer === "string"
            ? session.customer
            : (session.customer as Stripe.Customer | null)?.id;

        const [current] = await db
          .select({ tier: users.tier })
          .from(users)
          .where(eq(users.id, userId));

        if (!current) {
          console.error("[stripe-webhook] User not found:", userId);
          break;
        }

        if (current.tier === "pro") {
          console.log("[stripe-webhook] User already pro, skipping:", userId);
          break;
        }

        await db
          .update(users)
          .set({
            tier: "pro",
            stripeCustomerId: customerId ?? undefined,
            stripeSubscriptionId: subscriptionId ?? undefined,
            tierUpdatedAt: new Date(),
            tierUpdatedBy: "stripe_webhook",
          })
          .where(eq(users.id, userId));

        await db.insert(tierChangeLog).values({
          userId,
          previousTier: current.tier,
          newTier: "pro",
          reason: "stripe_webhook",
          changedBy: "stripe",
        });

        console.log("[stripe-webhook] Upgraded user to pro:", userId);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;
        if (!userId) break;

        if (subscription.status === "canceled" || subscription.status === "unpaid") {
          await handleDowngrade(db, userId, `subscription_${subscription.status}`);
        } else if (subscription.status === "active") {
          const [current] = await db
            .select({ tier: users.tier })
            .from(users)
            .where(eq(users.id, userId));

          if (current && current.tier !== "pro") {
            await db
              .update(users)
              .set({
                tier: "pro",
                stripeSubscriptionId: subscription.id,
                tierUpdatedAt: new Date(),
                tierUpdatedBy: "stripe_webhook",
              })
              .where(eq(users.id, userId));

            await db.insert(tierChangeLog).values({
              userId,
              previousTier: current.tier,
              newTier: "pro",
              reason: "stripe_webhook",
              changedBy: "stripe",
            });
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;
        if (!userId) break;
        await handleDowngrade(db, userId, "subscription_deleted");
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId =
          typeof invoice.customer === "string"
            ? invoice.customer
            : (invoice.customer as Stripe.Customer | null)?.id;
        console.warn("[stripe-webhook] Payment failed for customer:", customerId);
        break;
      }

      default:
        console.log("[stripe-webhook] Unhandled event type:", event.type);
    }
  } catch (err) {
    console.error("[stripe-webhook] Error handling event:", event.type, err);
    return NextResponse.json({ error: "Webhook handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleDowngrade(
  db: ReturnType<typeof getDb>,
  userId: string,
  reason: string,
) {
  const [current] = await db
    .select({ tier: users.tier })
    .from(users)
    .where(eq(users.id, userId));

  if (!current || current.tier === "free") return;

  await db
    .update(users)
    .set({
      tier: "free",
      stripeSubscriptionId: null,
      tierUpdatedAt: new Date(),
      tierUpdatedBy: "stripe_webhook",
    })
    .where(eq(users.id, userId));

  await db.insert(tierChangeLog).values({
    userId,
    previousTier: current.tier,
    newTier: "free",
    reason: "stripe_webhook",
    changedBy: `stripe:${reason}`,
  });

  console.log("[stripe-webhook] Downgraded user to free:", userId, reason);
}
