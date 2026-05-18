import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { stripe } from "@/lib/stripe"
import { db } from "@/lib/db"

export async function POST(req: Request) {
  const body = await req.text()
  const sig = (await headers()).get("stripe-signature")

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Bad Request" }, { status: 400 })
  }

  let event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET,
    )
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object
        const userId = session.client_reference_id || session.metadata?.userId
        if (userId) {
          await db.user.update({
            where: { id: userId },
            data: {
              plan: "PRO",
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: session.subscription as string,
            },
          })
        }
        break
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object
        const userId = sub.metadata?.userId
        if (userId) {
          await db.user.update({
            where: { id: userId },
            data: { plan: "FREE", stripeSubscriptionId: null },
          })
        }
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch {
    // DB not available — still ack the webhook
    return NextResponse.json({ received: true })
  }
}
