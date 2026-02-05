# Stripe Setup for All Suspects Premium

## Quick Setup Guide

### 1. Create Product in Stripe Dashboard

1. Go to https://dashboard.stripe.com/products
2. Click "Add product"
3. Set:
   - **Name:** All Suspects Premium
   - **Description:** Unlimited access to all mysteries
4. Add a price:
   - **Amount:** $9.99
   - **Billing period:** Monthly
   - **Currency:** USD
5. Save and copy the **Price ID** (starts with `price_`)

### 2. Add Environment Variables

In Railway dashboard (all-suspects backend), add these env vars:

```
STRIPE_SECRET_KEY=sk_test_...     # From Stripe dashboard → Developers → API keys
STRIPE_PRICE_ID=price_...          # The price ID from step 1
STRIPE_WEBHOOK_SECRET=whsec_...    # (Optional for now - set up later for production)
STRIPE_SUCCESS_URL=https://allsuspects.slateworks.io?session_id={CHECKOUT_SESSION_ID}
STRIPE_CANCEL_URL=https://allsuspects.slateworks.io
```

### 3. Deploy

```bash
# Backend auto-deploys from Railway
# Frontend: push to main branch → Vercel auto-deploys
```

### 4. Test

1. Go to https://allsuspects.slateworks.io
2. Click "Begin Investigation"
3. Play the free mystery
4. Click "Begin Investigation" again
5. Paywall should appear
6. Click "Become a Premium Detective"
7. Use test card: `4242 4242 4242 4242`
8. Complete checkout
9. Should redirect back with success screen

### Webhook Setup (Production)

For production, set up webhooks to handle subscription cancellations:

1. Go to https://dashboard.stripe.com/webhooks
2. Add endpoint: `https://your-railway-app.up.railway.app/api/stripe/webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.deleted`
   - `customer.subscription.updated`
4. Copy the signing secret → add as `STRIPE_WEBHOOK_SECRET`

---

## File Structure

```
server/stripe.ts          # Stripe routes (checkout, verify, webhook)
src/game/subscriptionState.ts   # Zustand store for subscription tracking
src/components/UI/Paywall.tsx   # Upgrade modal
src/components/UI/UpgradeSuccess.tsx  # Post-checkout success screen
```

## Business Model

- **Free tier:** 1 mystery per day
- **Premium:** $9.99/month unlimited
- **Pricing stored in:** `src/game/subscriptionState.ts` → `SUBSCRIPTION_CONFIG`
