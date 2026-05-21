# Stripe environment setup (listing credits)

Card checkout for listing credits uses Stripe Checkout. M-Pesa uses a separate flow.

## Quick start

1. **Secret key** — [Stripe Dashboard → API keys](https://dashboard.stripe.com/test/apikeys) (Test mode) → copy **Secret key** (`sk_test_...`) into `.env.local`:

   ```env
   STRIPE_SECRET_KEY=sk_test_...
   ```

2. **Automated bootstrap** (prices, webhook when ngrok is running, fulfill secret → Convex):

   ```bash
   npm run dev:with-ngrok   # in one terminal
   npm run stripe:setup     # in another
   ```

3. **Verify**:

   ```bash
   npm run stripe:check
   npm run stripe:smoke
   ```

## Variables

| Variable | Where it comes from | Set in |
|----------|---------------------|--------|
| `STRIPE_SECRET_KEY` | Dashboard → Developers → API keys | `.env.local` |
| `STRIPE_WEBHOOK_SECRET` | Dashboard → Webhooks → signing secret, or `stripe:setup` / Stripe CLI | `.env.local` |
| `STRIPE_FULFILL_SECRET` | `openssl rand -hex 32` or `stripe:setup` | `.env.local` **and** Convex |
| `STRIPE_PRICE_LISTING_SINGLE` | One-time **$8.00 USD** price (`price_...`) or `stripe:setup` | `.env.local` |
| `STRIPE_PRICE_LISTING_PACK_5` | One-time **$32.00 USD** price (`price_...`) or `stripe:setup` | `.env.local` |

## Webhook URL

With ngrok:

```bash
npm run stripe:ngrok-url
```

Register that URL in Stripe → Webhooks, event: **`checkout.session.completed`**.

Or use Stripe CLI:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Use the CLI’s `whsec_...` as `STRIPE_WEBHOOK_SECRET` while it runs.

## Test payment

1. `npm run stripe:check` — all checks green.
2. Open `/employers/pricing`, choose **Card**, buy a listing pack.
3. Pay with test card `4242 4242 4242 4242`.
4. Stripe Dashboard → Webhooks — confirm `checkout.session.completed` succeeded.

## Clerk Billing

Use the **same Stripe account** as Clerk Billing if you use it for Hiring Pro. Listing-credit prices are separate one-time products created by `stripe:setup` (not Clerk subscription prices).
