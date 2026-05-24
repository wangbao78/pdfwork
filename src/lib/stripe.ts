import Stripe from "stripe"

export function getStripe(): Stripe | null {
  if (!process.env.STRIPE_SECRET_KEY) return null
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-04-22.dahlia",
  })
}

export async function createCheckoutSession(
  userId: string,
  email: string,
): Promise<string | null> {
  const stripe = getStripe()
  if (!stripe || !process.env.STRIPE_PRICE_ID) return null

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card", "alipay", "wechat_pay"],
    customer_email: email,
    client_reference_id: userId,
    line_items: [
      {
        price: process.env.STRIPE_PRICE_ID,
        quantity: 1,
      },
    ],
    success_url: `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/dashboard?upgraded=true`,
    cancel_url: `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/pricing`,
    metadata: { userId },
  })

  return session.url
}

export async function createPortalSession(
  customerId: string,
  returnUrl: string,
): Promise<string | null> {
  const stripe = getStripe()
  if (!stripe) return null

  const portal = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  })

  return portal.url
}
