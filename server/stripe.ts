import express from 'express'
import Stripe from 'stripe'

const router = express.Router()

// Initialize Stripe
const stripeKey = process.env.STRIPE_SECRET_KEY
const stripe = stripeKey ? new Stripe(stripeKey, {
  apiVersion: '2024-11-20.acacia',
}) : null

// Guard: if Stripe isn't configured, all routes return 503
router.use((_req, res, next) => {
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe not configured' })
  }
  next()
})

const PRICE_ID = process.env.STRIPE_PRICE_ID // Monthly subscription price
const SUCCESS_URL = process.env.STRIPE_SUCCESS_URL || 'http://localhost:5173/upgrade/success'
const CANCEL_URL = process.env.STRIPE_CANCEL_URL || 'http://localhost:5173/upgrade/cancel'

// Create checkout session
router.post('/create-checkout-session', async (req, res) => {
  try {
    const { visitorId } = req.body

    if (!visitorId) {
      return res.status(400).json({ error: 'Visitor ID required' })
    }

    // Check if we have a price ID configured
    if (!PRICE_ID) {
      return res.status(500).json({ error: 'Stripe price not configured' })
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: PRICE_ID,
          quantity: 1,
        },
      ],
      success_url: `${SUCCESS_URL}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: CANCEL_URL,
      metadata: {
        visitorId,
      },
      subscription_data: {
        metadata: {
          visitorId,
        },
      },
    })

    res.json({ sessionId: session.id, url: session.url })
  } catch (error: any) {
    console.error('[STRIPE] Create checkout session error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Verify subscription status
router.get('/subscription-status', async (req, res) => {
  try {
    const { session_id } = req.query

    if (!session_id) {
      return res.status(400).json({ error: 'Session ID required' })
    }

    const session = await stripe.checkout.sessions.retrieve(session_id as string, {
      expand: ['subscription'],
    })

    if (session.payment_status === 'paid' && session.subscription) {
      const subscription = session.subscription as Stripe.Subscription
      
      res.json({
        isPremium: true,
        customerId: session.customer,
        subscriptionId: subscription.id,
        expiresAt: subscription.current_period_end * 1000, // Convert to ms
        visitorId: session.metadata?.visitorId,
      })
    } else {
      res.json({ isPremium: false })
    }
  } catch (error: any) {
    console.error('[STRIPE] Subscription status error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Webhook to handle subscription events
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature']
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret || !sig) {
    return res.status(400).send('Missing webhook secret or signature')
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret)
  } catch (err: any) {
    console.error('[STRIPE] Webhook signature verification failed:', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as Stripe.Checkout.Session
      console.log('[STRIPE] Checkout completed for visitor:', session.metadata?.visitorId)
      break
      
    case 'customer.subscription.deleted':
      const subscription = event.data.object as Stripe.Subscription
      console.log('[STRIPE] Subscription cancelled:', subscription.id)
      break
      
    case 'customer.subscription.updated':
      const updatedSub = event.data.object as Stripe.Subscription
      console.log('[STRIPE] Subscription updated:', updatedSub.id, 'Status:', updatedSub.status)
      break
      
    default:
      console.log('[STRIPE] Unhandled event type:', event.type)
  }

  res.json({ received: true })
})

// Create a one-time payment option (alternative to subscription)
router.post('/create-payment', async (req, res) => {
  try {
    const { visitorId, amount = 999 } = req.body // Default $9.99

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'All Suspects Premium - Monthly',
              description: 'Unlimited mysteries for 30 days',
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      success_url: `${SUCCESS_URL}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: CANCEL_URL,
      metadata: {
        visitorId,
        type: 'one_time_monthly',
      },
    })

    res.json({ sessionId: session.id, url: session.url })
  } catch (error: any) {
    console.error('[STRIPE] Create payment error:', error)
    res.status(500).json({ error: error.message })
  }
})

export default router
