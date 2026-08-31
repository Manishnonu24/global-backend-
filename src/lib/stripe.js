import Stripe from 'stripe';

/**
 * Singleton Stripe SDK client instance.
 * Reads secret key from process.env.STRIPE_SECRET_KEY.
 */
let stripeInstance = null;

export function isStripeConfigured() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  return Boolean(secretKey && !secretKey.includes("placeholder"));
}

export function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!isStripeConfigured()) {
    throw new Error('STRIPE_SECRET_KEY is not defined in environment variables.');
  }

  if (!stripeInstance) {
    stripeInstance = new Stripe(secretKey, {
      apiVersion: '2025-02-24.acacia',
    });
  }

  return stripeInstance;
}
